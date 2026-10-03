import unittest

import geopandas as gpd
from shapely.geometry import LineString, Point, box

from config import CRS_METRIC, OUT
from corridors import build_corridors, classify


def frame(geometries):
    return gpd.GeoDataFrame(geometry=geometries, crs=CRS_METRIC)


class CorridorTests(unittest.TestCase):
    def test_small_building_overrides_almost_entirely_open_land(self):
        buildings = frame([box(20, 5, 30, 15)])
        result = build_corridors(frame([LineString([(0, 0), (50, 0)])]), buildings, buildings, "test")
        self.assertGreater(result.iloc[0].room_pct, 95)
        self.assertEqual(result.iloc[0].room_class, "constrained")
        self.assertEqual(result.iloc[0].building_distance_m, 5)
        self.assertEqual(result.iloc[0].reason, "close_building")

    def test_endpoint_building_and_local_segments(self):
        buildings = frame([box(-5, 5, 0, 10)])
        result = build_corridors(frame([LineString([(0, 0), (250, 0)])]), buildings, buildings, "test")
        self.assertEqual(len(result), 5)
        self.assertTrue((result.length <= 50.000001).all())
        self.assertAlmostEqual(result.length.sum(), 250)
        self.assertEqual(result.iloc[0].room_class, "constrained")
        self.assertEqual(result.iloc[-1].room_class, "open")

    def test_boundary_rules_and_conservative_nearby_buildings(self):
        self.assertEqual(classify(99, 30), ("constrained", "close_building"))
        self.assertEqual(classify(99, 30.01), ("partial", "nearby_building"))
        self.assertEqual(classify(99, 100), ("partial", "nearby_building"))
        self.assertEqual(classify(80, 100.01), ("open", "open"))
        self.assertEqual(classify(50, 200), ("constrained", "sealed"))
        self.assertEqual(classify(79.99, 200), ("partial", "mixed"))

    def test_no_buildings_does_not_ignore_sealed_land_or_double_count(self):
        obstruction = box(0, -100, 50, 20)
        result = build_corridors(frame([LineString([(0, 0), (50, 0)])]),
                                 frame([obstruction, obstruction]), frame([]), "test")
        self.assertEqual(result.iloc[0].built_pct, 60)
        self.assertEqual(result.iloc[0].room_class, "constrained")
        self.assertIsNone(result.iloc[0].building_distance_m)

    def test_wrong_crs_is_rejected(self):
        with self.assertRaises(ValueError):
            build_corridors(frame([LineString([(0, 0), (50, 0)])]).to_crs(4326), frame([]), frame([]), "test")

    def test_zielonki_rzyczyska_regression_in_published_data(self):
        corridors = gpd.read_file(OUT / 'corridors.json').to_crs(CRS_METRIC)
        point = gpd.GeoSeries([Point(19.917186, 50.120351)], crs=4326).to_crs(CRS_METRIC).iloc[0]
        reach = corridors.loc[corridors.distance(point).idxmin()]
        self.assertEqual(reach.room_class, 'constrained')
        self.assertEqual(reach.reason, 'close_building')
        self.assertLess(reach.building_distance_m, 5)
        self.assertGreater(reach.room_pct, 50)  # The old area-only model showed yellow here.
        buildings = gpd.read_file(OUT / 'buildings.json').to_crs(CRS_METRIC)
        self.assertLess(buildings.distance(reach.geometry).min(), 5)

    def test_exported_buildings_cannot_be_diluted_by_open_land(self):
        corridors = gpd.read_file(OUT / 'corridors.json').to_crs(CRS_METRIC)
        buildings = gpd.read_file(OUT / 'buildings.json').to_crs(CRS_METRIC)
        near = gpd.sjoin_nearest(corridors, buildings[['geometry']], distance_col='distance')
        # Allow one metre for exported building simplification / coordinate rounding.
        self.assertTrue((near.loc[near['distance'] < 29, 'room_class'] == 'constrained').all())
        self.assertTrue((near.loc[near.room_class == 'open', 'distance'] > 99).all())


if __name__ == "__main__":
    unittest.main()
