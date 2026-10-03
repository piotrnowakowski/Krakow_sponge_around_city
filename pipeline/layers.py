"""Step 3: build web map layers and per-catchment statistics from BDOT10k + DEM.

Outputs (web/public/data):
  catchments.json      catchment polygons with summary stats
  landcover.json       land cover dissolved by class and catchment
  rivers.json          river network (main stems flagged)
  ditches.json         drainage ditches with a transparent retention-priority score
  corridors.json       main-stem reaches with a "room for the river" index
  buildings.json       buildings within the main-stem corridors
  weirs.json           weirs and dams on the rivers
  protected.json       national/landscape parks and nature reserves
  intakes.json         Kraków water treatment plants fed by these rivers
  stats.json           numbers used by the dashboard
"""
import json

import geopandas as gpd
import numpy as np
import pandas as pd
import rasterio
from shapely.geometry import Point
from shapely.ops import unary_union

from bdot import read_layer
from catchments import fill_codes_by_name
from config import CATCHMENTS, CRS_METRIC, CRS_WEB, OUT, WATER_INTAKES, WORK
from corridors import CORRIDOR_HALF_WIDTH, CORRIDOR_COLUMNS, build_corridors

LANDCOVER = {
    # class: (BDOT10k layer, optional RODZAJ filter)
    "forest": [("OT_PTLZ_A", None), ("OT_PTRK_A", None)],
    "grassland": [("OT_PTTR_A", "roślinność trawiasta")],
    "arable": [("OT_PTTR_A", "uprawa na gruntach ornych")],
    "orchard": [("OT_PTUT_A", None)],
    "water": [("OT_PTWP_A", None)],
    "built": [("OT_PTZB_A", None)],
    "industrial": [("OT_PTNZ_A", None), ("OT_PTWZ_A", None), ("OT_PTSO_A", None)],
    "transport": [("OT_PTKM_A", None), ("OT_PTPL_A", None)],
    "bare": [("OT_PTGN_A", None)],
}
SEALED = {"built", "industrial", "transport"}
SEMI_NATURAL = {"forest", "grassland"}


def to_web(gdf, precision=5):
    gdf = gdf.to_crs(CRS_WEB)
    gdf["geometry"] = gdf.geometry.set_precision(10 ** -precision)
    return gdf[~gdf.geometry.is_empty]


def write(gdf, name, precision=5):
    path = OUT / name
    to_web(gdf, precision).to_file(path, driver="GeoJSON", COORDINATE_PRECISION=precision)
    compact(path)
    print(f"  {name:22s} {len(gdf):6d} features  {path.stat().st_size / 1e6:5.1f} MB")


def compact(path):
    """Rewrite GDAL's indented GeoJSON without whitespace (same content, ~20% smaller)."""
    data = json.loads(path.read_text(encoding="utf-8"))
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def assign_catchment(gdf, catchments):
    """Attach the catchment id each feature (by representative point) falls in."""
    pts = gpd.GeoDataFrame(geometry=gdf.geometry.representative_point(), crs=gdf.crs)
    joined = gpd.sjoin(pts, catchments[["id", "geometry"]], how="left", predicate="within")
    gdf = gdf.copy()
    gdf["catchment"] = joined["id"].groupby(level=0).first()
    return gdf[gdf["catchment"].notna()]


def build_landcover(catchments, area_mask):
    parts = []
    for cls, sources in LANDCOVER.items():
        for code, rodzaj in sources:
            try:
                g = read_layer(code, ["RODZAJ"] if rodzaj else [], mask=area_mask)
            except ValueError:
                continue
            if rodzaj:
                g = g[g["RODZAJ"] == rodzaj]
            g = g[["geometry"]].copy()
            g["cls"] = cls
            parts.append(g)
    lc = pd.concat(parts, ignore_index=True)
    lc = gpd.GeoDataFrame(lc, geometry="geometry", crs=CRS_METRIC)
    lc["geometry"] = lc.geometry.buffer(0)
    clipped = gpd.overlay(lc, catchments[["id", "geometry"]], how="intersection", keep_geom_type=True)
    clipped = clipped.rename(columns={"id": "catchment"})
    dissolved = clipped.dissolve(by=["catchment", "cls"], as_index=False)
    dissolved["area_km2"] = dissolved.area / 1e6
    dissolved["geometry"] = dissolved.geometry.simplify(4)
    return dissolved


def slope_sampler():
    with rasterio.open(WORK / "dem_2180.tif") as src:
        dem = src.read(1).astype("float64")
        dem[dem == src.nodata] = np.nan
        gy, gx = np.gradient(dem, src.res[1], src.res[0])
        slope = np.hypot(gx, gy) * 100  # percent
        transform = src.transform

    def sample(points):
        rows, cols = rasterio.transform.rowcol(transform, [p.x for p in points], [p.y for p in points])
        rows = np.clip(rows, 0, slope.shape[0] - 1)
        cols = np.clip(cols, 0, slope.shape[1] - 1)
        return slope[rows, cols]

    return sample


