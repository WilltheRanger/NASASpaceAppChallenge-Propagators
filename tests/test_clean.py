"""Unit tests for pipeline.clean using small synthetic FIRMS-like rows."""

import pandas as pd
import pytest

from pipeline import clean


def raw_rows(rows, product="modis"):
    df = pd.DataFrame(rows).astype(str)
    df = df.rename(columns=clean.RENAME[clean.PRODUCTS[product]["instrument"]])
    df["product"] = product
    df["instrument_expected"] = clean.PRODUCTS[product]["instrument"]
    df["region"] = "Testland"
    df["source_kind"] = "country_archive"
    df["source_priority"] = 0
    df["source_file"] = "x.csv"
    df["source_url"] = "https://example.invalid/x.csv"
    df["raw_row_number"] = range(2, len(df) + 2)
    return df


MODIS = dict(latitude="38.5", longitude="23.2", brightness="330.1", scan="1.2", track="1.1",
             acq_date="2023-08-20", acq_time="0905", satellite="Terra", instrument="MODIS",
             confidence="85", version="61.03", bright_t31="300.0", frp="40.5", daynight="D", type="0")
VIIRS = dict(latitude="38.5", longitude="23.2", bright_ti4="340.0", scan="0.4", track="0.4",
             acq_date="2023-08-20", acq_time="45", satellite="N", instrument="VIIRS",
             confidence="l", version="2", bright_ti5="290.0", frp="5.0", daynight="N", type="2")


def run_pipeline(df):
    out, rejected, stats = clean.parse_and_validate(df)
    out = clean.harmonise(out, stats)
    out = clean.resolve_source_overlaps(out, stats)
    out = clean.drop_exact_duplicates(out, stats)
    out = clean.flag_overlap_duplicates(out, stats)
    return out, rejected, stats


def test_time_is_zero_padded_and_utc_preserved():
    out, _, _ = run_pipeline(raw_rows([VIIRS], "viirs-snpp"))
    row = out.iloc[0]
    assert row["acq_time"] == "0045"
    assert row["acq_date"] == "2023-08-20"
    assert str(row["acq_datetime_utc"]) == "2023-08-20 00:45:00+00:00"


def test_confidence_harmonisation_keeps_raw():
    rows = [dict(MODIS, confidence=c) for c in ("10", "30", "79", "80")]
    out, _, _ = run_pipeline(raw_rows(rows))
    assert list(out["confidence_class"]) == ["low", "nominal", "nominal", "high"]
    assert list(out["confidence_raw"]) == ["10", "30", "79", "80"]
    v, _, _ = run_pipeline(raw_rows([VIIRS], "viirs-snpp"))
    assert v.iloc[0]["confidence_class"] == "low" and pd.isna(v.iloc[0]["confidence_pct"])


def test_satellite_codes_and_types_decoded():
    out, _, _ = run_pipeline(raw_rows([VIIRS], "viirs-snpp"))
    assert out.iloc[0]["satellite"] == "Suomi NPP"
    assert out.iloc[0]["hotspot_type_label"] == "other static land source"
    assert not out.iloc[0]["is_presumed_vegetation_fire"]


def test_invalid_rows_rejected_with_reason():
    rows = [MODIS, dict(MODIS, latitude="95"), dict(MODIS, acq_time="2575"), dict(MODIS, acq_date="2023-13-01")]
    out, rejected, stats = run_pipeline(raw_rows(rows))
    assert len(out) == 1 and len(rejected) == 3
    assert set(rejected["reject_reason"]) == {"latitude_invalid", "acq_time_invalid", "acq_date_invalid"}


def test_exact_duplicates_removed():
    out, _, stats = run_pipeline(raw_rows([MODIS, MODIS]))
    assert len(out) == 1 and stats["exact_duplicates_removed"] == 1


