"""Precision check by eye for the LiDAR pilot: a contact sheet of 30 random candidates.

Each cell shows the plain 1 m hillshade (left) and the same with the candidate drawn (right),
160 m wide. Judge each cell: does the candidate follow a narrow linear depression visible on
the relief? Writes docs/lidar_pilot_check.jpg. Run after lidar_pilot.py:
python pipeline/lidar_check.py [seed]
"""
import random
import sys

import numpy as np
import rasterio
from PIL import Image, ImageDraw, ImageFont
from pyproj import Transformer

import lidar_pilot as L
from config import ROOT

to2180 = Transformer.from_crs('EPSG:4326', 'EPSG:2180', always_xy=True).transform
src = rasterio.open(L.download())
dtm = src.read(1).astype('float32')
hs = Image.fromarray(L.hillshade(dtm, az=315, alt=35)).convert('RGB')
left, top = src.bounds.left, src.bounds.top
cands = L.candidates()
random.seed(int(sys.argv[1]) if len(sys.argv) > 1 else 1)
sample = random.sample(range(len(cands)), 30)
W = 160
S = 2  # upscale
sheet = Image.new('RGB', (5 * (2 * W * S + 10), 6 * (W * S + 24)), 'white')
d0 = ImageDraw.Draw(sheet)
for k, i in enumerate(sample):
    f = cands[i]
    pts = [to2180(*c) for c in f['geometry']['coordinates']]
    mx, my = np.mean([p[0] for p in pts]), np.mean([p[1] for p in pts])
    c0, r0 = int(mx - left - W / 2), int(top - my - W / 2)
    crop = hs.crop((c0, r0, c0 + W, r0 + W)).resize((W * S, W * S), Image.LANCZOS)
    over = crop.copy()
    d = ImageDraw.Draw(over)
    d.line([((x - left - c0) * S, (top - y - r0) * S) for x, y in pts], fill=(255, 110, 0), width=2)
    gx, gy = (k % 5) * (2 * W * S + 10), (k // 5) * (W * S + 24)
    sheet.paste(crop, (gx, gy + 20))
    sheet.paste(over, (gx + W * S, gy + 20))
    p = f['properties']
    d0.text((gx + 2, gy + 4), f"#{k + 1} (id {i}) {p['length_m']} m, depth {p['depth_mean_m']} m", fill='black')
sheet.resize((sheet.width * 2 // 3, sheet.height * 2 // 3), Image.LANCZOS).save(ROOT / 'docs' / 'lidar_pilot_check.jpg', quality=78)
print('saved', len(sample))