def score_ditches(ditches, landcover, buildings, slope_at):
    """Transparent 0-100 heuristic for "block this ditch first" (not a hydrological model).

    land context 40  - forest / grassland / shrubs 40, arable or orchard 25 (needs farmer
                       agreement, e.g. a control weir), built-up / transport 0
    houses away  30  - 0 below 50 m to the nearest building, full above 200 m
    flat ground  20  - full below 1% slope, 0 above 5% (flat ditches hold more water per dam)
    length       10  - longer ditches drain more land, full at 500 m
    """
    mid = ditches.geometry.interpolate(0.5, normalized=True)
    mid_gdf = gpd.GeoDataFrame(geometry=mid, crs=CRS_METRIC)
    lc = gpd.sjoin(mid_gdf, landcover[["cls", "geometry"]], how="left", predicate="within")
    ditches["context"] = lc["cls"].groupby(level=0).first().fillna("other")

    near = gpd.sjoin_nearest(mid_gdf, buildings[["geometry"]], how="left",
                             max_distance=500, distance_col="d")
    ditches["dist_building_m"] = near["d"].groupby(level=0).min().fillna(500).round(0)
    ditches["slope_pct"] = np.round(slope_at(list(mid)), 2)
    ditches["length_m"] = ditches.length.round(0)

    ctx = ditches["context"].map(
        lambda c: 40 if c in SEMI_NATURAL else 25 if c in {"arable", "orchard"} else 0)
    houses = np.clip((ditches["dist_building_m"] - 50) / 150, 0, 1) * 30
    flat = np.clip((5 - ditches["slope_pct"]) / 4, 0, 1) * 20
    length = np.clip(ditches["length_m"] / 500, 0, 1) * 10
    ditches["s_context"], ditches["s_houses"] = ctx, houses.round(1)
    ditches["s_flat"], ditches["s_length"] = flat.round(1), length.round(1)
    ditches["score"] = (ctx + houses + flat + length).round(0).astype(int)
    ditches["priority"] = pd.cut(ditches["score"], [-1, 44, 69, 100],
                                 labels=["low", "medium", "high"]).astype(str)
    return ditches



