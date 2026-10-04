import unittest

import geopandas as gpd
from shapely.geometry import LineString, box
from shapely.ops import unary_union

from config import CRS_METRIC, OUT
from meanders import build, propose, BUILDING_BUFFER, SEALED_BUFFER, WEIR_BUFFER


class MeanderTests(unittest.TestCase):
    def test_fixed_tie_ins_and_actual_length_gain(self):
        line = LineString([(0, 0), (500, 0)])
        proposal, envelope, metrics = propose(line, box(1000, 1000, 1010, 1010))
        self.assertEqual(proposal.coords[0], line.coords[0])
        self.assertEqual(proposal.coords[-1], line.coords[-1])
        self.assertTrue(proposal.is_simple)
        self.assertTrue(envelope.covers(proposal))
        self.assertAlmostEqual(metrics['extra_m'], proposal.length - line.length, delta=0.1)
        self.assertGreater(metrics['extra_pct'], 5)
        self.assertLessEqual(metrics['extra_pct'], 30)

    def test_blocked_short_and_already_winding_sections_have_no_proposal(self):
        straight = LineString([(0, 0), (500, 0)])
        self.assertIsNone(propose(straight, box(230, -100, 270, 100)))
        self.assertIsNone(propose(LineString([(0, 0), (50, 0)]), box(1000, 1000, 1010, 1010)))
        self.assertIsNone(propose(LineString([(0, 0), (250, 250), (500, 0)]), box(1000, 1000, 1010, 1010)))

    def test_constrained_gap_is_never_bridged(self):
        corridors = gpd.GeoDataFrame({'room_class': ['open', 'constrained', 'open'], 'catchment': ['test'] * 3},
            geometry=[LineString([(0, 0), (150, 0)]), LineString([(150, 0), (200, 0)]), LineString([(200, 0), (350, 0)])], crs=CRS_METRIC)
        empty = gpd.GeoDataFrame({'cls': []}, geometry=[], crs=CRS_METRIC)
        self.assertTrue(build(corridors, empty, empty, empty).empty)

    def test_exported_proposals_match_measurements_and_avoid_mapped_constraints(self):
        data = gpd.read_file(OUT / 'meanders.json').to_crs(CRS_METRIC)
        corridors = gpd.read_file(OUT / 'corridors.json').to_crs(CRS_METRIC)
        buildings = gpd.read_file(OUT / 'buildings.json').to_crs(CRS_METRIC)
        land = gpd.read_file(OUT / 'landcover.json').to_crs(CRS_METRIC)
        weirs = gpd.read_file(OUT / 'weirs.json').to_crs(CRS_METRIC)
        obstacles = gpd.GeoDataFrame(geometry=[*buildings.geometry.buffer(BUILDING_BUFFER),
            *land[land.cls.isin(['built', 'industrial', 'transport'])].geometry.buffer(SEALED_BUFFER),
            *weirs.geometry.buffer(WEIR_BUFFER)], crs=CRS_METRIC)
        index = obstacles.sindex
        self.assertGreater(len(data), 0)
        open_by_catchment = {cid: unary_union(group.geometry).buffer(0.01)
            for cid, group in corridors[corridors.room_class == 'open'].groupby('catchment')}
        for _, group in data.groupby('id'):
            rows = group.set_index('kind')
            current = rows.loc['current'].geometry
            proposal = rows.loc['proposal'].geometry
            envelope = rows.loc['envelope'].geometry
            self.assertEqual(set(rows.index), {'current', 'proposal', 'envelope'})
            self.assertTrue(open_by_catchment[rows.iloc[0].catchment].covers(current))
            self.assertLess(LineString([current.coords[0], proposal.coords[0]]).length, 0.001)
            self.assertLess(LineString([current.coords[-1], proposal.coords[-1]]).length, 0.001)
            self.assertTrue(proposal.is_simple)
            self.assertTrue(envelope.buffer(0.001).covers(proposal))
            self.assertEqual(len(index.query(proposal, predicate='intersects')), 0)
            self.assertAlmostEqual(rows.loc['proposal'].proposed_m, proposal.length, delta=0.1)
            self.assertAlmostEqual(rows.loc['current'].current_m, current.length, delta=0.1)
            self.assertAlmostEqual(rows.iloc[0].extra_pct, (proposal.length / current.length - 1) * 100, delta=0.1)


if __name__ == '__main__':
    unittest.main()
