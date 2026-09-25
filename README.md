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

1. **Model size vs. performance** opens first. Choose a model and benchmark;
   use **More filters** for verdicts, training data, and the observed frontier.
   All outcomes are included by default. **Reset filters** restores them.
2. **Dendritic and conventional compression** compares matched cohorts.
   The cards identify the most compressed passing models; the table retains
   unsuccessful and dominated candidates as well.
3. **All models, one size axis** pools each benchmark against absolute GB.
   Model colors and labels, method shapes, and the monochrome option remain
   available. Evaluation protocols stay attached to individual points.
4. **Results & experiment records** keeps every candidate and experiment
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
Run validation and inspect the page before committing. Do not copy private
research directories or their Git history into this repository.

The matched comparison table now places dendritic hybrids beside quantization-only, pruning and layer-removal controls. Largest-passing cards are cohort-specific; all measured failures remain visible. ModelOpt-based controls describe this project's actual pipeline rather than claiming vendor benchmark performance.
