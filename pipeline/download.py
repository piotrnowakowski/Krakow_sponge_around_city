"""Step 1: download raw inputs (BDOT10k county packages and Copernicus DEM tiles).

Files are cached in data/raw and skipped when already present.
"""
import zipfile

import requests

from config import BDOT_URL, DEM_TILES, DEM_URL, POWIATY, RAW

HEADERS = {"User-Agent": "KrakowSponge/0.1 (OneAquaHealth hackathon)"}


def fetch(url, dest):
    if dest.exists() and dest.stat().st_size > 0:
        print(f"  cached  {dest.name}")
        return dest
    print(f"  get     {url}")
    tmp = dest.with_suffix(dest.suffix + ".part")
    with requests.get(url, headers=HEADERS, stream=True, timeout=120) as r:
        r.raise_for_status()
        with open(tmp, "wb") as f:
            for chunk in r.iter_content(chunk_size=1 << 20):
                f.write(chunk)
    tmp.replace(dest)
    return dest


def main():
    (RAW / "bdot10k").mkdir(parents=True, exist_ok=True)
    (RAW / "dem").mkdir(parents=True, exist_ok=True)

    print("BDOT10k county packages")
    for teryt in POWIATY:
        archive = fetch(BDOT_URL.format(teryt=teryt), RAW / "bdot10k" / f"{teryt}_SHP.zip")
        target = RAW / "bdot10k" / teryt
        if not target.exists():
            with zipfile.ZipFile(archive) as z:
                z.extractall(target)

    print("Copernicus GLO-30 DEM tiles")
    for tile in DEM_TILES:
        fetch(DEM_URL.format(tile=tile), RAW / "dem" / f"{tile}.tif")


if __name__ == "__main__":
    main()
