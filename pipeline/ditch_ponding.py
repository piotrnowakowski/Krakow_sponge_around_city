"""Terrain-connected standing-water scenarios around a short filled ditch patch.

Uses official 1 m GUGiK bare-earth DTM, not the 25 m screening DSM. A static
spill-limited pond capacity, not an event/inundation forecast. Run after
ditch_barriers.py. No blanket buffer is used to draw water.
"""
import heapq
import json
from datetime import datetime, timezone

import geopandas as gpd
import numpy as np
import rasterio
from rasterio.warp import transform_bounds
import requests
from rasterio.features import rasterize, shapes
from requests.adapters import HTTPAdapter
from scipy.ndimage import label
from shapely.geometry import LineString, Point, box, mapping, shape
from shapely.ops import substring, unary_union
from urllib3.util.retry import Retry

from bdot import read_layer
from config import CRS_METRIC, CRS_WEB, OUT, RAW, WORK
from ditch_barriers import nearest_distance

WCS = "https://mapy.geoportal.gov.pl/wss/service/PZGIK/NMT/GRID1/WCS/DigitalTerrainModelFormatTIFF"
COVERAGE = "DTM_PL-KRON86-NH_TIFF"
HEIGHTS = (0.2, 0.4, 0.6, 0.8, 1.0)
RADIUS_M = 300
PATCH_WIDTH_M = 6.0
PATCH_LENGTH_M = 3.0
NEIGHBOURS = ((-1, 0), (1, 0), (0, -1), (0, 1))


def download_dtm(site_id, point):
    directory = RAW / "ponding"
    directory.mkdir(exist_ok=True, parents=True)
    path = directory / f"{site_id}.tif"
    if path.exists():
        return path
    x, y = int(point.x), int(point.y)
    bbox = (x - RADIUS_M, y - RADIUS_M, x + RADIUS_M, y + RADIUS_M)
    params = {"SERVICE": "WCS", "VERSION": "1.0.0", "REQUEST": "GetCoverage",
              "COVERAGE": COVERAGE, "CRS": CRS_METRIC, "BBOX": ",".join(map(str, bbox)),
              "RESX": 1, "RESY": 1, "FORMAT": "image/tiff"}
    session = requests.Session()
    session.mount("https://", HTTPAdapter(max_retries=Retry(total=3, backoff_factor=1)))
    response = session.get(WCS, params=params, timeout=(10, 45))
    response.raise_for_status()
    if response.content[:2] not in (b"II", b"MM"):
        raise ValueError(f"Non-TIFF response for {site_id}")
    # Validate before making the cache visible to later runs.
    with rasterio.MemoryFile(response.content) as mem, mem.open() as src:
        if src.crs != rasterio.crs.CRS.from_epsg(2180) or src.res != (1.0, 1.0):
            raise ValueError("Expected a metric 1 m DTM")
        if src.width != 600 or src.height != 600:
            raise ValueError("Unexpected DTM coverage bounds")
    path.write_bytes(response.content)
    (directory / f"{site_id}.source.json").write_text(json.dumps({
        "request_url": response.url, "retrieved_utc": datetime.now(timezone.utc).isoformat(),
        "coverage": COVERAGE, "horizontal_crs": CRS_METRIC,
        "vertical_datum": "PL-KRON86-NH", "resolution_m": 1,
    }, indent=2), encoding="utf-8")
    return path


def connected_water(dem, barrier, seed, level):
    """Four-connected below-level cells; isolated nearby hollows stay dry."""
    eligible = np.isfinite(dem) & (dem < level) & ~barrier
    if not eligible[seed]:
        return np.zeros(dem.shape, dtype=bool)
    components, _ = label(eligible)
    return components == components[seed]