def test_overlap_duplicate_flagged_but_adjacent_pixels_not():
    first = MODIS
    # Same place, next granule 5 min later -> possible duplicate.
    repeat = dict(MODIS, acq_time="0910", latitude="38.5010")
    # Same granule, 1 km away -> adjacent pixel, NOT a duplicate.
    adjacent = dict(MODIS, latitude="38.5090")
    # Same place, 60 min later -> different overpass, NOT a duplicate.
    later = dict(MODIS, acq_time="1005")
    out, _, stats = run_pipeline(raw_rows([first, repeat, adjacent, later]))
    flagged = out[out["possible_duplicate_of"].notna()]
    assert len(flagged) == 1
    assert flagged.iloc[0]["acq_time"] == "0910"
    first_id = out[(out["acq_time"] == "0905") & (out["latitude"] == 38.5)]["detection_id"].iloc[0]
    assert flagged.iloc[0]["possible_duplicate_of"] == first_id


def test_negative_frp_nulled_and_flagged():
    out, _, stats = run_pipeline(raw_rows([dict(MODIS, frp="-1")]))
    assert pd.isna(out.iloc[0]["frp_mw"])
    assert "frp_negative" in out.iloc[0]["qa_flags"]


def test_overlap_period_flag():
    out, _, _ = run_pipeline(raw_rows([dict(MODIS, acq_date="2011-06-01"), MODIS]))
    assert list(out.sort_values("acq_date")["in_sensor_overlap_period"]) == [False, True]


NRT_N20 = dict(latitude="38.5", longitude="23.2", bright_ti4="340.0", scan="0.4", track="0.4",
               acq_date="2026-11-10", acq_time="1050", satellite="N20", confidence="nominal",
               version="2.0NRT", bright_ti5="290.0", frp="5.0", daynight="D")


def nrt_rows(rows, product="viirs-noaa20", kind="nrt_global_7d", source_file="nrt.csv"):
    df = pd.DataFrame(rows).astype(str)
    df = df.rename(columns=clean.RENAME["VIIRS"])
    df["instrument"] = "VIIRS"
    df["type"] = pd.NA
    df["product"] = product
    df["instrument_expected"] = "VIIRS"
    df["region"] = "Testland"
    df["source_kind"] = kind
    df["source_priority"] = clean.SOURCE_PRIORITY[kind]
    df["source_file"] = source_file
    df["source_url"] = "https://example.invalid/nrt.csv"
    df["raw_row_number"] = range(2, len(df) + 2)
    return df


def test_nrt_row_decoded():
    out, _, _ = run_pipeline(nrt_rows([NRT_N20]))
    r = out.iloc[0]
    assert r["satellite"] == "NOAA-20"
    assert r["confidence_class"] == "nominal"
    assert r["processing_level"] == "NRT"
    assert pd.isna(r["hotspot_type"]) and pd.isna(r["is_presumed_vegetation_fire"])


def test_standard_supersedes_nrt_for_same_product_date():
    sp = nrt_rows([dict(NRT_N20, version="2", latitude="38.6")], kind="api_sp", source_file="sp.csv")
    nrt = nrt_rows([NRT_N20, dict(NRT_N20, acq_date="2026-11-11")])
    out, _, stats = run_pipeline(pd.concat([sp, nrt], ignore_index=True))
    assert stats["rows_superseded_by_better_source"] == 1
    assert sorted(out["acq_date"]) == ["2026-11-10", "2026-11-11"]
    assert set(out[out.acq_date == "2026-11-10"]["processing_level"]) == {"standard"}


def test_overlapping_nrt_snapshots_deduplicated():
    a = nrt_rows([NRT_N20], source_file="snap1.csv")
    b = nrt_rows([dict(NRT_N20, frp="5.5")], source_file="snap2.csv")  # revised value
    out, _, stats = run_pipeline(pd.concat([a, b], ignore_index=True))
    assert len(out) == 1 and stats["cross_file_duplicates_removed"] == 1
    assert out.iloc[0]["frp_mw"] == pytest.approx(5.5)


def test_region_clip_excludes_neighbour_keeps_sea():
    from pipeline import regions
    # Athens (land), Aegean sea near Naxos (sea buffer), Istanbul (Turkey), mid-Mediterranean (far sea)
    lat = [37.98, 37.0, 41.01, 35.0]
    lon = [23.73, 25.6, 28.98, 18.0]
    assert list(regions.inside("Greece", lat, lon)) == [True, True, False, False]