def main():
    OUT.mkdir(parents=True, exist_ok=True)
    catchments = gpd.read_file(WORK / "catchments_2180.gpkg")
    validation = json.loads((WORK / "catchment_validation.json").read_text(encoding="utf-8"))
    union = unary_union(catchments.geometry)
    area_mask = gpd.GeoDataFrame(geometry=[union.buffer(200)], crs=CRS_METRIC)

    print("land cover")
    cache = WORK / "landcover_2180.gpkg"
    if cache.exists():
        landcover = gpd.read_file(cache)
    else:
        landcover = build_landcover(catchments, area_mask)
        landcover.to_file(cache, driver="GPKG")

    print("rivers")
    rivers = read_layer("OT_SWRS_L", ["NAZWA", "IDMPHP", "RODZAJ", "SZEROKOSC"], mask=area_mask)
    rivers = fill_codes_by_name(rivers)
    rivers = gpd.clip(rivers, union)
    rivers = assign_catchment(rivers, catchments)
    names = {cid: c["river_names"] for cid, c in CATCHMENTS.items()}
    rivers["main"] = [n in names[c] for n, c in zip(rivers["NAZWA"], rivers["catchment"])]

    print("buildings")
    buildings = read_layer("OT_BUBD_A", ["FOBUD"], mask=area_mask)
    corridor_building_constraints = buildings.copy()
    buildings = gpd.clip(buildings, union)

    print("ditches")
    ditches = read_layer("OT_SWRM_L", ["NAZWA", "SZEROKOSC"], mask=area_mask)
    ditches = gpd.clip(ditches, union).explode(index_parts=False).reset_index(drop=True)
    ditches = assign_catchment(ditches, catchments).reset_index(drop=True)
    ditches = score_ditches(ditches, landcover, buildings, slope_sampler())

    print("corridors")
    constraint_classes = landcover[landcover["cls"].isin(SEALED)][["geometry"]]
    constraints = pd.concat([constraint_classes, corridor_building_constraints[["geometry"]]], ignore_index=True)
    constraints = gpd.GeoDataFrame(constraints, geometry="geometry", crs=CRS_METRIC)
    corridors = pd.concat(
        [build_corridors(rivers[(rivers["catchment"] == cid) & rivers["main"]], constraints, corridor_building_constraints, cid)
         for cid in CATCHMENTS],
        ignore_index=True,
    )
    corridors = gpd.GeoDataFrame(corridors, geometry="geometry", crs=CRS_METRIC)
    corridor_zone = unary_union(corridors.geometry.buffer(CORRIDOR_HALF_WIDTH, cap_style="flat"))
    corridor_buildings = buildings[buildings.intersects(corridor_zone)]

    print("weirs, protected areas, intakes")
    weirs = pd.concat([read_layer("OT_BUHD_L", ["RODZAJ"], mask=area_mask),
                       read_layer("OT_BUHD_A", ["RODZAJ"], mask=area_mask)],
                      ignore_index=True)
    weirs = gpd.GeoDataFrame(weirs, geometry="geometry", crs=CRS_METRIC)
    weirs["geometry"] = weirs.geometry.representative_point()
    weirs = assign_catchment(weirs, catchments)
    protected = []
    for code, kind in (("OT_TCPN_A", "national park"), ("OT_TCPK_A", "landscape park"),
                       ("OT_TCRZ_A", "nature reserve")):
        g = read_layer(code, ["NAZWA"], mask=area_mask)
        g["kind"] = kind
        protected.append(g)
    protected = gpd.GeoDataFrame(pd.concat(protected, ignore_index=True), crs=CRS_METRIC)
    protected["geometry"] = protected.geometry.simplify(10)
    intakes = gpd.GeoDataFrame(
        WATER_INTAKES, geometry=[Point(i["lon"], i["lat"]) for i in WATER_INTAKES], crs=CRS_WEB)

    print("stats")
    stats = {}
    for _, c in catchments.iterrows():
        cid = c["id"]
        area = c.geometry.area / 1e6
        lc = landcover[landcover["catchment"] == cid].set_index("cls")["area_km2"]
        d = ditches[ditches["catchment"] == cid]
        rv = rivers[rivers["catchment"] == cid]
        cor = corridors[corridors["catchment"] == cid]
        stats[cid] = {
            "name": c["name"],
            "color": c["color"],
            "area_km2": round(area, 1),
            "validation": validation[cid],
            "landcover_pct": {k: round(100 * v / area, 1) for k, v in lc.items()},
            "sealed_pct": round(100 * lc[lc.index.isin(SEALED)].sum() / area, 1),
            "rivers_km": round(rv.length.sum() / 1000, 1),
            "ditches_km": round(d.length.sum() / 1000, 1),
            "ditch_density_km_per_km2": round(d.length.sum() / 1000 / area, 2),
            "ditches_count": int(len(d)),
            "ditches_priority_km": {p: round(d[d["priority"] == p].length.sum() / 1000, 1)
                                    for p in ("high", "medium", "low")},
            "ditch_context_km": {k: round(v / 1000, 1)
                                 for k, v in d.length.groupby(d["context"]).sum().items()},
            "main_stem_km": round(cor.length.sum() / 1000, 1),
            "corridor_room_km": {k: round(v / 1000, 1)
                                 for k, v in cor.length.groupby(cor["room_class"]).sum().items()},
            "weirs": int(len(weirs[weirs["catchment"] == cid])),
            "feeds_krakow_tap_water": cid in {"rudawa", "dlubnia"},
        }
    (OUT / "stats.json").write_text(json.dumps(stats, ensure_ascii=False, indent=2), encoding="utf-8")

    print("write")
    cat_out = catchments.copy()
    cat_out["area_km2"] = (cat_out.area / 1e6).round(1)
    cat_out["mphp_area_km2"] = [CATCHMENTS[i]["mphp_area_km2"] for i in cat_out["id"]]
    write(cat_out, "catchments.json")
    lc_out = landcover[["catchment", "cls", "area_km2", "geometry"]].copy()
    lc_out["area_km2"] = lc_out["area_km2"].round(2)
    # Drop slivers below 400 m2 and generalise to 10 m: plenty for a 1:25k web view.
    lc_out["geometry"] = lc_out.geometry.simplify(10).buffer(0)
    lc_out = lc_out.explode(index_parts=False)
    lc_out = lc_out[lc_out.area > 400].dissolve(by=["catchment", "cls"], as_index=False,
                                                aggfunc="first")
    write(lc_out, "landcover.json")
    rivers_out = rivers[["NAZWA", "catchment", "main", "SZEROKOSC", "geometry"]].rename(
        columns={"NAZWA": "name", "SZEROKOSC": "width_m"})
    rivers_out["geometry"] = rivers_out.geometry.simplify(3)
    write(rivers_out, "rivers.json")
    ditch_cols = ["catchment", "score", "priority", "context", "dist_building_m", "slope_pct",
                  "length_m", "s_context", "s_houses", "s_flat", "s_length", "geometry"]
    ditches_out = ditches[ditch_cols].copy()
    ditches_out["geometry"] = ditches_out.geometry.simplify(2)
    write(ditches_out, "ditches.json")
    write(corridors[CORRIDOR_COLUMNS],
          "corridors.json", precision=6)
    b = corridor_buildings[["FOBUD", "geometry"]].rename(columns={"FOBUD": "use"})
    b["geometry"] = b.geometry.simplify(1)
    write(b, "buildings.json", precision=6)
    write(weirs[["RODZAJ", "catchment", "geometry"]].rename(columns={"RODZAJ": "kind"}),
          "weirs.json")
    write(protected[["NAZWA", "kind", "geometry"]].rename(columns={"NAZWA": "name"}),
          "protected.json")
    write(intakes.to_crs(CRS_METRIC), "intakes.json")


if __name__ == "__main__":
    main()
