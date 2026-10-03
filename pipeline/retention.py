"""Retention potential: how much water could each mapped ditch hold if it were blocked?

A deliberately simple, transparent estimate (a heuristic, not a hydraulic model):

    volume [m3] = length [m] x cross-section [m2] x fill factor

* cross-section 1.0 m2: a typical small field ditch, about 0.5 m wide at the bottom,
  0.8 m deep, with 1:1 side slopes ((0.5 + 0.8) x 0.8 = 1.04 m2). BDOT10k has no ditch
  dimensions, so the same profile is used for every ditch.
* fill factor 0.5: a chain of small dams holds water at full depth just upstream of each
  dam, tapering to nothing at the next dam upstream, so on average about half the channel
  is full.

The volume is per filling. A blocked ditch refills after rain, and the water it holds also
soaks into the soil and raises the water table along it. That groundwater recharge is the
main benefit for summer base flow, and it is not in this number.

Reads and updates web/public/data/ditches.json (adds volume_m3, rank) and writes
web/public/data/retention.json (assumptions, reference plant production, per-catchment sums).
Run after layers.py: python pipeline/retention.py
"""
import json

from config import OUT

CROSS_SECTION_M2 = 1.0
FILL_FACTOR = 0.5

# Wodociągi Miasta Krakowa, "Schemat techniczno-organizacyjny ZUW Rudawa" (leaflet):
# maximum capacity 55,000 m3/day, current production 22,000-28,000 m3/day.
RUDAWA_PLANT = {
    "name": "ZUW Rudawa",
    "production_m3_day": [22000, 28000],
    "capacity_m3_day": 55000,
    "source": "Wodociągi Miasta Krakowa, Schemat techniczno-organizacyjny ZUW Rudawa",
    "url": "https://wodociagi.krakow.pl/admin/files/Files/foldery_ulotki/WMK-ulotka_schemat_techniczno-organizacyjny_ZUW_Rudawa.pdf",
}


def main():
    path = OUT / "ditches.json"
    ditches = json.loads(path.read_text(encoding="utf-8"))
    features = ditches["features"]

    for f in features:
        p = f["properties"]
        p["volume_m3"] = round(p["length_m"] * CROSS_SECTION_M2 * FILL_FACTOR)

    # Rank within each catchment: highest score first, longer ditch first on ties.
    summary = {}
    for cid in sorted({f["properties"]["catchment"] for f in features}):
        ranked = sorted((f for f in features if f["properties"]["catchment"] == cid),
                        key=lambda f: (-f["properties"]["score"], -f["properties"]["length_m"]))
        for i, f in enumerate(ranked, 1):
            f["properties"]["rank"] = i
        high = [f["properties"] for f in ranked if f["properties"]["priority"] == "high"]
        summary[cid] = {
            "ditches": len(ranked),
            "high_count": len(high),
            "high_length_km": round(sum(p["length_m"] for p in high) / 1000, 1),
            "high_volume_m3": sum(p["volume_m3"] for p in high),
            "all_volume_m3": sum(f["properties"]["volume_m3"] for f in ranked),
        }

    path.write_text(json.dumps(ditches, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    out = {
        "assumptions": {
            "cross_section_m2": CROSS_SECTION_M2,
            "fill_factor": FILL_FACTOR,
        },
        "reference": RUDAWA_PLANT,
        "catchments": summary,
    }
    with open(OUT / "retention.json", "w", encoding="utf-8", newline="\n") as fh:
        fh.write(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
    for cid, s in summary.items():
        print(f"{cid}: {s['high_count']} high-priority ditches, {s['high_length_km']} km, "
              f"{s['high_volume_m3']:,} m3 per filling (all ditches {s['all_volume_m3']:,} m3)")


if __name__ == "__main__":
    main()
