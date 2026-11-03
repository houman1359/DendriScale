"""Validate the public aggregate contract using only the Python standard library."""
import csv
import hashlib
import json
import math
import os
from pathlib import Path
import copy
import re
import shutil
import subprocess
import sys
import unittest

ROOT=Path(__file__).resolve().parents[1]
DATA=json.loads((ROOT/'data/snapshot.json').read_text())
sys.path.insert(0,str(ROOT/'scripts'))
import corrections  # noqa: E402  (versioned metadata corrections)
CORRECTIONS=sorted((ROOT/'data').glob('metadata_corrections_v*.json'))
# Per-file cap on public data files. Raised from 10,000,000 bytes on 2026-11-03: the append-only snapshot reached
# 9,794,957 bytes before the update of that day added 71 points; GitHub Pages serves it gzip-compressed (under 1 MB).
# The cap still bounds the page's single fetch; reaching it again calls for slimming the snapshot, not silent growth.
MAX_DATA_FILE_BYTES=12_000_000


def frontier(points,xd,yd):
    sx=1 if xd=='min' else -1;sy=1 if yd=='min' else -1
    return [i for i,a in enumerate(points) if not any(sx*b['x']<=sx*a['x'] and sy*b['y']<=sy*a['y'] and
            (sx*b['x']<sx*a['x'] or sy*b['y']<sy*a['y']) for b in points)]


