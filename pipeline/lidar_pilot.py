"""EXPERIMENTAL: candidate unmapped ditches from the GUGiK 1 m LiDAR DTM, one 2 x 2 km pilot tile.

BDOT10k maps only the larger ditches. On the LiDAR relief many more are visible. This step
tries to find them automatically in one pilot tile in the Rudawa catchment (a drained forest
west of Krzeszowice with a dense mapped ditch network next to many unmapped linear features):

1. Download the 1 m DTM (NMT, GUGiK WCS) for the tile plus a 50 m margin.
2. Black top-hat: grey closing of the DTM with a 9 m disc, minus the DTM. This measures how
   deep each cell sits below its surroundings, but only for depressions narrower than the
   disc, so valleys and hollows are ignored and narrow channels light up.
3. Threshold the depth, drop small and non-linear blobs (too wide for their length).
4. Skeletonise, trace the skeleton into lines, drop lines shorter than 30 m.
5. Remove everything within 10 m of a BDOT10k ditch or river: what is left is unmapped.

The output is a set of candidates, not a map of ditches. Forest roads with wheel ruts,
sunken lanes and field edges can also look like narrow depressions. Precision is checked by
eye against the relief (pipeline/lidar_check.py, see README). Writes
web/public/data/lidar_candidates.json and the QA image docs/lidar_pilot.jpg.
Run: python pipeline/lidar_pilot.py
"""
import json

import numpy as np
import rasterio
import requests
from PIL import Image, ImageDraw
from pyproj import Transformer
from scipy import ndimage as ndi
from shapely.geometry import LineString, box, mapping, shape
from shapely.ops import linemerge, transform, unary_union
from skimage.filters import apply_hysteresis_threshold
from skimage.morphology import disk, remove_small_objects, skeletonize

from config import OUT, RAW, ROOT

TILE = (538000, 250000, 540000, 252000)  # EPSG:2180 (easting, northing), Rudawa catchment
MARGIN = 50
WCS = "https://mapy.geoportal.gov.pl/wss/service/PZGIK/NMT/GRID1/WCS/DigitalTerrainModelFormatTIFF"

CLOSING_DISC_M = 4  # radius: depressions narrower than ~9 m
# Hysteresis: cells at least LOW deep are kept if connected to cells at least HIGH deep.
LOW_DEPTH_M = 0.10
HIGH_DEPTH_M = 0.20
MIN_BLOB_PX = 60
MAX_MEAN_WIDTH_M = 4.0
MIN_LENGTH_M = 30
MAPPED_BUFFER_M = 10

to2180 = Transformer.from_crs("EPSG:4326", "EPSG:2180", always_xy=True).transform
to4326 = Transformer.from_crs("EPSG:2180", "EPSG:4326", always_xy=True).transform


def download():
    path = RAW / "lidar" / f"nmt_1m_{TILE[0]}_{TILE[1]}.tif"
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        x0, y0, x1, y1 = TILE
        # This WCS labels easting "x" and northing "y".
        r = requests.get(WCS, params=[
            ("SERVICE", "WCS"), ("VERSION", "2.0.1"), ("REQUEST", "GetCoverage"),
            ("COVERAGEID", "DTM_PL-KRON86-NH_TIFF"), ("FORMAT", "image/tiff"),
            ("SUBSET", f"x({x0 - MARGIN},{x1 + MARGIN})"), ("SUBSET", f"y({y0 - MARGIN},{y1 + MARGIN})"),
        ], timeout=600)
        r.raise_for_status()
        path.write_bytes(r.content)
    return path


def trace(skel):
    """Split an 8-connected skeleton into pixel paths between end points and junctions."""
    pts = set(zip(*np.nonzero(skel)))
    nbrs = {p: [(p[0] + dr, p[1] + dc) for dr in (-1, 0, 1) for dc in (-1, 0, 1)
                if (dr or dc) and (p[0] + dr, p[1] + dc) in pts] for p in pts}
    nodes = {p for p, n in nbrs.items() if len(n) != 2}
    seen = set()
    paths = []
    for start in nodes:
        for nxt in nbrs[start]:
            if (start, nxt) in seen:
                continue
            path = [start, nxt]
            seen.update({(start, nxt), (nxt, start)})
            while path[-1] not in nodes:
                cur, prev = path[-1], path[-2]
                step = [q for q in nbrs[cur] if q != prev and (cur, q) not in seen]
                if not step:
                    break
                seen.update({(cur, step[0]), (step[0], cur)})
                path.append(step[0])
            paths.append(path)
    return paths


def bdot_lines():
    geoms = []
    for name in ("ditches", "rivers"):
        fc = json.loads((OUT / f"{name}.json").read_text(encoding="utf-8"))
        geoms += [transform(to2180, shape(f["geometry"])) for f in fc["features"]]
    tile = box(*TILE).buffer(200)
    return [g for g in geoms if g.intersects(tile)]


