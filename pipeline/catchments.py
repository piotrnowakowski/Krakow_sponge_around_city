"""Step 2: delineate the Rudawa, Prądnik and Dłubnia catchments.

MPHP10k polygons are only published as a WMS picture, so we rebuild them from open data:
  1. Mosaic the Copernicus GLO-30 tiles, reproject to EPSG:2180 at 25 m.
  2. Burn the BDOT10k river network 10 m into the surface (GLO-30 is a surface model, so
     bridges and buildings would otherwise block the channels).
  3. Fill pits/depressions, resolve flats, D8 flow directions (pysheds).
  4. Rasterise BDOT10k river segments labelled with their MPHP catchment code and give every
     cell the label of the first coded river it drains into. This mirrors how MPHP itself is
     built (catchments hang off the coded river network) and is robust to DEM routing errors
     along valley floors, e.g. in the flat Krzeszowice graben or in the city.
  5. Validate against the official MPHP10k areas.
"""
import json

import geopandas as gpd
import numpy as np
import rasterio
from pysheds.grid import Grid
from rasterio.features import rasterize, shapes
from rasterio.merge import merge
from rasterio.warp import Resampling, calculate_default_transform, reproject
from shapely.geometry import Polygon, shape
from shapely.ops import unary_union

from bdot import read_layer
from config import BBOX, CATCHMENTS, CRS_METRIC, DEM_TILES, RAW, WORK

RES = 25.0
BURN_DEPTH = 10.0
OTHER = 99
# pysheds D8 codes -> (row, col) offsets
D8 = {64: (-1, 0), 128: (-1, 1), 1: (0, 1), 2: (1, 1), 4: (1, 0), 8: (1, -1), 16: (0, -1), 32: (-1, -1)}


def build_dem():
    out = WORK / "dem_2180.tif"
    if out.exists():
        return out
    srcs = [rasterio.open(RAW / "dem" / f"{t}.tif") for t in DEM_TILES]
    mosaic, transform = merge(srcs, bounds=BBOX)
    src_crs = srcs[0].crs
    h, w = mosaic.shape[1:]
    left, bottom, right, top = rasterio.transform.array_bounds(h, w, transform)
    dst_transform, dw, dh = calculate_default_transform(
        src_crs, CRS_METRIC, w, h, left, bottom, right, top, resolution=RES
    )
    dst = np.full((dh, dw), -9999, dtype="float32")
    reproject(
        mosaic[0], dst, src_transform=transform, src_crs=src_crs,
        dst_transform=dst_transform, dst_crs=CRS_METRIC, resampling=Resampling.bilinear,
        dst_nodata=-9999,
    )
    profile = dict(driver="GTiff", height=dh, width=dw, count=1, dtype="float32",
                   crs=CRS_METRIC, transform=dst_transform, nodata=-9999, compress="deflate")
    with rasterio.open(out, "w", **profile) as f:
        f.write(dst, 1)
    return out


def burn_streams(dem_path, rivers):
    out = WORK / "dem_burned.tif"
    with rasterio.open(dem_path) as src:
        dem = src.read(1)
        profile = src.profile
        mask = rasterize(((g, 1) for g in rivers.geometry), out_shape=dem.shape,
                         transform=src.transform, fill=0, dtype="uint8")
    burned = np.where((mask == 1) & (dem != -9999), dem - BURN_DEPTH, dem).astype("float32")
    with rasterio.open(out, "w", **profile) as f:
        f.write(burned, 1)
    return out


def river_label(code):
    code = code if isinstance(code, str) else ""
    for i, c in enumerate(CATCHMENTS.values(), start=1):
        if code.startswith(c["mphp_id"]):
            return i
    return OTHER if code else 0


