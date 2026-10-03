"""Rebuild only corridor screening and its summary from cached source data.

Run after download/catchment/land-cover preparation: python pipeline/rebuild_corridors.py
Does not refresh drought, ditch, or citizen-report data.
"""
import json

import geopandas as gpd
import pandas as pd
from shapely.ops import unary_union

from bdot import read_layer
from catchments import fill_codes_by_name
from config import CATCHMENTS, CRS_METRIC, OUT, WORK
from corridors import CORRIDOR_COLUMNS, build_corridors
from layers import SEALED, assign_catchment, write


def main():
    catchments = gpd.read_file(WORK / "catchments_2180.gpkg")
    union = unary_union(catchments.geometry)
    mask = gpd.GeoDataFrame(geometry=[union.buffer(200)], crs=CRS_METRIC)
    buildings = read_layer("OT_BUBD_A", [], mask=mask)
    landcover = gpd.read_file(WORK / "landcover_2180.gpkg")
    constraints = gpd.GeoDataFrame(pd.concat([
        landcover[landcover["cls"].isin(SEALED)][["geometry"]], buildings[["geometry"]],
    ], ignore_index=True), crs=CRS_METRIC)
    rivers = fill_codes_by_name(read_layer("OT_SWRS_L", ["NAZWA", "IDMPHP"], mask=mask))
    rivers = assign_catchment(gpd.clip(rivers, union), catchments)
    parts = []
    stats = json.loads((OUT / "stats.json").read_text(encoding="utf-8"))
    for cid, c in CATCHMENTS.items():
        stems = rivers[(rivers["catchment"] == cid) & rivers["NAZWA"].isin(c["river_names"])]
        cor = build_corridors(stems, constraints, buildings, cid)
        parts.append(cor)
        stats[cid]["main_stem_km"] = round(cor.length.sum() / 1000, 1)
        stats[cid]["corridor_room_km"] = {
            k: round(cor.loc[cor.room_class == k].length.sum() / 1000, 1)
            for k in ("open", "partial", "constrained")
        }
        print(cid, stats[cid]["corridor_room_km"], cor.reason.value_counts().to_dict())
    write(gpd.GeoDataFrame(pd.concat(parts, ignore_index=True), crs=CRS_METRIC)[CORRIDOR_COLUMNS],
          "corridors.json", precision=6)
    (OUT / "stats.json").write_text(json.dumps(stats, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
