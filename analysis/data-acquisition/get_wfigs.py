"""Download NIFC WFIGS incident locations (wildfires WF, prescribed burns RX) to CSV.

Usage:
    python3 get_wfigs.py OUT.csv [--since 2025-01-01] [--types WF,RX] [--max-pages N]

The service returns at most 2,000 records per request, so we page with resultOffset.
WFIGS is effectively 2014 onward and less complete than FPA-FOD; Anchor uses it only for 2025-26.
"""
import argparse
import csv
import json
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone

URL = ("https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/"
       "WFIGS_Incident_Locations/FeatureServer/0/query")
FIELDS = ["IrwinID", "IncidentName", "IncidentTypeCategory", "FireDiscoveryDateTime",
          "ContainmentDateTime", "ControlDateTime", "FireOutDateTime", "IncidentSize",
          "DiscoveryAcres", "FinalAcres", "InitialLatitude", "InitialLongitude", "POOState",
          "POOCounty", "FireCause", "FireCauseGeneral", "PredominantFuelGroup"]
TIME_FIELDS = {"FireDiscoveryDateTime", "ContainmentDateTime", "ControlDateTime", "FireOutDateTime"}
PAGE = 2000


def fetch(params):
    body = urllib.parse.urlencode(params).encode()
    for attempt in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(URL, data=body), timeout=120) as r:
                d = json.load(r)
            if "error" in d:
                raise RuntimeError(d["error"])
            return d
        except Exception:
            if attempt == 4:
                raise
            time.sleep(2 ** attempt)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out")
    ap.add_argument("--since", default="2025-01-01")
    ap.add_argument("--types", default="WF,RX")
    ap.add_argument("--max-pages", type=int, default=0, help="0 = no limit")
    a = ap.parse_args()

    types = ",".join(f"'{t.strip()}'" for t in a.types.split(","))
    where = f"IncidentTypeCategory IN ({types}) AND FireDiscoveryDateTime >= DATE '{a.since}'"
    n = page = 0
    with open(a.out, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        while True:
            d = fetch({"where": where, "outFields": ",".join(FIELDS), "orderByFields": "OBJECTID",
                       "resultOffset": page * PAGE, "resultRecordCount": PAGE,
                       "returnGeometry": "false", "f": "json"})
            feats = d.get("features", [])
            for ft in feats:
                attrs = ft["attributes"]
                for k in TIME_FIELDS:
                    if isinstance(attrs.get(k), (int, float)):  # epoch milliseconds -> ISO 8601 UTC
                        attrs[k] = datetime.fromtimestamp(attrs[k] / 1000, tz=timezone.utc).isoformat()
                w.writerow({k: attrs.get(k) for k in FIELDS})
                n += 1
            page += 1
            if len(feats) < PAGE and not d.get("exceededTransferLimit"):
                break
            if a.max_pages and page >= a.max_pages:
                break
    print(f"wrote {n} records to {a.out}")


if __name__ == "__main__":
    main()
