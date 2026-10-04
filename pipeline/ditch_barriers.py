"""Coarse terrain screening for partial ditch barriers; never construction locations.

Run separately after layers.py. Uses ALL raw BDOT buildings, not the river-only
web building layer. Hydraulic scenarios live in web/src/ditch-hydraulics.js.
See docs/ditch-barriers-method.md for evidence, thresholds and limitations.
"""
import hashlib
import json
from collections import Counter

import geopandas as gpd
import numpy as np
import rasterio
from shapely.geometry import LineString, Point, mapping
from shapely.ops import nearest_points, substring, unary_union

from bdot import read_layer
from config import CRS_METRIC, CRS_WEB, OUT, WORK

BUILDING_CLEARANCE_M = 100
MAX_REACH_M = 200
JUNCTION_TOLERANCE_M = 5
MIN_SEPARATION_M = 200
LOW_RELIEF_M = 0.5
MIN_SLOPE = 0.001
MAX_SLOPE = 0.02


class Terrain:
    def __init__(self, path):
        with rasterio.open(path) as src:
            self.dem = src.read(1, masked=True).filled(np.nan)
            self.transform = src.transform
            self.resolution = max(src.res)

    def sample(self, points):
        rows, cols = rasterio.transform.rowcol(
            self.transform, [p.x for p in points], [p.y for p in points])
        return np.array([self.dem[r, c] if 0 <= r < self.dem.shape[0]
                         and 0 <= c < self.dem.shape[1] else np.nan
                         for r, c in zip(rows, cols)])

    def low_relief(self, point):
        """Height of surrounding terrain (75/125 m rings) above site pixel."""
        ring = [Point(point.x + radius * np.cos(a), point.y + radius * np.sin(a))
                for radius in (75, 125) for a in np.linspace(0, 2 * np.pi, 16, endpoint=False)]
        z = self.sample([point])[0]
        around = self.sample(ring)
        if not np.isfinite(z) or np.isfinite(around).sum() != len(around):
            return None
        return float(np.median(around) - z)


def nearest_distance(geom, features):
    if features.empty:
        return None
    _, indices = features.sindex.nearest(geom, return_all=False)
    return float(geom.distance(features.geometry.iloc[indices[0]]))


def junction_positions(line, network, own_index):
    """Stop at every mapped crossing/contact, including unsplit tributaries."""
    positions = []
    for idx in network.sindex.query(line.buffer(JUNCTION_TOLERANCE_M), predicate="intersects"):
        if idx == own_index:
            continue
        other = network.geometry.iloc[idx]
        contact = line.intersection(other.buffer(JUNCTION_TOLERANCE_M))
        for part in getattr(contact, "geoms", [contact]):
            if part.is_empty:
                continue
            if part.geom_type == "LineString":
                positions.extend([line.project(Point(part.coords[0])), line.project(Point(part.coords[-1]))])
            else:
                positions.append(line.project(nearest_points(line, part)[0]))
    return positions


def bounded_reach(line, position, junctions):
    if any(abs(j - position) < 25 for j in junctions):
        return None
    start = max([0.0, position - MAX_REACH_M] + [j for j in junctions if j < position])
    end = min([line.length] + [j for j in junctions if j > position])
    if position - start < 50 or end - position < 25:
        return None
    return substring(line, start, position), substring(line, position, end)


def screen_candidate(point, upstream, buildings, landcover):
    # Test the whole potentially backed-up reach plus a 10 m envelope, not a
    # midpoint or whole-ditch average. This envelope is NOT an inundation map.
    envelope = upstream.buffer(10)
    distance = nearest_distance(envelope, buildings)
    if distance is None or distance < BUILDING_CLEARANCE_M:
        return None
    hits = landcover.iloc[landcover.sindex.query(envelope, predicate="intersects")]
    if hits[hits["cls"].isin(["built", "industrial", "transport", "water"])].intersects(envelope).any():
        return None
    natural = hits[hits["cls"].isin(["forest", "grassland", "arable", "orchard"])]
    coverage = unary_union(natural.geometry).intersection(envelope).area / envelope.area
    if coverage < 0.9:
        return None
    return distance


