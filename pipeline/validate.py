"""Draw the delineated catchments over the official MPHP10k WMS (docs/validation_mphp.png)."""
import io

import geopandas as gpd
import matplotlib
import requests
from PIL import Image

from config import ROOT, WORK

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

MPHP_WMS = "https://wody.isok.gov.pl/gpservices/KZGW/ISOK_MPHP/MapServer/WMSServer"


def main():
    g = gpd.read_file(WORK / "catchments_2180.gpkg")
    minx, miny, maxx, maxy = g.total_bounds
    pad = 2000
    bb = (minx - pad, miny - pad, maxx + pad, maxy + pad)
    w = 1800
    h = int(w * (bb[3] - bb[1]) / (bb[2] - bb[0]))
    params = {"SERVICE": "WMS", "REQUEST": "GetMap", "VERSION": "1.1.1", "LAYERS": "5", "STYLES": "",
              "SRS": "EPSG:2180", "BBOX": ",".join(map(str, bb)), "WIDTH": w, "HEIGHT": h,
              "FORMAT": "image/png", "TRANSPARENT": "false"}
    img = Image.open(io.BytesIO(requests.get(MPHP_WMS, params=params, timeout=120).content))
    fig, ax = plt.subplots(figsize=(14, 14 * h / w))
    ax.imshow(img, extent=(bb[0], bb[2], bb[1], bb[3]))
    for _, row in g.iterrows():
        gpd.GeoSeries([row.geometry]).plot(ax=ax, color=row["color"], alpha=0.35,
                                           edgecolor=row["color"], linewidth=1.2)
    ax.set_title("Delineated catchments (colour) over official MPHP10k divides (red, Wody Polskie WMS)")
    ax.set_axis_off()
    plt.tight_layout()
    out = ROOT / "docs" / "validation_mphp.png"
    out.parent.mkdir(exist_ok=True)
    plt.savefig(out, dpi=80)
    print(f"  {out}")


if __name__ == "__main__":
    main()