def fill_codes_by_name(rivers, max_dist=3000):
    """Copy the MPHP code onto uncoded segments of the same named river.

    Only 11% of segments inside Kraków carry IDMPHP, so e.g. the city reaches of Rudawa and
    Białucha would otherwise be anonymous. A name is trusted only if every coded segment of
    that name within `max_dist` shares one code prefix of our catchments.
    """
    rivers = rivers.copy()
    rivers["label"] = rivers["IDMPHP"].map(river_label)
    coded = rivers[rivers["label"] > 0]
    for idx, seg in rivers[(rivers["label"] == 0) & rivers["NAZWA"].notna()].iterrows():
        same = coded[(coded["NAZWA"] == seg["NAZWA"])]
        near = same[same.distance(seg.geometry) < max_dist]
        if len(near) and near["label"].nunique() == 1:
            rivers.at[idx, "label"] = int(near["label"].iloc[0])
    return rivers


def propagate_labels(labels, fdir):
    """Give each unlabelled cell the label of the cell it drains into, until stable."""
    h, w = labels.shape
    rows, cols = np.indices((h, w))
    down_r, down_c = rows.copy(), cols.copy()
    for code, (dr, dc) in D8.items():
        sel = fdir == code
        down_r[sel] += dr
        down_c[sel] += dc
    valid = (down_r >= 0) & (down_r < h) & (down_c >= 0) & (down_c < w)
    valid &= (down_r != rows) | (down_c != cols)
    down_r = np.where(valid, down_r, rows)
    down_c = np.where(valid, down_c, cols)
    lab = labels.copy()
    for _ in range(5000):
        todo = lab == 0
        new = np.where(todo, lab[down_r, down_c], lab)
        changed = int((new != lab).sum())
        lab = new
        if changed == 0:
            break
    return lab


def main():
    WORK.mkdir(parents=True, exist_ok=True)

    rivers = read_layer("OT_SWRS_L", ["NAZWA", "IDMPHP"])
    dem_path = build_dem()
    burned_path = burn_streams(dem_path, rivers)

    grid = Grid.from_raster(str(burned_path))
    dem = grid.read_raster(str(burned_path))
    dem = grid.resolve_flats(grid.fill_depressions(grid.fill_pits(dem)))
    fdir = np.asarray(grid.flowdir(dem))

    with rasterio.open(burned_path) as src:
        transform, shape_ = src.transform, (src.height, src.width)
    rivers = fill_codes_by_name(rivers)
    coded = rivers[rivers["label"] > 0]
    # Rasterise "other" first so our own rivers win where lines touch at confluences.
    coded = coded.sort_values("label", ascending=False)
    seeds = rasterize(((g, int(v)) for g, v in zip(coded.geometry, coded.label)),
                      out_shape=shape_, transform=transform, fill=0, dtype="int32")
    labels = propagate_labels(seeds, fdir)

    features, stats = [], {}
    for i, (cid, c) in enumerate(CATCHMENTS.items(), start=1):
        mask = (labels == i).astype("uint8")
        polys = [shape(g) for g, v in shapes(mask, mask=mask == 1, transform=transform) if v == 1]
        merged = unary_union(polys)
        parts = list(getattr(merged, "geoms", [merged]))
        poly = max(parts, key=lambda g: g.area)  # drop isolated specks
        poly = poly.buffer(30).buffer(-30).simplify(10)  # close pixel gaps, smooth staircase
        poly = Polygon(poly.exterior)  # fill enclaves draining to uncoded sinks
        area = poly.area / 1e6
        stats[cid] = {
            "area_km2": round(area, 1),
            "mphp_area_km2": c["mphp_area_km2"],
            "area_diff_pct": round(100 * (area - c["mphp_area_km2"]) / c["mphp_area_km2"], 1),
        }
        print(f"{cid:8s} area {area:7.1f} km2  MPHP {c['mphp_area_km2']:7.2f}  "
              f"diff {stats[cid]['area_diff_pct']:+.1f}%  (parts dropped: {len(parts) - 1})")
        features.append({"id": cid, "name": c["name"], "color": c["color"],
                         "mphp_id": c["mphp_id"], "geometry": poly})

    gpd.GeoDataFrame(features, geometry="geometry", crs=CRS_METRIC).to_file(
        WORK / "catchments_2180.gpkg", driver="GPKG")
    (WORK / "catchment_validation.json").write_text(json.dumps(stats, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
