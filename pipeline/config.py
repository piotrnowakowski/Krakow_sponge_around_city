"""Shared configuration for the Kraków Sponge data pipeline."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
WORK = ROOT / "data" / "work"
OUT = ROOT / "web" / "public" / "data"

# Metric CRS used for all geometry operations (PUWG 1992, official Polish grid).
CRS_METRIC = "EPSG:2180"
CRS_WEB = "EPSG:4326"

# Study area (lon/lat) that safely contains the three catchments and their mouths.
BBOX = (19.40, 49.98, 20.20, 50.45)

# The three catchments that feed Kraków's rivers and (for Rudawa and Dłubnia) its tap water.
# Official areas come from MPHP10k (Wody Polskie), queried via WMS GetFeatureInfo, and are
# used only to validate the DEM-derived boundaries.
CATCHMENTS = {
    "rudawa": {
        "name": "Rudawa",
        "mphp_id": "2136",
        "mphp_area_km2": 320.58,
        "river_names": ["Rudawa"],
        "color": "#1f78b4",
    },
    "pradnik": {
        "name": "Prądnik (Białucha)",
        "mphp_id": "21374",
        "mphp_area_km2": 192.11,
        "river_names": ["Białucha", "Prądnik"],
        "color": "#e66101",
    },
    "dlubnia": {
        "name": "Dłubnia",
        "mphp_id": "21376",
        "mphp_area_km2": 273.13,
        "river_names": ["Dłubnia"],
        "color": "#7b3294",
    },
}

# BDOT10k county packages (TERYT) that cover the catchments:
# krakowski, Kraków city, olkuski, chrzanowski, miechowski.
POWIATY = ["1206", "1261", "1212", "1203", "1208"]
BDOT_URL = "https://opendata.geoportal.gov.pl/bdot10k/schemat2021/SHP/12/{teryt}_SHP.zip"

# Copernicus GLO-30 DEM tiles (public AWS bucket, no auth).
DEM_TILES = ["N50_00_E019_00", "N50_00_E020_00"]
DEM_URL = (
    "https://copernicus-dem-30m.s3.amazonaws.com/"
    "Copernicus_DSM_COG_10_{tile}_DEM/Copernicus_DSM_COG_10_{tile}_DEM.tif"
)

# IMGW hydrological gauges inside the catchments (Dłubnia has no IMGW gauge).
IMGW_STATIONS = {
    "150190310": {"name": "Balice", "river": "Rudawa", "catchment": "rudawa"},
    "150190330": {"name": "Ojców", "river": "Prądnik", "catchment": "pradnik"},
}

# Kraków municipal water treatment plants fed by these rivers (locations from OpenStreetMap
# water_works features; the Rudawa plant takes water at the Mydlniki and Szczyglice weirs).
WATER_INTAKES = [
    {"name": "ZUW Dłubnia", "river": "Dłubnia", "osm": "way/128666983", "lon": 20.0509, "lat": 50.0970},
    {"name": "ZUW Rudawa", "river": "Rudawa", "osm": "way/288574006", "lon": 19.8723, "lat": 50.0786},
    {"name": "Ujęcie Sanka (ZUW Bielany)", "river": "Sanka", "osm": "way/229603364", "lon": 19.8225, "lat": 50.0363},
]

CLIMATE_START = "1991-01-01"
CLIMATE_NORMAL = (1991, 2020)
