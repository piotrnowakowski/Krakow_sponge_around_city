import json
import unittest

import geopandas as gpd
import numpy as np
from rasterio.transform import from_origin
from shapely.geometry import box, shape

from config import OUT
from ditch_ponding import connected_water, escape_level, make_scenario


class PondingTests(unittest.TestCase):
    def setUp(self):
        self.dem = np.full((9, 9), 5.0)
        self.dem[2:7, 2:7] = 0.0
        self.barrier = np.zeros((9, 9), dtype=bool)
        self.drains = np.zeros((9, 9), dtype=bool)
        self.seed = (4, 3)
        self.transform = from_origin(0, 9, 1, 1)
        self.buildings = gpd.GeoDataFrame(geometry=[box(200, 200, 210, 210)], crs=2180)

    def test_water_spreads_across_low_ground_not_fixed_buffer(self):
        wet = connected_water(self.dem, self.barrier, self.seed, 1)
        self.assertEqual(wet.sum(), 25)
        stats, footprint, _, _ = make_scenario(self.dem, self.barrier, self.seed, 0, 1,
                                               None, self.transform, self.buildings)
        self.assertEqual(stats['area_m2'], 25)
        self.assertEqual(stats['volume_m3'], 25)
        self.assertEqual(footprint.area, 25)

    def test_disconnected_low_pocket_and_high_island_are_dry(self):
        self.dem[4, 4] = 3
        self.dem[0, 0] = -1
        wet = connected_water(self.dem, self.barrier, self.seed, 1)
        self.assertFalse(wet[4, 4])
        self.assertFalse(wet[0, 0])
        self.assertEqual(wet.sum(), 24)

    def test_open_drain_limits_pond_even_with_high_patch(self):
        self.dem[4, 7] = 0.4
        self.dem[4, 8] = 0
        self.drains[4, 7] = True
        escape = escape_level(self.dem, self.barrier, self.seed, self.drains, 2)
        self.assertEqual(escape[:2], (0.4, 'drain'))
        low = make_scenario(self.dem, self.barrier, self.seed, 0, 0.6, escape, self.transform, self.buildings)
        high = make_scenario(self.dem, self.barrier, self.seed, 0, 1, escape, self.transform, self.buildings)
        self.assertEqual(low[0]['volume_m3'], high[0]['volume_m3'])
        self.assertFalse(high[2][4, 7])

    def test_patch_closes_only_its_cells_and_bypass_remains(self):
        self.dem[4, 7:9] = 0
        self.barrier[4, 6] = True
        self.drains[4, 8] = True
        self.dem[3, 7:9] = 0.3
        escape = escape_level(self.dem, self.barrier, self.seed, self.drains, 2)
        self.assertEqual(escape[0], 0.3)
        self.assertFalse(connected_water(self.dem, self.barrier, self.seed, 0.29)[4, 8])

    def test_domain_edge_and_nodata_are_uncertain_outlets(self):
        self.dem[4, 7:9] = 0.2
        escape = escape_level(self.dem, self.barrier, self.seed, self.drains, 2)
        self.assertEqual(escape[1], 'edge')
        self.dem[4, 7] = np.nan
        self.assertEqual(escape_level(self.dem, self.barrier, self.seed, self.drains, 2)[1], 'nodata')

    def test_nearby_building_is_checked_at_water_edge(self):
        buildings = gpd.GeoDataFrame(geometry=[box(105, 3, 110, 4)], crs=2180)
        stats, _, _, _ = make_scenario(self.dem, self.barrier, self.seed, 0, 1, None, self.transform, buildings)
        self.assertFalse(stats['building_screen_pass'])
        self.assertEqual(stats['building_clearance_m'], 98)

    def test_generated_polygons_match_cell_volumes_and_exclude_natural_only_site(self):
        meta = json.loads((OUT / 'ditch-ponding-meta.json').read_text())
        polygons = json.loads((OUT / 'ditch-ponding.json').read_text())['features']
        points = json.loads((OUT / 'ditch-ponding-sites.json').read_text())['features']
        self.assertEqual(len(points), meta['proposed_count'])
        self.assertGreater(len(points), 0)
        self.assertFalse(meta['sites']['db-c6dec6e6c6df']['proposed'])
        for point in points:
            info = meta['sites'][point['properties']['id']]
            self.assertTrue(info['baseline_known'])
            self.assertEqual(info['baseline_outlet'], 'drain')
            default = info['stages'][2]
            self.assertGreaterEqual(default['building_clearance_m'], 100)
            self.assertGreaterEqual(default['outside_ditch_area_m2'], 10)
            self.assertNotIn(default['limiter'], ['edge', 'nodata'])
            self.assertGreaterEqual(default['additional_capacity_m3'], 5)
            for stage in info['stages']:
                extent = next((f for f in polygons if f['properties']['id'] == point['properties']['id']
                               and f['properties']['kind'] == 'extent'
                               and f['properties']['height_m'] == stage['height_m']), None)
                if not extent:
                    self.assertEqual(stage['area_m2'], 0)
                    continue
                area = gpd.GeoSeries([shape(extent['geometry'])], crs=4326).to_crs(2180).area.iloc[0]
                self.assertAlmostEqual(area, stage['area_m2'], places=2)
                self.assertLessEqual(stage['additional_capacity_m3'], stage['volume_m3'])
                self.assertAlmostEqual(stage['volume_m3'] / stage['area_m2'], stage['mean_depth_m'], delta=0.001)
        for info in meta['sites'].values():
            if info['baseline_outlet'] != 'drain':
                self.assertFalse(info['proposed'])
                self.assertTrue(all(s['additional_capacity_m3'] is None for s in info['stages']))


if __name__ == '__main__':
    unittest.main()
