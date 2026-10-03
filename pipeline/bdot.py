"""Helpers for reading BDOT10k layers across several county packages."""
import geopandas as gpd
import pandas as pd

from config import CRS_METRIC, POWIATY, RAW


def read_layer(code, columns=None, mask=None):
    """Read one BDOT10k class (e.g. "OT_SWRM_L") from every county and concatenate.

    Counties overlap at their borders only by shared edges, so duplicates are dropped by
    LOKALNYID (the national object identifier).
    """
    frames = []
    for teryt in POWIATY:
        path = RAW / "bdot10k" / teryt / f"PL.PZGiK.283.BDOT10k.{teryt}__{code}.shp"
        if not path.exists():
            continue
        cols = None if columns is None else list(dict.fromkeys(["LOKALNYID", *columns]))
        frames.append(gpd.read_file(path, columns=cols, mask=mask, encoding="utf-8"))
    gdf = pd.concat(frames, ignore_index=True)
    gdf = gpd.GeoDataFrame(gdf, geometry="geometry", crs=frames[0].crs).to_crs(CRS_METRIC)
    return gdf.drop_duplicates(subset="LOKALNYID").reset_index(drop=True)
