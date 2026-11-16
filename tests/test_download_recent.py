from datetime import date

from pipeline.download_recent import _plan


AVAIL = {
    "VIIRS_NOAA20_SP": (date(2018, 4, 1), date(2026, 7, 31)),
    "VIIRS_NOAA20_NRT": (date(2026, 6, 1), date(2026, 11, 15)),
    "MODIS_NRT": (date(2026, 1, 1), date(2026, 11, 15)),
}


def test_plan_prefers_standard_then_nrt():
    p = _plan("viirs-noaa20", date(2026, 1, 1), date(2026, 11, 15), AVAIL)
    assert p == [("VIIRS_NOAA20_SP", date(2026, 1, 1), date(2026, 7, 31)),
                 ("VIIRS_NOAA20_NRT", date(2026, 8, 1), date(2026, 11, 15))]


def test_plan_nrt_only_when_no_standard():
    assert _plan("modis", date(2026, 3, 1), date(2026, 3, 10), AVAIL) == [
        ("MODIS_NRT", date(2026, 3, 1), date(2026, 3, 10))]


def test_plan_clamps_to_availability():
    p = _plan("viirs-noaa20", date(2015, 1, 1), date(2018, 5, 1), AVAIL)
    assert p == [("VIIRS_NOAA20_SP", date(2018, 4, 1), date(2018, 5, 1))]


def test_plan_empty_for_unknown_sources():
    assert _plan("viirs-noaa21", date(2026, 1, 1), date(2026, 2, 1), AVAIL) == []