def escape_level(dem, barrier, seed, drains, ceiling):
    """Minimax path to remaining drainage, nodata, or domain boundary.

    Returns the lowest terrain saddle on any escape route, and where it leads.
    A nodata gap is an unknown outlet, never an impermeable wall.
    """
    if not np.isfinite(dem[seed]) or barrier[seed]:
        raise ValueError("Invalid pond seed")
    cost = np.full(dem.shape, np.inf)
    cost[seed] = dem[seed]
    queue = [(float(dem[seed]), *seed)]
    rows, cols = dem.shape
    while queue:
        height, r, c = heapq.heappop(queue)
        if height != cost[r, c]:
            continue
        if height > ceiling:
            return None
        if r in (0, rows - 1) or c in (0, cols - 1):
            return height, "edge", (r, c)
        if drains[r, c]:
            return height, "drain", (r, c)
        for dr, dc in NEIGHBOURS:
            nr, nc = r + dr, c + dc
            if barrier[nr, nc]:
                continue
            if not np.isfinite(dem[nr, nc]):
                return height, "nodata", (nr, nc)
            next_height = max(height, float(dem[nr, nc]))
            if next_height < cost[nr, nc] and next_height <= ceiling:
                cost[nr, nc] = next_height
                heapq.heappush(queue, (next_height, nr, nc))
    return None


def polygon(mask, transform):
    parts = [shape(geom) for geom, value in shapes(mask.astype("uint8"), mask=mask, transform=transform)
             if value == 1]
    return unary_union(parts)  # Keep pixel boundaries; no ornamental smoothing.


def prepare_patch(dem, transform, upstream, downstream):
    point = Point(upstream.coords[-1])
    a, b = upstream.interpolate(max(0, upstream.length - 8)), downstream.interpolate(8)
    direction = np.array([b.x - a.x, b.y - a.y]); direction /= np.linalg.norm(direction)
    normal = np.array([-direction[1], direction[0]])
    # BDOT centrelines are approximate. Snap only across the ditch, by <= 5 m,
    # to the lowest DTM cell; never burn an invented channel into the DTM.
    samples = []
    for offset in np.arange(-5, 5.01, 0.5):
        xy = np.array([point.x, point.y]) + normal * offset
        r, c = rasterio.transform.rowcol(transform, *xy)
        if np.isfinite(dem[r, c]):
            samples.append((float(dem[r, c]), abs(offset), xy))
    if not samples:
        raise ValueError("No elevation at barrier")
    _, offset, xy = min(samples, key=lambda item: item[:2])
    cross = LineString([xy - normal * PATCH_WIDTH_M / 2, xy + normal * PATCH_WIDTH_M / 2])
    patch = cross.buffer(PATCH_LENGTH_M / 2, cap_style="flat")
    barrier = rasterize([(patch, 1)], out_shape=dem.shape, transform=transform, all_touched=True).astype(bool)
    bed = float(np.min(dem[barrier & np.isfinite(dem)]))
    seed_xy = xy - direction * 5
    seed_zone = Point(seed_xy).buffer(3)
    seeds = rasterize([(seed_zone, 1)], out_shape=dem.shape, transform=transform).astype(bool)
    seeds &= ~barrier & np.isfinite(dem)
    if not seeds.any():
        raise ValueError("No upstream terrain seed")
    seed = np.unravel_index(np.argmin(np.where(seeds, dem, np.inf)), dem.shape)
    return patch, barrier, seed, bed, float(offset)


def make_scenario(dem, barrier, seed, bed, fill_height, escape, transform, buildings):
    crest = bed + fill_height
    # Just below the first escape saddle avoids falsely flooding the still-open
    # downstream ditch or claiming water beyond the input-data boundary.
    water_level = min(crest, escape[0] - 0.01) if escape else crest
    wet = connected_water(dem, barrier, seed, water_level)
    footprint = polygon(wet, transform)
    depths = np.maximum(0, water_level - dem[wet])
    area = float(wet.sum() * abs(transform.a * transform.e))
    distance = nearest_distance(footprint, buildings) if not footprint.is_empty else None
    limited = bool(escape and escape[0] <= crest + 0.01)
    stats = {
        "height_m": fill_height, "crest_elevation_m": round(crest, 3),
        "water_elevation_m": round(water_level, 3), "area_m2": round(area, 1),
        "volume_m3": round(float(depths.sum() * abs(transform.a * transform.e)), 2),
        "max_depth_m": round(float(depths.max()), 3) if len(depths) else 0,
        "mean_depth_m": round(float(depths.mean()), 3) if len(depths) else 0,
        "building_clearance_m": round(distance, 1) if distance is not None else None,
        "building_screen_pass": distance is not None and distance >= 100,
        "limiter": escape[1] if limited else "crest",
        "empty": footprint.is_empty,
        "bounds": list(transform_bounds(CRS_METRIC, CRS_WEB, *footprint.bounds)) if not footprint.is_empty else None,
    }
    return stats, footprint, wet, water_level