def main():
    src = rasterio.open(download())
    dtm = src.read(1).astype("float32")
    left, top = src.bounds.left, src.bounds.top
    nodata = src.nodata
    if nodata is not None:
        dtm[dtm == nodata] = np.nan
    dtm = np.where(np.isnan(dtm), np.nanmedian(dtm), dtm)

    smooth = ndi.gaussian_filter(dtm, 0.7)
    depth = ndi.grey_closing(smooth, footprint=disk(CLOSING_DISC_M)) - smooth

    mask = apply_hysteresis_threshold(depth, LOW_DEPTH_M, HIGH_DEPTH_M)
    mask = ndi.binary_closing(mask, structure=disk(1))  # bridge 1-2 m gaps along a channel
    mask = remove_small_objects(mask, max_size=MIN_BLOB_PX)
    labels, n = ndi.label(mask, structure=np.ones((3, 3)))
    skel_all = skeletonize(mask)
    # Mean width = blob area / skeleton length; wide blobs are pits, ponds or quarries.
    area = ndi.sum(mask, labels, np.arange(1, n + 1))
    skel_len = ndi.sum(skel_all, labels, np.arange(1, n + 1))
    keep = np.zeros(n + 1, bool)
    keep[1:] = (skel_len >= MIN_LENGTH_M * 0.8) & (area / np.maximum(skel_len, 1) <= MAX_MEAN_WIDTH_M)
    skel = skel_all & keep[labels]

    def to_xy(p):
        return (left + p[1] + 0.5, top - p[0] - 0.5)

    pieces = [LineString([to_xy(p) for p in path]) for path in trace(skel) if len(path) >= 2]
    merged = linemerge(pieces)
    lines = []
    for line in getattr(merged, "geoms", [merged]):
        if line.length < 10:
            continue
        cols = [int(x - left) for x, _ in line.coords]
        rows = [int(top - y) for _, y in line.coords]
        d = depth[rows, cols]
        lines.append((line.simplify(1.0), float(d.mean()), float(d.max())))

    tile = box(*TILE)
    mapped = unary_union(bdot_lines())
    near_mapped = mapped.buffer(MAPPED_BUFFER_M)

    # Recall check on mapped ditches/rivers inside the tile: how much of them the detector finds.
    detected = unary_union([ln for ln, *_ in lines]).buffer(5)
    mapped_in = mapped.intersection(tile)
    recall = mapped_in.intersection(detected).length / mapped_in.length if mapped_in.length else 0

    features = []
    for line, dmean, dmax in lines:
        rest = line.intersection(tile).difference(near_mapped)
        parts = [rest] if rest.geom_type == "LineString" else list(getattr(rest, "geoms", []))
        for part in parts:
            if part.geom_type != "LineString" or part.length < MIN_LENGTH_M:
                continue
            features.append({
                "type": "Feature",
                "geometry": mapping(transform(to4326, part)),
                "properties": {"kind": "candidate", "length_m": round(part.length),
                               "depth_mean_m": round(dmean, 2), "depth_max_m": round(dmax, 2)},
            })
    for f in features:
        f["geometry"]["coordinates"] = [[round(x, 6), round(y, 6)] for x, y in f["geometry"]["coordinates"]]
    tile_feature = {"type": "Feature", "geometry": mapping(transform(to4326, tile)), "properties": {"kind": "tile"}}

    total_km = sum(f["properties"]["length_m"] for f in features) / 1000
    mapped_km = mapped_in.length / 1000
    out = {
        "type": "FeatureCollection",
        "name": "lidar_candidates",
        "experimental": True,
        "summary": {
            "candidates": len(features),
            "candidate_km": round(total_km, 1),
            "mapped_km_in_tile": round(mapped_km, 1),
            "recall_on_mapped": round(recall, 2),
        },
        "method": {
            "dtm": "GUGiK NMT 1 m (WCS DTM_PL-KRON86-NH_TIFF)",
            "closing_disc_radius_m": CLOSING_DISC_M,
            "depth_hysteresis_m": [LOW_DEPTH_M, HIGH_DEPTH_M],
            "max_mean_width_m": MAX_MEAN_WIDTH_M,
            "min_length_m": MIN_LENGTH_M,
            "mapped_buffer_m": MAPPED_BUFFER_M,
        },
        "features": [tile_feature] + features,
    }
    (OUT / "lidar_candidates.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{len(features)} candidate lines, {total_km:.1f} km unmapped vs {mapped_km:.1f} km mapped in the tile; "
          f"detector finds {recall:.0%} of the mapped network")

    qa_image(dtm, left, top, mapped, features)


def candidates():
    fc = json.loads((OUT / "lidar_candidates.json").read_text(encoding="utf-8"))
    return [f for f in fc["features"] if f["properties"]["kind"] == "candidate"]


def hillshade(dem, az=315, alt=45):
    gy, gx = np.gradient(dem)
    slope = np.pi / 2 - np.arctan(np.hypot(gx, gy))
    aspect = np.arctan2(-gx, gy)
    az, alt = np.radians(az), np.radians(alt)
    hs = np.sin(alt) * np.sin(slope) + np.cos(alt) * np.cos(slope) * np.cos(az - aspect)
    return np.clip(hs * 255, 0, 255).astype("uint8")


def qa_image(dtm, left, top, mapped, features):
    """Relief with mapped (blue) and candidate (orange) lines, for checking precision by eye."""
    im = Image.fromarray(hillshade(dtm)).convert("RGB")
    d = ImageDraw.Draw(im)
    px = lambda x, y: (x - left, top - y)  # noqa: E731
    for g in getattr(mapped, "geoms", [mapped]):
        d.line([px(*c) for c in g.coords], fill=(30, 90, 255), width=3)
    for f in features:
        d.line([px(*to2180(*c)) for c in f["geometry"]["coordinates"]], fill=(255, 120, 0), width=3)
    x0, y0 = px(TILE[0], TILE[3])
    im = im.crop((int(x0), int(y0), int(x0) + 2000, int(y0) + 2000))
    (ROOT / "docs").mkdir(exist_ok=True)
    im.save(ROOT / "output" / "lidar_pilot_full.png")
    im.resize((1000, 1000), Image.LANCZOS).save(ROOT / "docs" / "lidar_pilot.jpg", quality=82)


if __name__ == "__main__":
    main()