class PublicContract(unittest.TestCase):
    def test_benchmark_work_status_is_not_a_score(self):
        coverage=json.loads((ROOT/'data/benchmark_evaluation_coverage.json').read_text())
        names=[r['benchmark'] for r in coverage['benchmarks']]
        self.assertEqual(len(names),len(set(names)))
        self.assertTrue({'HumanEval+','MBPP+','IFEval','BFCL v3','MMLU-Redux','MuSR'}<=set(names))
        for row in coverage['benchmarks']:
            self.assertIn(row['status'],{'submitted','planned','not_applicable','completed'})
            self.assertTrue(row['label'] and row['summary'] and row['items'])
            self.assertFalse({'score','y','pass_at_1'} & row.keys())

    def test_variant_aliases_are_single_checkpoints(self):
        groups=json.loads((ROOT/'data/variant_aliases.json').read_text())['groups']
        measured=[p for panel in DATA['panels'] if panel['source_level']!='external-reported' for p in panel['points']]
        seen=set()
        for group in groups:
            # A group records registrations of one checkpoint; after a label correction they share one label
            # and the group keeps the registrations' original labels.
            self.assertTrue(group['variant'] and group['checkpoint'] and group['labels'])
            self.assertGreaterEqual(len(group.get('original_labels',group['labels'])),2)
            keys={(group['model'],label) for label in group['labels']}
            self.assertFalse(keys&seen);seen|=keys
            for label in group['labels']:
                self.assertTrue(any((p['model'],p['label'])==(group['model'],label) for p in measured),label)
            # Every registration carrying one of these labels must be a listed registration of this checkpoint.
            prefixes={re.sub('__whole_percent$','',p['id']).split('__')[0] for p in measured if (p['model'],p['label']) in keys}
            self.assertEqual(prefixes,set(group['id_prefixes']))

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

    def test_benchmark_size_notes_are_source_bound(self):
        notes=json.loads((ROOT/'data/benchmark_size_notes.json').read_text())['entries']
        points={p['id']:p for panel in DATA['panels'] for p in panel['points']}
        with (ROOT/'data/metrics.csv').open() as f:
            metrics={(r['experiment_id'],int(r['index'])):r for r in csv.DictReader(f)}
        for note in notes:
            point=points[note['point_id']]
            metric=metrics[(note['experiment_id'],note['source_metric_index'])]
            self.assertEqual(metric['name'],'teacher_registered_bytes')
            self.assertEqual(metric['unit'],'bytes')
            self.assertEqual(int(metric['value']),note['registered_bytes'])
            self.assertEqual(point['x'],note['registered_bytes'])
            self.assertEqual(point['source_hashes'],note['source_hashes'])
            for key in ['experiment_id','model','cohort','label']:
                self.assertEqual(point[key],note[key])
            for alias_id in note['alias_point_ids']:
                alias=points[alias_id]
                self.assertEqual(alias['xaxis'],'site_registered_bytes')
                for key in ['model','cohort','label','ylabel','yunit','y','source_hashes']:
                    self.assertEqual(alias[key],point[key])

    def test_schema_and_coverage(self):
        self.assertEqual(DATA['schema'],'dendriscale/public-v1')
        self.assertEqual(len(DATA['coverage']),DATA['summary']['experiments'])
        self.assertEqual(len({r['experiment_id'] for r in DATA['coverage']}),len(DATA['coverage']))
        self.assertGreaterEqual(len(DATA['coverage']),300)

    def test_no_private_data(self):
        forbidden=r'/n/|/tmp/|/home/|/Users/|file://|BEGIN .*PRIVATE KEY|gh[pousr]_[A-Za-z0-9]{20}|github_pat_[A-Za-z0-9_]+'
        for p in (ROOT/'data').iterdir():
            self.assertFalse(re.search(forbidden,p.read_text()),p.name)
            self.assertLess(p.stat().st_size,MAX_DATA_FILE_BYTES,p.name)

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


    def test_metadata_corrections_change_only_listed_metadata(self):
        # Every corrected field holds its corrected value; reverting the listed edits reproduces each ledgered
        # point, panel, candidate and alias/size-note file exactly; the CSV downloads agree with the snapshot.
        self.assertTrue(CORRECTIONS)
        for path in CORRECTIONS:
            self.assertEqual(corrections.check(ROOT/'data',path),[],path.name)
            corr=json.loads(path.read_text())
            self.assertEqual(set(corr['ledger']['points'])-{p['id'] for panel in DATA['panels'] for p in panel['points']},set())

    def test_metadata_guard_rejects_value_changes_and_removals(self):
        corr=json.loads(CORRECTIONS[-1].read_text())
        self.assertEqual(corrections.check_snapshot(copy.deepcopy(DATA),corr),[])
        listed={pid for e in corr['labels'] for pid in e['points']}
        def mutated(change):
            doc=copy.deepcopy(DATA);change(doc);return corrections.check_snapshot(doc,corr)
        first=DATA['panels'][0]['points'][0]['id']
        unlisted=next(p['id'] for panel in DATA['panels'] for p in panel['points'] if p['id'] not in listed)
        relabelled=next(iter(sorted(listed)))
        def point(doc,pid):return next(p for panel in doc['panels'] for p in panel['points'] if p['id']==pid)
        def set_y(doc):point(doc,first)['y']+=1
        def set_x(doc):point(doc,first)['x']*=1.5
        def drop(doc):doc['panels'][0]['points']=doc['panels'][0]['points'][1:]
        def relabel_unlisted(doc):point(doc,unlisted)['label']+=' (edited)'
        def undo_listed(doc):point(doc,relabelled)['label']=next(e['from'] for e in corr['labels'] if relabelled in e['points'])
        def change_source(doc):point(doc,first)['source_hashes']=['0'*64]
        for change in (set_y,set_x,drop,relabel_unlisted,undo_listed,change_source):
            self.assertTrue(mutated(change),change.__name__)

    def test_measured_artifacts_are_bound_to_their_checkpoint(self):
        # Measured complete-model storage (every file of a qualified package export) sits on its own axis: the size
        # equals the point's whole-model bytes, an artifact panel holds no other byte convention, and the exported
        # checkpoint's STATE SHA-256 named in the conditions is one of the point's source hashes.
        found=0
        for panel in DATA['panels']:
            axes={p['xaxis'] for p in panel['points']}
            if 'artifact_file_bytes' not in axes:continue
            self.assertEqual(axes,{'artifact_file_bytes'},panel['id'])
            for p in panel['points']:
                found+=1
                self.assertEqual(p['xunit'],'bytes');self.assertEqual(p['x'],p['whole_model_size']['registered_bytes'])
                self.assertRegex(p['conditions'],r'STATE SHA-256 [0-9a-f]{64}')
        self.assertGreater(found,0)
        for panel in DATA['panels']:
            for p in panel['points']:
                for sha in re.findall(r'STATE SHA-256 ([0-9a-f]{64})',p.get('conditions') or ''):
                    self.assertIn(sha,p['source_hashes'],p['id'])

    def test_bar_chart_cross_method_fronts(self):
        # The benchmark bars' cross-method fronts, as bars.js draws them (front tags, filled panel markers, one
        # staircase per protocol and size basis), equal an independent nondominated-set computation on every chart,
        # in colour and in monochrome. Runs the site's JavaScript with Node (on GitHub's runners); set NODE=<path>
        # where node is not on PATH.
        node=os.environ.get('NODE') or shutil.which('node')
        if not node:self.skipTest('Node.js not found; set NODE=<path to node>')
        for extra in ([],['--monochrome']):
            run=subprocess.run([node,str(ROOT/'scripts/check_bars_front.js'),*extra],capture_output=True,text=True,timeout=900)
            self.assertEqual(run.returncode,0,run.stdout[-3000:]+run.stderr[-3000:])
            report=json.loads(run.stdout)
            self.assertEqual(report['problems'],[])
            self.assertGreater(report['charts'],0);self.assertGreater(report['front_members'],0)

if __name__=='__main__':unittest.main(verbosity=2)
