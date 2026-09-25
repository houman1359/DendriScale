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
    def test_matched_non_dendritic_baselines(self):
        for arm,values in [('parent_both',(17127983360,918,5260)),('parent_head',(17641584896,919,5254))]:
            found=[p for panel in DATA['panels'] for p in panel['points'] if p['id'].startswith('native_wave_'+arm+'__') and p['xunit']=='bytes']
            self.assertTrue(found)
            metrics={p['ylabel']:p['y'] for p in found}
            self.assertEqual(metrics['GSM correct / 1024'],values[1]);self.assertEqual(metrics['MC correct / 6144'],values[2])
            for point in found:
                self.assertEqual(point['x'],values[0]);self.assertEqual(point['method_style']['key'],'control')
                self.assertEqual(point['methods'],['method_quantization'])
                self.assertIn('GSM948/1024',point['cohort']);self.assertIn('MC5292/6144',point['cohort'])
                self.assertTrue(all(point['full_gate_checks'].values()));self.assertIn('ModelOpt',point['label'])

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

    def test_complete_wave_and_candidate_register(self):
        expected={'warm_I10M_fit_bf16_delete17','warm_I10M_recovered_bf16_delete17',
            'warm_I100M_recovered_bf16_delete17','warm_I100M_recovered_int8_delete17',
            'warm_I100M_recovered_int4_delete17','warm_noI10M_recovered_int8_delete17',
            'delete16_17','delete16_48','pair16_48_neurons25_int8','pair16_48_neurons25_int4',
            'pair16_48_neurons12p5_int8','pair16_48_neurons12p5_int4'}
        self.assertTrue(expected.issubset({x['arm'] for x in DATA['highlights']}))
        rows=DATA['candidates']
        self.assertEqual(len(rows),DATA['summary']['candidate_cohort_records'])
        self.assertEqual(len({r['id'] for r in rows}),len(rows))
        self.assertTrue(any(r['failed_gates'] for r in rows))
        for arm in expected:
            points=[p for panel in DATA['panels'] for p in panel['points'] if p['id']=='native_wave_'+arm+'__GSM correct / 1024']
            self.assertTrue(points,arm)
            if arm.startswith('delete'):
                self.assertTrue(all(p['method_style']['key']=='control' for p in points))
        for r in rows:
            if r['source_level']=='pending':
                self.assertFalse(r['measurements']);self.assertIsNone(r['panel_id'])
        with (ROOT/'data/candidates.csv').open() as f:self.assertEqual(len(list(csv.DictReader(f))),len(rows))

    def test_external_reports_are_isolated(self):
        external=[p for p in DATA['panels'] if p['source_level']=='external-reported']
        self.assertTrue(external)
        # The same model may now have both an external report and a local smoke.
        # Cohorts and provenance must stay separate; model identity is not scope.
        local=[p for p in DATA['panels'] if p['source_level']!='external-reported']
        self.assertFalse({p['cohort'] for p in external}&{p['cohort'] for p in local})
        self.assertFalse({x['id'] for p in external for x in p['points']}&{x['id'] for p in local for x in p['points']})
        for panel in external:
            self.assertIn('PrismML',panel['cohort'])
            for p in panel['points']:
                self.assertIn(p['method_style']['key'],('teacher','external'))
                self.assertIn('not reproduced',p['evidence'])
                self.assertNotIn('full_gate_checks',p)
        self.assertIn('external',DATA['method_palette'])

    def test_coding_smoke_has_no_whole_model_admission(self):
        points=[x for p in DATA['panels'] for x in p['points']
                if x['id'].startswith('coding_smoke_final_v2_')]
        self.assertEqual(len(points),10)
        for point in points:
            self.assertEqual(point['source_level'],'registry-reported')
            self.assertEqual(point['xaxis'],'weight_file_bytes')
            self.assertFalse(point.get('full_gate_checks'))
            self.assertFalse(point.get('whole_model_size'))
        teacher=next(p for p in points if p['id']=='coding_smoke_final_v2_qwen38_bf16__LCB smoke final answers / 12')
        self.assertEqual(teacher['y'],5)

    def test_only_aggregate_uncertainty_is_public(self):
        forbidden={'paired_item_differences','paired_delta_by_window','records'}
        def keys(value):
            if isinstance(value,dict):return set(value).union(*(keys(v) for v in value.values()))
            if isinstance(value,list):return set().union(*(keys(v) for v in value))
            return set()
        self.assertFalse(keys(DATA)&forbidden)


if __name__=='__main__':unittest.main(verbosity=2)
