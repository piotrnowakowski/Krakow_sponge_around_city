"""Conservative spatial screening, not a river-restoration feasibility model.

Distances are to mapped river centre lines, NOT surveyed banks. The 30 m and
100 m cutoffs are explicit app heuristics, not statutory setbacks.
"""
import math

import geopandas as gpd
import numpy as np
from shapely.ops import linemerge, substring, unary_union

from config import CRS_METRIC

CORRIDOR_HALF_WIDTH = 100.0
REACH_LENGTH = 50.0
BUILDING_CLOSE_M = 30.0
BUILDING_CONTEXT_M = 100.0
CORRIDOR_COLUMNS = ["catchment", "built_pct", "room_pct", "room_class",
                    "building_distance_m", "reason", "length_m", "geometry"]


def classify(room_pct, distance):
    if distance <= BUILDING_CLOSE_M:
        return "constrained", "close_building"
    if room_pct <= 50:
        return "constrained", "sealed"
    if distance <= BUILDING_CONTEXT_M:
        return "partial", "nearby_building"
    if room_pct < 80:
        return "partial", "mixed"
    return "open", "open"


def build_corridors(main_stems, constraints, buildings, catchment_id):
    for frame in (main_stems, constraints, buildings):
        if frame.crs != CRS_METRIC:
            raise ValueError("Corridor assessment requires EPSG:2180 metre coordinates")
    merged = unary_union(main_stems.geometry)
    if merged.geom_type == "MultiLineString":
        merged = linemerge(merged)
    reaches = []
    for line in getattr(merged, "geoms", [merged]):
        if line.is_empty or line.length == 0:
            continue
        n = max(math.ceil(line.length / REACH_LENGTH), 1)
        for i in range(n):
            reaches.append(substring(line, i * line.length / n, (i + 1) * line.length / n))
    gdf = gpd.GeoDataFrame({"catchment": [catchment_id] * len(reaches)},
                           geometry=reaches, crs=CRS_METRIC)
    if not reaches:
        return gpd.GeoDataFrame(columns=CORRIDOR_COLUMNS, geometry="geometry", crs=CRS_METRIC)
    shares = []
    idx = constraints.sindex
    for buf in gdf.geometry.buffer(CORRIDOR_HALF_WIDTH, cap_style="flat"):
        hits = constraints.iloc[idx.query(buf, predicate="intersects")]
        # Clip large dissolved land-cover polygons before unioning the local pieces.
        blocked = unary_union(hits.geometry.intersection(buf)).area if len(hits) else 0.0
        shares.append(min(100.0, 100 * blocked / buf.area))
    # Measure from the whole reach, so a building by an endpoint cannot be missed.
    distances = np.full(len(gdf), np.inf)
    if len(buildings):
        nearest = gpd.sjoin_nearest(gdf, buildings[["geometry"]], how="left", distance_col="distance")
        distances = nearest.groupby(level=0)["distance"].min().reindex(gdf.index).to_numpy()
    free = 100 - np.array(shares)
    classes = [classify(p, d) for p, d in zip(free, distances)]
    gdf["built_pct"] = np.round(shares, 1)
    gdf["room_pct"] = np.round(free, 1)
    gdf["room_class"] = [c[0] for c in classes]
    gdf["reason"] = [c[1] for c in classes]
    gdf["building_distance_m"] = [round(d, 1) if np.isfinite(d) else None for d in distances]
    gdf["length_m"] = gdf.length.round(1)
    return gdf
