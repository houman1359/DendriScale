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