def build_candidates(ditches, network, buildings, landcover, terrain):
    proposals = []
    for own_idx, row in ditches.iterrows():
        line = row.geometry
        if line.geom_type != "LineString" or line.length < 150 or not line.is_simple:
            continue
        # Coarse surface elevations suggest orientation only; flat/ambiguous
        # profiles are rejected rather than being assigned an arbitrary slope.
        end_z = terrain.sample([line.interpolate(25), line.interpolate(line.length - 25)])
        if not np.isfinite(end_z).all() or abs(end_z[1] - end_z[0]) < 0.5:
            continue
        if end_z[0] < end_z[1]:
            line = LineString(list(line.coords)[::-1])
        junctions = junction_positions(line, network, own_idx)
        options = []
        for position in np.arange(75, line.length - 49, 25):
            point = line.interpolate(position)
            low_relief = terrain.low_relief(point)
            if low_relief is None or low_relief < LOW_RELIEF_M:
                continue
            zs = terrain.sample([line.interpolate(position - 75), point, line.interpolate(position + 50)])
            if not np.isfinite(zs).all() or not zs[0] > zs[1] > zs[2]:
                continue
            slope = float((zs[0] - zs[2]) / 125)
            if not MIN_SLOPE <= slope <= MAX_SLOPE:
                continue
            reaches = bounded_reach(line, position, junctions)
            if reaches is None:
                continue
            upstream, downstream = reaches
            distance = screen_candidate(point, upstream, buildings, landcover)
            if distance is None:
                continue
            profile_z = terrain.sample([upstream.interpolate(d) for d in np.linspace(0, upstream.length, 9)])
            # No enclosed depression / reverse grade may be treated as an open
            # draining reach. Small DSM noise is tolerated, and disclosed.
            if not np.isfinite(profile_z).all() or np.any(np.diff(profile_z) > 0.5):
                continue
            key = f"{row.get('LOKALNYID', own_idx)}:{point.x:.1f}:{point.y:.1f}"
            properties = {
                "id": "db-" + hashlib.sha1(key.encode()).hexdigest()[:12],
                "catchment": row["catchment"],
                "source_ditch": str(row.get("LOKALNYID", own_idx)),
                "building_clearance_m": round(distance, 1),
                "low_relief_m": round(low_relief, 2),
                "terrain_slope_pct": round(slope * 100, 3),
                "upstream_length_m": round(upstream.length, 1),
                "downstream_length_m": round(downstream.length, 1),
                "dem_resolution_m": terrain.resolution,
                "status": "terrain_screening_only",
            }
            options.append((properties, point, upstream, downstream))
        # One alternative per mapped line; do not sum possible serial barriers.
        if options:
            proposals.append(max(options, key=lambda x: (x[0]["low_relief_m"], x[0]["building_clearance_m"])))
    accepted = []
    for proposal in sorted(proposals, key=lambda x: (-x[0]["low_relief_m"], x[0]["id"])):
        if all(proposal[1].distance(p[1]) >= MIN_SEPARATION_M
               and not proposal[2].buffer(10).intersects(p[2].buffer(10)) for p in accepted):
            accepted.append(proposal)
    return accepted


def main():
    catchments = gpd.read_file(WORK / "catchments_2180.gpkg")
    union = unary_union(catchments.geometry)
    mask = gpd.GeoDataFrame(geometry=[union.buffer(500)], crs=CRS_METRIC)
    buildings = read_layer("OT_BUBD_A", [], mask=mask)
    landcover = gpd.read_file(WORK / "landcover_2180.gpkg")
    ditches = read_layer("OT_SWRM_L", [], mask=mask)
    ditches = gpd.clip(ditches, union).explode(index_parts=False).reset_index(drop=True)
    # Keep pipeline indices aligned with the combined network's positional index.
    from layers import assign_catchment
    ditches = assign_catchment(ditches, catchments).reset_index(drop=True)
    rivers = read_layer("OT_SWRS_L", [], mask=mask)
    network = gpd.GeoDataFrame(geometry=list(ditches.geometry) + list(rivers.geometry), crs=CRS_METRIC)
    terrain = Terrain(WORK / "dem_2180.tif")
    proposals = build_candidates(ditches, network, buildings, landcover, terrain)
    points, reaches = [], []
    def web_geometry(geom):
        return mapping(gpd.GeoSeries([geom], crs=CRS_METRIC).to_crs(CRS_WEB).iloc[0])
    for props, point, upstream, downstream in proposals:
        points.append({"type": "Feature", "properties": props, "geometry": web_geometry(point)})
        for role, geom in (("upstream", upstream), ("downstream", downstream)):
            reaches.append({"type": "Feature", "properties": {"id": props["id"], "catchment": props["catchment"], "role": role},
                            "geometry": web_geometry(geom)})
    OUT.mkdir(exist_ok=True, parents=True)
    for name, features in (("ditch-barriers", points), ("ditch-barrier-reaches", reaches)):
        (OUT / f"{name}.json").write_text(json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False), encoding="utf-8")
    summary = {
        "candidate_count": len(points), "catchments": dict(Counter(p[0]["catchment"] for p in proposals)),
        "screened_ditch_count": len(ditches), "dem_resolution_m": terrain.resolution,
        "minimum_building_clearance_m": BUILDING_CLEARANCE_M, "screening_envelope_m": 10,
        "minimum_relative_low_m": LOW_RELIEF_M, "max_upstream_reach_m": MAX_REACH_M,
        "minimum_separation_m": MIN_SEPARATION_M, "junction_tolerance_m": JUNCTION_TOLERANCE_M,
        "status": "Alternative field-survey targets, not verified sites or additive storage."
    }
    (OUT / "ditch-barrier-summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
