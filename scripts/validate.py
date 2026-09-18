"""Validate the public aggregate contract using only the Python standard library."""
import csv
import hashlib
import json
import math
from pathlib import Path
import re
import unittest

ROOT=Path(__file__).resolve().parents[1]
DATA=json.loads((ROOT/'data/snapshot.json').read_text())


def frontier(points,xd,yd):
    sx=1 if xd=='min' else -1;sy=1 if yd=='min' else -1
    return [i for i,a in enumerate(points) if not any(sx*b['x']<=sx*a['x'] and sy*b['y']<=sy*a['y'] and
            (sx*b['x']<sx*a['x'] or sy*b['y']<sy*a['y']) for b in points)]


class PublicContract(unittest.TestCase):
    def test_schema_and_coverage(self):
        self.assertEqual(DATA['schema'],'dendriscale/public-v1')
        self.assertEqual(len(DATA['coverage']),DATA['summary']['experiments'])
        self.assertEqual(len({r['experiment_id'] for r in DATA['coverage']}),len(DATA['coverage']))
        self.assertGreaterEqual(len(DATA['coverage']),300)

    def test_no_private_data(self):
        forbidden=r'/n/|/tmp/|/home/|/Users/|file://|BEGIN .*PRIVATE KEY|gh[pousr]_[A-Za-z0-9]{20}|github_pat_[A-Za-z0-9_]+'
        for p in (ROOT/'data').iterdir():
            self.assertFalse(re.search(forbidden,p.read_text()),p.name)
            self.assertLess(p.stat().st_size,10_000_000)

    def test_panels_and_fronts(self):
        ids=set()
        for panel in DATA['panels']:
            self.assertNotIn(panel['id'],ids);ids.add(panel['id'])
            self.assertTrue(panel['points'])
            self.assertEqual(len({p['id'] for p in panel['points']}),len(panel['points']))
            for p in panel['points']:
                self.assertEqual(p['model'],panel['model']);self.assertEqual(p['cohort'],panel['cohort'])
                self.assertTrue(math.isfinite(p['x']) and math.isfinite(p['y']))
                self.assertGreaterEqual(p['x'],0)
            self.assertEqual(panel['front_indices'],frontier(panel['points'],panel['xdirection'],panel['ydirection']))

    def test_whole_percent_and_scope(self):
        for panel in DATA['panels']:
            for p in panel['points']:
                if panel['source_level']=='local':self.assertNotIn('whole_model_size',p)
                if 'whole_model_size' in p:
                    v=p['whole_model_size']
                    self.assertAlmostEqual(v['retained_percent'],100*v['registered_bytes']/v['original_registered_bytes'])
                    self.assertAlmostEqual(v['retained_percent']+v['saved_percent'],100)
                if panel['xunit']=='percent':self.assertAlmostEqual(p['x'],p['whole_model_size']['retained_percent'])

    def test_new_battery_is_failed(self):
        found=[p for panel in DATA['panels'] for p in panel['points'] if p['id'].startswith('native_wave_warm_I100M_recovered_int8_delete17__')]
        self.assertTrue(found)
        for p in found:
            self.assertEqual(p['gate_status'],'Fails full development gates')
            self.assertFalse(p['full_gate_checks']['gsm'])
            if p['ylabel']=='GSM correct / 1024':self.assertEqual(p['y'],910)
            if p['xunit']=='bytes':self.assertEqual(p['x'],16920754244)

    def test_download_counts(self):
        for name,key in [('metrics.csv','raw_metrics'),('coverage.csv','experiments'),('observations.csv','normalized_observations')]:
            with (ROOT/'data'/name).open() as f:self.assertEqual(len(list(csv.DictReader(f))),DATA['summary'][key])

    def test_provenance_hashes(self):
        for panel in DATA['panels']:
            for p in panel['points']:
                self.assertTrue(p['source_hashes'],p['id'])
                for sha in p['source_hashes']:self.assertRegex(sha,r'^[a-f0-9]{64}$')

    def test_manifest(self):
        manifest=json.loads((ROOT/'data/manifest.json').read_text())
        for name,sha in manifest['sha256'].items():
            self.assertEqual(hashlib.sha256((ROOT/'data'/name).read_bytes()).hexdigest(),sha)


if __name__=='__main__':unittest.main(verbosity=2)
