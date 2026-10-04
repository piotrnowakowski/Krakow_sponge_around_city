"""Calculated bend concepts from the committed map data, not restoration designs.

Run: python pipeline/meanders.py. All distances use EPSG:2180. Only connected
green reaches are considered; no interpolation bridges gaps in that screening.
The offsets, lengths and exclusion buffers below are explicit app heuristics.
"""
import json
import math

import geopandas as gpd
import numpy as np
from shapely.geometry import LineString
from shapely.ops import linemerge, substring, unary_union

from config import CRS_METRIC, OUT

MIN_LENGTH = 200
MAX_LENGTH = 600
HALF_WIDTH = 100
BUILDING_BUFFER = 30
SEALED_BUFFER = 5
WEIR_BUFFER = 30


def bend(line, amplitude, cycles, side):
    """Offset the measured centreline with a tapered sine; keep both tie-ins."""
    distances = np.linspace(0, line.length, max(81, math.ceil(line.length / 3)))
    coords = []
    for distance in distances:
        point = line.interpolate(distance)
        before = line.interpolate(max(0, distance - 10))
        after = line.interpolate(min(line.length, distance + 10))
        dx, dy = after.x - before.x, after.y - before.y
        norm = math.hypot(dx, dy)
        u = distance / line.length
        offset = side * amplitude * math.sin(2 * math.pi * cycles * u) * math.sin(math.pi * u) ** 2
        coords.append((point.x - dy / norm * offset, point.y + dx / norm * offset) if norm else (point.x, point.y))
    coords[0], coords[-1] = line.coords[0], line.coords[-1]
    return LineString(coords)


def propose(line, blocked):
    chord = math.dist(line.coords[0], line.coords[-1])
    # Already winding or very short reaches do not need an invented extra bend.
    if line.length < MIN_LENGTH or not chord or line.length / chord > 1.12:
        return None
    envelope = line.buffer(HALF_WIDTH, cap_style="flat").difference(blocked)
    best = None
    for amplitude in (10, 15, 20, 25, 30, 35, 40):
        for side in (1, -1):
            proposal = bend(line, amplitude, max(1, round(line.length / 250)), side)
            gain = proposal.length / line.length - 1
            if not (0.05 <= gain <= 0.30) or not proposal.is_simple:
                continue
            if not envelope.buffer(0.001).covers(proposal) or proposal.intersects(blocked):
                continue
            # Choose the tested option closest to 20% extra length, not the biggest bend.
            if best is None or abs(gain - 0.20) < best[0]:
                best = (abs(gain - 0.20), proposal, amplitude)
    if best is None:
        return None
    _, proposal, amplitude = best
    return proposal, envelope, {
        "current_m": round(line.length, 1), "proposed_m": round(proposal.length, 1),
        "extra_m": round(proposal.length - line.length, 1),
        "extra_pct": round(100 * (proposal.length / line.length - 1), 1),
        "max_offset_m": round(max(line.distance(proposal.interpolate(d)) for d in np.linspace(0, proposal.length, 200)), 1),
        "amplitude_m": amplitude,
        "current_sinuosity": round(line.length / chord, 3),
        "proposed_sinuosity": round(proposal.length / chord, 3),
    }


def build(corridors, buildings, landcover, weirs):
    for frame in (corridors, buildings, landcover, weirs):
        if frame.crs != CRS_METRIC:
            raise ValueError("Meander calculation requires EPSG:2180")
    exclusions = [*buildings.geometry.buffer(BUILDING_BUFFER),
                  *landcover.loc[landcover.cls.isin(["built", "industrial", "transport"])].geometry.buffer(SEALED_BUFFER),
                  *weirs.geometry.buffer(WEIR_BUFFER)]
    obstacles = gpd.GeoDataFrame(geometry=exclusions, crs=CRS_METRIC)
    index = obstacles.sindex
    records = []
    for cid, group in corridors[corridors.room_class == "open"].groupby("catchment", sort=True):
        merged = unary_union(group.geometry)
        if merged.geom_type == "MultiLineString":
            merged = linemerge(merged)
        lines = sorted(getattr(merged, "geoms", [merged]), key=lambda g: g.bounds)
        number = 0
        for connected in lines:
            if connected.geom_type != "LineString" or connected.length < MIN_LENGTH:
                continue
            n = math.ceil(connected.length / MAX_LENGTH)
            for i in range(n):
                line = substring(connected, i * connected.length / n, (i + 1) * connected.length / n)
                local = obstacles.iloc[index.query(line.buffer(HALF_WIDTH + 1), predicate="intersects")]
                result = propose(line, unary_union(local.geometry))
                if result is None:
                    continue
                proposal, envelope, metrics = result
                number += 1
                properties = {"id": f"{cid}-{number:03d}", "catchment": cid, **metrics}
                for kind, geometry in (("current", line), ("proposal", proposal), ("envelope", envelope)):
                    records.append({**properties, "kind": kind, "geometry": geometry})
    return gpd.GeoDataFrame(records, columns=["id", "catchment", "current_m", "proposed_m", "extra_m", "extra_pct", "max_offset_m", "amplitude_m", "current_sinuosity", "proposed_sinuosity", "kind", "geometry"], crs=CRS_METRIC)


def main():
    frames = [gpd.read_file(OUT / f"{name}.json").to_crs(CRS_METRIC)
              for name in ("corridors", "buildings", "landcover", "weirs")]
    result = build(*frames)
    features = json.loads(result.to_crs(4326).to_json(drop_id=True))["features"]
    data = {"type": "FeatureCollection", "method": {
        "version": 1, "crs": CRS_METRIC, "min_length_m": MIN_LENGTH,
        "corridor_half_width_m": HALF_WIDTH, "building_buffer_m": BUILDING_BUFFER,
        "sealed_buffer_m": SEALED_BUFFER, "weir_buffer_m": WEIR_BUFFER,
        "target_extra_pct": 20, "status": "geometric screening concept",
    }, "features": features}
    (OUT / "meanders.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Calculated {len(result) // 3} bend concepts", result[result.kind == "proposal"].groupby("catchment").size().to_dict())


if __name__ == "__main__":
    main()