def main():
    sites = gpd.read_file(OUT / "ditch-barriers.json").to_crs(CRS_METRIC)
    reaches = gpd.read_file(OUT / "ditch-barrier-reaches.json").to_crs(CRS_METRIC)
    mask = gpd.GeoDataFrame(geometry=[unary_union(sites.geometry.buffer(450))], crs=CRS_METRIC)
    print("Reading buildings and still-operating drainage", flush=True)
    # Do not report a nearest distance from disjoint, locally clipped subsets:
    # the true nearest building can be just outside a tile's read envelope.
    catchments = gpd.read_file(WORK / "catchments_2180.gpkg")
    building_mask = gpd.GeoDataFrame(geometry=[unary_union(catchments.geometry).buffer(1000)], crs=CRS_METRIC)
    buildings = read_layer("OT_BUBD_A", [], mask=building_mask)
    ditches = read_layer("OT_SWRM_L", [], mask=mask)
    rivers = read_layer("OT_SWRS_L", [], mask=mask)
    features, selected_sites, metadata = [], [], {"version": 2, "dtm": "GUGiK NMT 1 m", "source_url": WCS,
                              "coverage": COVERAGE, "heights_m": HEIGHTS, "sites": {}}
    def feature(geom, props):
        if geom.is_empty:
            return
        web = gpd.GeoSeries([geom], crs=CRS_METRIC).to_crs(CRS_WEB).iloc[0]
        features.append({"type": "Feature", "geometry": mapping(web), "properties": props})
    for _, site in sites.iterrows():
        site_id = site["id"]
        print(f"Terrain pond: {site_id}", flush=True)
        path = download_dtm(site_id, site.geometry)
        with rasterio.open(path) as src:
            dem = src.read(1, masked=True).filled(np.nan).astype("float64")
            transform = src.transform
        local = reaches[reaches["id"] == site_id]
        upstream = local[local["role"] == "upstream"].geometry.iloc[0]
        downstream = local[local["role"] == "downstream"].geometry.iloc[0]
        patch, barrier, seed, bed, snapped = prepare_patch(dem, transform, upstream, downstream)
        # Other ditches are treated conservatively as operational drains. Do not
        # disconnect them just to make a larger pond. The original ditch's
        # downstream segment remains a drain outside the short filled patch.
        drain_geoms = list(ditches[ditches["LOKALNYID"].astype(str) != site["source_ditch"]].geometry)
        drain_geoms += list(rivers.geometry)
        if downstream.length > 15:
            drain_geoms.append(substring(downstream, 15, downstream.length))
        drains = rasterize([(g.buffer(2), 1) for g in drain_geoms if not g.is_empty],
                           out_shape=dem.shape, transform=transform, all_touched=True).astype(bool)
        escape = escape_level(dem, barrier, seed, drains, bed + max(HEIGHTS) + 0.1)
        baseline_escape = escape_level(dem, np.zeros(dem.shape, dtype=bool), seed, drains, bed + max(HEIGHTS) + 0.1)
        baseline_known = baseline_escape is not None and baseline_escape[1] == "drain"
        baseline_level = baseline_escape[0] - 0.01 if baseline_escape else bed
        baseline_mask = connected_water(dem, np.zeros(dem.shape, dtype=bool), seed, baseline_level)
        site_meta = {"resolution_m": 1, "vertical_datum": "PL-KRON86-NH", "bed_elevation_m": round(bed, 3),
                     "patch_width_m": PATCH_WIDTH_M, "patch_length_m": PATCH_LENGTH_M,
                     "snap_distance_m": round(snapped, 2), "escape_elevation_m": round(escape[0], 3) if escape else None,
                     "baseline_escape_elevation_m": round(baseline_level, 3) if baseline_escape else None,
                     "baseline_outlet": baseline_escape[1] if baseline_escape else None,
                     "baseline_known": baseline_known, "stages": []}
        feature(patch, {"id": site_id, "kind": "patch"})
        for height in HEIGHTS:
            stats, footprint, wet, level = make_scenario(dem, barrier, seed, bed, height, escape, transform, buildings)
            # Compare natural depression water only inside the same footprint.
            existing = float(np.maximum(0, baseline_level - dem[wet & baseline_mask]).sum())
            stats["natural_depression_m3"] = round(existing, 2) if baseline_known else None
            stats["additional_capacity_m3"] = round(max(0, stats["volume_m3"] - existing), 2) if baseline_known else None
            stats["outside_ditch_area_m2"] = round(footprint.difference(upstream.buffer(2)).area, 1)
            # Approximate free overflow width from the DTM cross-section of the
            # short patch, rather than assuming the entire 6 m is below crest.
            stats["overflow_width_m"] = round(min(PATCH_WIDTH_M, max(0,
                float(((dem < bed + height) & barrier).sum()) / (PATCH_LENGTH_M + 1))), 2)
            site_meta["stages"].append(stats)
            props = {"id": site_id, "height_m": height, "kind": "extent"}
            feature(footprint, props)
            depth = np.where(wet, level - dem, 0)
            for band, lo, hi in (("shallow", 0, 0.15), ("medium", 0.15, 0.4), ("deep", 0.4, np.inf)):
                feature(polygon(wet & (depth > lo) & (depth <= hi), transform),
                        {**props, "kind": "depth", "band": band})
        metadata["sites"][site_id] = site_meta
        default = site_meta["stages"][2]
        site_meta["proposed"] = (default["building_screen_pass"] and default["limiter"] not in ("edge", "nodata")
                                 and (default["additional_capacity_m3"] or 0) >= 5
                                 and default["outside_ditch_area_m2"] >= 10)
        if site_meta["proposed"]:
            web_point = gpd.GeoSeries([patch.centroid], crs=CRS_METRIC).to_crs(CRS_WEB).iloc[0]
            props = {k: v for k, v in site.items() if k != "geometry"}
            props["default_height_m"] = 0.6
            selected_sites.append({"type": "Feature", "geometry": mapping(web_point), "properties": props})
        print(json.dumps({"id": site_id, "escape": escape[:2] if escape else None,
                          "stages": [{k: s[k] for k in ("height_m", "area_m2", "volume_m3", "building_clearance_m", "limiter")} for s in site_meta["stages"]]}), flush=True)
    metadata["screened_count"] = len(sites)
    metadata["proposed_count"] = len(selected_sites)
    for f in features:
        f["properties"]["proposed"] = metadata["sites"][f["properties"]["id"]]["proposed"]
    # Write only after all requested terrain tiles and scenarios succeeded.
    (OUT / "ditch-ponding.json").write_text(json.dumps({"type": "FeatureCollection", "features": features},
                                                     ensure_ascii=False, allow_nan=False), encoding="utf-8")
    (OUT / "ditch-ponding-meta.json").write_text(json.dumps(metadata, indent=2, allow_nan=False), encoding="utf-8")
    (OUT / "ditch-ponding-sites.json").write_text(json.dumps({"type": "FeatureCollection", "features": selected_sites},
                                                           ensure_ascii=False, allow_nan=False), encoding="utf-8")
    print(f"Wrote {len(features)} terrain polygons for {len(metadata['sites'])} sites", flush=True)


if __name__ == "__main__":
    main()
