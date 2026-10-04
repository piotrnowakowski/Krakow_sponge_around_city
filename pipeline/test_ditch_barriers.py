import unittest

import geopandas as gpd
from shapely.geometry import LineString, Point, box

from ditch_barriers import bounded_reach, junction_positions, screen_candidate


def frame(geometries, **columns):
    return gpd.GeoDataFrame(columns, geometry=geometries, crs="EPSG:2180")


class ScreeningTests(unittest.TestCase):
    def setUp(self):
        self.line = LineString([(0, 0), (300, 0)])
        self.land = frame([box(-500, -500, 500, 500)], cls=["grassland"])

    def test_building_near_upstream_end_is_not_hidden_by_distant_barrier(self):
        upstream = LineString([(0, 0), (200, 0)])
        buildings = frame([box(0, 20, 10, 30)])
        self.assertGreater(Point(200, 0).distance(buildings.geometry.iloc[0]), 100)
        self.assertIsNone(screen_candidate(Point(200, 0), upstream, buildings, self.land))

    def test_clearance_is_from_envelope_not_centreline(self):
        upstream = LineString([(0, 0), (200, 0)])
        self.assertIsNone(screen_candidate(Point(200, 0), upstream, frame([box(0, 105, 10, 115)]), self.land))
        self.assertAlmostEqual(screen_candidate(Point(200, 0), upstream, frame([box(0, 125, 10, 135)]), self.land), 115)

    def test_absent_buildings_or_land_cover_are_unknown_not_safe(self):
        self.assertIsNone(screen_candidate(Point(200, 0), self.line, frame([]), self.land))
        self.assertIsNone(screen_candidate(Point(200, 0), self.line, frame([box(0, 300, 10, 310)]), frame([], cls=[])))

    def test_transport_crossing_rejects_site(self):
        land = frame([box(-500, -500, 500, 500), box(30, -20, 40, 20)], cls=["grassland", "transport"])
        self.assertIsNone(screen_candidate(Point(200, 0), self.line, frame([box(0, 300, 10, 310)]), land))

    def test_unsplit_crossing_stops_backwater_domain(self):
        network = frame([self.line, LineString([(100, -50), (100, 50)])])
        positions = junction_positions(self.line, network, 0)
        up, down = bounded_reach(self.line, 200, positions)
        self.assertAlmostEqual(up.length, 95)
        self.assertAlmostEqual(down.length, 100)
        self.assertIsNone(bounded_reach(self.line, 110, positions))

    def test_snapped_near_contact_also_stops_reach(self):
        network = frame([self.line, LineString([(100, 3), (100, 50)])])
        self.assertTrue(junction_positions(self.line, network, 0))

    def test_length_cap_never_counts_whole_ditch(self):
        line = LineString([(0, 0), (1000, 0)])
        up, _ = bounded_reach(line, 800, [])
        self.assertEqual(up.length, 200)


if __name__ == '__main__':
    unittest.main()
