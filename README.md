# DendriScale

An interactive record of compression–quality tradeoffs for dendritic neural
networks, quantization, and their combinations in language models.

The goal is **the smallest final executable model within a stated performance
tolerance**. Replacing a layer, reducing its active weights, and compressing a
whole model are different measurements. The explorer keeps these separate.

[Open the explorer](https://houman1359.github.io/DendriScale/) ·
[Methods and limitations](METHODS.md) · [Aggregate snapshot](data/snapshot.json)

The website is static HTML, CSS and JavaScript. No account, GPU, database,
analytics service or third-party JavaScript is needed.

## Explore the results

1. **Benchmark fronts** opens first: one full-width chart per benchmark, with Prism’s main six first. Our dendritic, hybrid and non-dendritic fronts share a chart with clearly labeled unreproduced references. All selected bars are expanded; size/protocol scopes remain separate. Each chart opens with size–score plots of every measured result on a log GB axis, one plot per cohort and byte convention. In each, a bold staircase per training regime (the exposure and stages the labels record) marks the empirical front of our measured models, all methods together, through filled and labelled markers; a key lists each member with its GB, score and full label. Dominated and unsuccessful models stay as hollow markers, the cohort’s original model is a dashed reference line, and published references (P) have a plot of their own. Bars on a front carry “◆ On the empirical <benchmark>–size front in cohort E…, <regime>” and a heavy outline. Fronts are descriptive point estimates on one metric; a staircase joins observed points only and is not a fitted compression law.
2. **Model size vs. performance** retains the full history. Choose a model and benchmark;
   use **More filters** for verdicts, training data, and the observed frontier.
   All outcomes are included by default. **Reset filters** restores them.
3. **Dendritic and conventional compression** compares matched cohorts.
   The cards identify the most compressed passing models; the table retains
   unsuccessful and dominated candidates as well.
4. **All models, one size axis** pools each benchmark against absolute GB.
   Model colors and labels, method shapes, and the monochrome option remain
   available. Evaluation protocols stay attached to individual points.
5. **Results & experiment records** keeps every candidate and experiment
   searchable, including original technical identifiers.

Select a point for readable performance, size, and gate details. Expand
**Full record & source hashes** for the original labels and exact values.
Display titles are formatted for readability; aggregate data are unchanged.
Both charts export SVGs with their legends, and the downloads retain all records.

**✓ Passes all benchmarks** marks a candidate whose complete recorded development
suite passes: GSM8K, multiple choice, C4, copy 512 and copy 2048, within that
cohort's tolerances. The check appears in both charts, tables, selected results
and SVG exports; the small white check sits **inside** the compression-method symbol.
The dashed frontier line is separate; there are no large rings or floating checks.
Use **Expand crowded points** to magnify the densest group, then **Show full range**
to restore every plotted point. This changes the axes only; measurements and the
complete filtered result table stay intact. Both SVG exports retain the current
view and label any zoom. Overlapping model labels are suppressed in the pooled
chart; every point retains its model color, tooltip and exact record.
It requires a completed, curated observation with all five explicit gate
checks true, or an explicit "All five development gates pass" verdict on an older
battery without individual check fields. Failed or partial check fields prevent
the mark; generic positive/pass labels are insufficient. Candidate rows resolve
to that exact model/cohort observation. Teacher references, partial batteries,
local fits and pending results receive no check. An unmarked result can be
incomplete or failed; its original verdict remains available. These are
development results; reserved final-test qualification is separate.


## Run locally

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000`. Use HTTP rather than opening the HTML as a local
file, because the explorer loads its aggregate JSON snapshot.

```sh
python3 scripts/validate.py
```

This checks cohort boundaries, Pareto membership, resource accounting, the
public-data contract, and the newly reported failed-gate result.

## What is included

- Whole-model benchmark comparisons with their original development verdicts.
- Local fitting results, including active weights and connectivity costs.
- Separate panels for models, teacher/evaluation cohorts, benchmarks and doses.
- Failed and near-target candidates, alongside successful controls.
- A searchable candidate/cohort register, including dominated points and
  qualified artifacts awaiting capability; all outcomes appear by default.
- A complete experiment-coverage ledger, including missing and pending results.
- Downloadable aggregate CSV/JSON and exportable SVG plots.
- Distinct marker shapes, larger high-contrast symbols, a method filter and a
  remembered monochrome option; color is never the only method identifier.
- Externally reported reference models in their own result type, currently
  PrismML's Qwen3.8-27B and Ternary Bonsai 2 27B report. They are marked with a
  star, labeled as not reproduced and never compared with DendriScale measurements.

The snapshot is a dated export, not a live job monitor. The public data contain
aggregate measurements and source hashes; they omit internal filesystem paths,
credentials, model weights, training corpora and per-item benchmark traces.
Source hashes identify archived evidence; they do not make that evidence
independently reproducible from this repository alone.

## Publication and updates

The `main` branch contains the public website. To enable its GitHub Pages URL,
choose **Settings → Pages → Deploy from a branch → main → / (root)**.
The included validation workflow checks each push and pull request. Once Pages
is enabled, pushes to `main` update the website automatically.

Update the aggregate files and hash manifest in `data/` together from a verified export.
Keep the original gate verdicts, provenance hashes and snapshot timestamp.
The publishing pipeline rebuilds the aggregate files from the original registries.
Before validating a rebuild, apply the metadata corrections:
`python3 scripts/corrections.py apply data/metadata_corrections_v1.json`.
The correction file and its ledger travel with every later export.
Run validation and inspect the page before committing. Do not copy private
research directories or their Git history into this repository.

The matched comparison table now places dendritic hybrids beside quantization-only, pruning and layer-removal controls. Largest-passing cards are cohort-specific; all measured failures remain visible. ModelOpt-based controls describe this project's actual pipeline rather than claiming vendor benchmark performance.

## Qwen3-8B 10x program · November 2, 2026

Thirteen new Qwen3-8B panels (163 points, three experiments) hold the 10x
program of 31 October–2 November 2026. Every model replaces all 36 FFNs of
Qwen3-8B on a low-bit parent, either with dendritic sparse cells (square,
dendritic + quantization) or with dense SwiGLU twins, the dense control
(diamond). Labels give the FFN family, FFN storage, parent, training and
whole-model size, for example
“Dendritic sparse cells · 19.5 MB/FFN · low-bit parent · 67M · 1.64 GB”.
Run identifiers stay in the point IDs.

- **Models:** 18 wave-1 arms at 67.1M training targets; the 268M milestone of
  the 17.4 MB/FFN dense arm, with teacher reasoning traces added after 67.1M;
  and H7q, 30 MB/FFN cells in INT4 after two 67.1M stages.
- **Sizes:** one axis convention, the projected low-bit byte ledger with
  adapters and norms at 16 bits: 1.56–2.52 GB, 6.5–10.5× smaller than the
  16,381,470,720-byte BF16 teacher. Only the 19.5 MB/FFN cell model has a
  measured file: its qualified export is 1,628,789,072 bytes for every file
  (10.06×), stated in its conditions.
- **Scores:** development GSM (of 1,024; teacher 946), the six-task choice
  probe (of 6,144; teacher 4,942), and teacher KL (lower is better) on the old
  fresh confirmation set, on the frozen held-out pools M (seven models) and
  K (two models), and on the trainer gates.
- **Exposure:** the old set's C4 and chat sequences lie in training streams
  that the 268M milestone and H7q passed, so those two values are left out for
  both models. Every value shown is clean.
- **At equal FFN bytes,** selected-wiring cells beat the dense twins at
  30 MB/FFN (GSM 645 vs 608; paired difference +3.6 percentage points, 95%
  interval +0.6 to +6.7) and at 19.5 MB/FFN, the 10x FFN budget (495 vs 394; +9.9
  percentage points, +6.6 to +13.1; old-set C4 KL 0.80 vs 0.85, copy KL 6% higher).
  Cells with seeded instead of selected wiring fail (GSM 35–56). The 268M
  milestone reaches GSM 679 (352 at 67.1M) and 12–14% lower pool-K KL; traces
  were added, so this is not a pure dose effect.
- **Quality levels** τ1–τ4 have frozen GSM and probe cutoffs and, since
  November 3, frozen KL caps (version 1; [Methods](METHODS.md)). A level needs
  all five requirements, so no model is assigned a complete level.

## Metadata correction v1 · November 3, 2026

Model names now follow one descriptive scheme, for example
“Dendritic sparse cells · 24.1 MB/FFN · 18 of 36 FFNs · INT4 parent, INT8 tables
· 67M gold math · 3.89 GB”. References read “Reference · …” and external
models “External · …”. Point ids, measurements, sizes and verdicts are
unchanged.

- **Names:** 4,073 points under 497 former labels, with the 1,059 candidate
  records and 3,031 observation rows that carry them. Qwen3-8B labels come
  from the frontier inventory. Other models' labels use only fields each point
  records, and name the teacher.
- **Decoding:** one Qwen3-8B development-GSM cohort said “greedy”, but its job
  logs show one sampled answer at Qwen3's defaults (temperature 0.6, top-k 20,
  top-p 0.95). Its three panels now say so.
- **Size axis:** the 21 Qwen3-8B panels sized by the projected 16-bit ledger
  are titled “Projected complete-model storage, 16-bit auxiliary ledger (GB)”.
  The measured task-17 artifact (1,628,789,072 bytes, every file, 10.06×) is a
  separate “Measured artifact” field.
- **Record:** `data/metadata_corrections_v1.json` keeps every original value,
  reason and source hash, plus a ledger of every record as published before.
  `scripts/validate.py` rejects any changed value, removed record or unlisted
  metadata change ([Methods](METHODS.md)).

<!-- update-20261103:begin -->
## Qwen3-8B 10x program · November 3, 2026 update

Three new cohorts (71 points in 16 panels) extend the 10x program; nothing published changes.

- **Held-out reassessment under KL caps v1:** pool K of the frozen held-out set v1 for nine checkpoints,
  with two separate statuses per checkpoint: the levels met by point estimates and those established by
  five one-sided 95% bounds. Historical checkpoints, so not a prospective confirmation.
- **Long-dose milestones:** the 17.4 MB/FFN dense twins at 268M (GSM 679) and 671M (GSM 719) and the 19.5 MB/FFN cells at 268M (GSM 717), each with its
  checkpoint hash, exact cumulative targets and recipe. Teacher reasoning traces were added as training
  lengthened, so the change is not a dose effect alone.
- **Measured complete-model storage:** every file of the four qualified package exports, on its own axis and
  bound to the exported checkpoint: Dense SwiGLU 17.4 MB/FFN at 67M, 1,595,183,536 bytes; Dendritic sparse cells 19.5 MB/FFN at 67M, 1,628,789,072 bytes; Dense SwiGLU 19.5 MB/FFN at 67M, 1,670,128,144 bytes; Dense SwiGLU 17.4 MB/FFN at 671M +traces, 1,595,183,756 bytes.
  The 16-bit ledger sizes keep their own axis.
- **Reading:** the cells are selectively connected sparse gated units with linear compartments, not evidence
  of an E/I or shunting advantage; their copy KL is slightly worse than their dense twins'. No model is
  called better across the whole capability vector. External models' training exposure is unknown.
- **Pending:** the cells' 671M milestone (due 4 November), the 671M nine-benchmark suites and the registered
  671M decision. Pending results have no value and no level ([Methods](METHODS.md)).
- **Display:** cohorts published earlier keep their bar codes, and the new cohorts take the next ones; on
  the new panels the explorer draws one front per training regime, as the bars do.
<!-- update-20261103:end -->
