# Reading the measurements

DendriScale studies native dendritic-network compression, including learned
dendritic components on already quantized models. Quantization, deletion and
dense/low-rank alternatives remain explicit controls. A hybrid's total factor
includes every method; it is not automatically a dendritic contribution.

## Resource axes

**Whole-model registered bytes** include the recorded values, connectivity,
scales and buffers of that artifact. Temporary workspaces and peak GPU memory
are separate resources. Checkpoint-file bytes are not resident memory.

**Original whole-model bytes retained** equals candidate registered bytes
divided by the original teacher's bytes in that exact comparison cohort.
100% means unchanged size; 25% means 4× compression. Precision reductions are
included. This percentage is not the fraction of active weights retained.

Compression ratios describe **bytes, including quantization**, not a proportional
reduction in the number of parameters. For example, changing a stored weight from
BF16 (16 bits) to INT4 (4 bits) reduces its value storage by 4× while retaining that
weight. Scales, other tensors and untouched components affect the whole-model ratio.

A historical record may provide complete-model bytes and a compression factor as
separate measurements. The detail card links them only within the same candidate,
model, evaluation cohort and provenance hashes. It never borrows a denominator
from another model or cohort. When a denominator is genuinely absent, it says
“Reference not linked”; that does not negate an independently measured byte size.
The displayed original reference is labeled as implied when recovered by multiplying
the same record's byte size and factor.

**Active learned values** count selected connections after excluding unused
masked weights, including selected values that happen to be zero. Removing a
mask does not remove the need for executable connectivity. Local replacement
bytes and training tensor bytes are labeled separately from a whole-model export.

## Comparison boundaries

Panels do not pool different teachers, precisions, task cohorts or resource
scopes. Curated capability panels use explicit evidence mappings. Historical
registry panels use conservative within-experiment joins. Local reconstruction
panels are diagnostic; lower local error or teacher KL does not establish
reasoning preservation or successful composition of several replacements.

The 32B original-teacher development instrument includes 1,024 GSM items,
6,144 multiple-choice items, C4 and copy probes. Its current gates are:

| Measurement | Requirement |
|---|---|
| GSM accuracy loss | One-sided paired 95% upper bound ≤ 5 percentage points |
| MC macro accuracy loss | Point loss ≤ 2 percentage points |
| C4 NLL increase | One-sided 95% upper bound ≤ 0.10 nats/token |
| Copy-512 perplexity ratio | Point ratio ≤ 1.25 |
| Copy-2048 perplexity ratio | Point ratio ≤ 1.50 |

The copy ratio is `exp(candidate NLL − teacher NLL)`, not an NLL ratio.
Stopping behavior is reported separately from correctness. Other historical
cohorts keep their original rules. In particular, historical 7B marker/stopping
results should not be interpreted as a validated reasoning frontier.

## Pareto fronts and uncertainty

A point is non-dominated if no measured alternative in the exact panel is
both smaller and at least as good, with one strict improvement. Exact ties
remain. Each method has a distinct shape and high-contrast color, repeated in
the legend and table. The monochrome option preserves all shape distinctions.
The dashed line identifies the observed frontier. A white check inside a marker
indicates that its recorded full development suite passed; it is independent of
point-estimate Pareto membership.
Filtering by dose, method, verdict or teacher inclusion recomputes the displayed front
for that subset. SVG downloads include the method symbols and legend.

A Pareto point can fail the full capability gates. The front does not imply
statistical dominance, replication, a latency advantage, a SOTA result or
reserved-final certification. Most current architecture results use one
construction seed; small differences require replication. Development selection
and calibration choices also limit generalization.

## Current interpretation

All twelve complete models from the latest composition wave are now included,
regardless of gate outcome. Physical deletion of FFNs16+17 scores908/1,024GSM
and5,262/6,144MC at3.8627×; it fails GSM. The100M BF16 native-cell-plus-deletion
model scores913/5,262 at3.7876× and narrowly passes, but its paired GSM gain
over double deletion is only+5 items,95% interval[−13,+22]. This does not
establish a native capability advantage. Neither a failed gate nor a dominated
point causes an otherwise valid measurement to disappear from the record.

The four newly completed two-cell models replace FFNs16 and48. The25%-value
pair scores891GSM with INT8 and898 with INT4; the12.5%-value pair scores883
in either format. Their whole-model factors are3.758×,3.781×,3.805× and3.817×,
respectively. All fail GSM while passing the other four development gates.
None establishes a paired GSM gain over deleting the same two FFNs
(881correct): even the largest point gain,+17,has95% interval[−4,+37].
Recovery descendants retain their own full-battery status; their scores are not inherited from these models. Native attention has now completed its own battery, as recorded below.

The new 3.810× INT8 native-cell-plus-deletion model scores 910/1,024 GSM and
5,262/6,144 MC against the original teacher's 948 and 5,292. It fails GSM alone:
the loss upper bound is 5.2734 points. Its healthy stopping behavior does not
eliminate the reasoning deficit. The cell is larger than the compact INT4
boundary it replaces, so this endpoint adds no demonstrated native byte
advantage. It remains visible as a useful near-target control.

Some smaller low-bit native components are below the INT4 slice budget, but
their complete-model capability is still under evaluation. Missing quality is
not zero quality, and a pending experiment is not a passing candidate.

The research objective remains dendritic compression. The strongest baseline
and a measured dendritic increment are separate questions. Neither favorable
local fits nor total hybrid compression alone settle the second question.

## Coverage and provenance

Every experiment in the exported register is listed, including records without
a joinable size–quality pair. Coverage is complete at the register level; it is
not yet a complete artifact-level normalization of all historical runs.
The separate candidate register groups cost and benchmark observations within
their original cohort. The same physical model can have separate records in
different cohorts or scopes; the row count is not a unique-checkpoint count.
Reload-qualified models without completed capability scores appear as pending
in that register, with no invented score or Pareto coordinate. All outcomes are
visible by default, including dominated and failed-gate points. The verdict and
frontier-only filters are optional views, never admission rules for the archive.
Public SHA-256 references bind the aggregate points to archived evidence.
Raw model artifacts and per-item data are not included in this website.

## Matched dendritic and non-dendritic comparison

The comparison table uses complete-model registered bytes and the exact original teacher and capability cohort. It includes all measured outcomes, not just passing or Pareto points. Its cards select the largest passing compression separately for dendritic and non-dendritic artifacts; this selection does not establish statistical superiority. Historical 7B results retain their marker/stopping caveat and are not assigned passing-frontier cards.

For the current 32B cohort (BF16/eager H100 teacher: 948/1,024 GSM, 5,292/6,144 MC), the non-dendritic quantization-only control uses NVIDIA ModelOpt-based AWQ-lite INT4 on both FFN and attention projections, compact scale storage, and custom INT8 embeddings/head. It achieves 3.764× registered-byte compression, 918 GSM and 5,260 MC, passing all five development gates. The head-only variant achieves 3.654×, 919 GSM and 5,254 MC. These are measurements of our pipeline, not externally reported NVIDIA benchmark results. [NVIDIA Model Optimizer](https://github.com/NVIDIA/Model-Optimizer) documents its quantization and model-optimization tooling.

Quantization plus FFN16 deletion reaches 3.813× (924 GSM, 5,263 MC). The two-dendritic-FFN hybrid reaches 3.814× (916 GSM, 5,260 MC); the small size difference does not establish a dendritic capability advantage over deletion. Native Q16 attention at INT8 has also completed its full battery: 3.766×, 929 GSM and 5,251 MC, passing all five gates. Larger shared-FFN banks and their combined native-attention derivatives remain experiments until their exported models pass reload qualification and their own batteries.

Pruning, sparsity and layer deletion are distinct techniques and retain their original labels. No unmeasured pruning baseline is invented. Quantized dense projections, native dendritic attention projections and complete attention-block replacement are also distinct: Q16 changes only the Q projection and retains the attention mechanism.

The September 20 independent four-FFN bank (sites 16–19, INT4 native values) completed at **3.870741×**, 16,655,355,368 registered bytes, **917/1,024 GSM and 5,229/6,144 MC**, passing all five development gates. GSM loss upper bound is 4.6875 points; MC point loss is 1.0254 points. C4 upper NLL increase is 0.03273; copy perplexity ratios are 1.15245 and 1.25150. It is the largest passing native artifact in this snapshot. This is a distinct site set from the equally sized early-site composition at 0/1/2/9, which fails copy. No equivalence between their artifacts or results is implied. The new result is one construction seed and calibration, with no reserved-final or isolated cell-versus-deletion superiority claim.

## Additional all-model plot

The matched plots remain available below the benchmark overview. The additional benchmark selector pools recorded models on an absolute whole-model registered-byte axis, displayed in decimal GB. Percentage-axis duplicates are collapsed; failed and dominated outcomes remain available. Local cell costs and unspecified file/resident sizes are not promoted to whole-model bytes.

Counts are converted to accuracy percentages only with sample sizes explicitly recorded in benchmark/cohort metadata or an unambiguous count in the same experiment and benchmark family. Unresolved counts retain a separate raw-count view. Ratios and nats/token retain their definitions. The pooled display is descriptive: it does not aggregate item-level datasets, alter gates or construct a pooled Pareto frontier across protocols. Exact cohorts and original scores remain in the point details and table.

In the pooled plot, original models have distinct colors and short text labels, while marker shapes identify compression methods. Model labels are enabled by default and remain visible in monochrome. The model legend can highlight a model while retaining all points; the existing Models selector isolates it. SVG exports include both legends and any active highlight. Original matched plots keep their existing styling.

At the user's request, the pooled view defaults to hiding percentage scores below 10%, independently of gate verdict. The minimum is adjustable; “Show near-zero results” restores every measured point for the selection. Ratios, losses and counts without a known denominator are unaffected. The on-page count and SVG export disclose the filter and hidden count. This is a display preference, not a quality gate or deletion of evidence: the matched views, full register and downloads retain all records.


### Pass-only filter and visual quality allowances

The synchronized **Passes all benchmarks only** checkboxes filter both charts,
the matched method table and the model-result register. They use the same
source-bound, completed, curated five-gate verdict as the check inside each
marker. A good score on one benchmark, a local diagnostic, or a partial battery
does not qualify. Teacher references are omitted under this filter. The complete
experiment ledger and downloadable records remain unchanged. Recorded historical
7B passes retain their protocol warning; they are not a validated reasoning frontier.

Shading currently has a verified mapping only for the original OLMo-2-32B
H100 BF16/eager full-development cohort (teacher GSM 948/1024, MC 5292/6144).
Its original tolerances are GSM paired one-sided 95% upper loss 0.05,
MC macro point loss 0.02, C4 paired one-sided 95% upper delta NLL 0.1,
and copy-512/2048 point perplexity ratios 1.25/1.50. This is the frozen
five-gate decision used by the physical FFN16 deletion receipt and the matched
full-development comparisons. No separate stopping or per-task MC gate is inferred.

The blue band shows the recorded **point-score allowance**, not a passing verdict.
For example, GSM's line is 948 − 0.05 × 1024 = 896.8 correct; the actual paired
confidence-bound gate is stricter. A point above that line can still fail.
MC's line is 5169.12 correct, using six equally sized tasks. C4's line is the
cohort teacher NLL plus 0.1. Unknown or incompatible cohorts get no inferred band.
The pooled plot draws a band only when all displayed results share a supported
model, cohort, benchmark and score scale; explicit counts are converted to percent.

**Explore +25% / +50%** multiplies the permitted degradation, not the score.
For example, +25% changes GSM's 5-point allowance to 6.25 points and copy-512's
1.25 ratio to 1 + 1.25 × 0.25 = 1.3125. The hatched extension is an exploratory
visual comparison. It never changes full-suite verdicts, check marks, or the
pass-only subset. Recorded tolerances are the default. Lines and hatching remain
distinct in monochrome and SVG downloads.

## Externally reported references

The **Externally reported results** type holds published numbers that
DendriScale has not measured. It currently contains PrismML's reports for
Qwen3.8-27B: the FP16 original, two conventional GGUF quantizations
(UD-Q4_K_XL and IQ2_XXS) and Ternary Bonsai 2 27B, taken from the
[Bonsai 2 27B whitepaper](https://github.com/PrismML-Eng/Bonsai-demo/blob/main/bonsai-2-27b-whitepaper.pdf)
(Tables 10 and 11 and Section 4) and the
[model card](https://huggingface.co/prism-ml/Ternary-Bonsai-2-27B-gguf).
Each source is its own cohort:

| Cohort | Models and reported sizes | Benchmarks |
|---|---|---|
| PrismML whitepaper · thinking xhigh | FP16 53.8 GB, IQ2_XXS 7.3 GB, Bonsai 5.93 GB | 20 benchmarks and their average; Terminal-Bench 2.1 and SWE-bench Verified for FP16 and Bonsai only |
| PrismML whitepaper · thinking medium | FP16 53.8 GB, Bonsai 5.93 GB | 20 benchmarks and their average |
| PrismML model card · thinking | FP16 54.66 GB, UD-Q4_K_XL 17.56 GB, IQ2_XXS 7.27 GB, Bonsai 5.95 GB | 14 benchmarks and their average |

Sizes are PrismML's language-model bytes (whitepaper) or on-disk file sizes
(model card) in decimal GB, not DendriScale byte ledgers. Scores come from
PrismML's harness: EvalScope with vLLM on H100, thinking mode, temperature 1.0
and single-sample pass@1. The two agentic benchmarks use Harbor with the
Terminus-2 agent and the mini-swe-agent scaffold.

The two documents disagree about IQ2_XXS. For example, AIME26 is 78.6 in the
whitepaper and 57.50 on the model card, and LiveCodeBench is 70.05 and 56.40.
Both versions are kept, each in its own cohort. The FP16 and Bonsai values agree
wherever the benchmarks overlap.

A star marks an externally reported compressed model; the original model keeps
the cross. These points never receive the passing check. They are excluded
from the matched comparison table and from the pooled all-model plot, because
no DendriScale measurement shares their teacher, benchmarks or protocol. A
reported score is not a DendriScale verdict. Reproducing these baselines in one
harness is a separate, pending experiment.


## Benchmark bars

The landing page shows **one full-width chart per benchmark**, with the six primary Prism-aligned benchmarks first: MMLU-Redux, MuSR, GSM8K, HumanEval+, IFEval and BFCL v3. Additional benchmarks follow by task. Each chart combines our measured method fronts, original-model references and a labeled **Published · not reproduced** group. It is a descriptive overview of different protocols, not a matched cross-model ranking. All published observations remain, including disagreements between the whitepaper and model card.

**Empirical fronts across methods (November 3, 2026).** Above each chart, small size–score plots draw every measured result of the selected original model on that benchmark, front or not: one plot per cohort (one evaluation set and protocol) and byte convention, with external releases measured in that cohort as context, the cohort’s original model as a reference line, and published references in a plot of their own. Each front is an empirical front of observed points on one metric, within one cohort, one training regime and one byte convention, pooling all our method families. The training regime is the training exposure and stages the model’s label records (for example 67M, 134M (2-stage), 268M, 4.19M, untrained); labels that record none form a “regime not recorded” group, and nothing is inferred. Model A dominates model B when A has no more bytes and at least as good a score, with at least one of the two strictly better (lower is better for KL, loss and ratios), on unrounded bytes and scores; ties stay. Different evaluation sets (held-out pools M and K, the old confirmation set, trainer gates, benchmark protocols) never share a front or a plot, projected ledger bytes and registered bytes of built models never share a front or a plot, and training regimes never share a front: in the 10x program the 67M models, the long dose (268M) and H7q’s two 67.1M stages (134M, 2-stage) each have their own staircase, and so do untrained references where a cohort records them. The per-family fronts of the bars use the same groups. Original models, published references and external releases measured here (PrismML Bonsai, GGUF files) are never on our fronts. Each regime’s front is a bold staircase on a log GB axis, told apart by line style and a text label (“E19 · 67M front · solid”); members are filled and labelled, by GB and name when a plot has at most four and by number otherwise, and the key under each plot lists each member’s GB (with extra digits where labels round alike), score and full label. Dominated and unsuccessful models stay as hollow markers. A front bar carries “◆ On the empirical <benchmark>–size front in cohort E…, <regime>” and a heavy outline. The fronts are descriptive point estimates, not a confidence-certified dominance relation; a staircase joins observed points only and does not imply that intermediate size–score combinations are attainable, nor is it a fitted compression law. A front within one regime does not account for other training differences (data mix, learning rate), which the labels name. A front on one metric never implies dominance across the capability vector: on held-out pool M the 19.5 and 30 MB/FFN dendritic cells (67M traces) have lower C4 and chat KL than their dense twins but higher copy KL. No label summarises a model across benchmarks, and a missing evaluation is not a zero score.

Our bars are selected on score versus size, separately for **dendritic**, **dendritic + quantization** and **non-dendritic** methods. The latter includes quantization, pruning, deletion, dense replacements and measured binary/ternary controls. Candidate A dominates B only when A is no larger and no worse, with at least one strict improvement. Accuracy is maximized; loss and perplexity ratios are minimized. Comparisons require the same original model, benchmark, exact evaluation cohort, recorded sample size and byte-accounting basis. Equal points remain; teacher references never remove compressed candidates. Published references do not compete with our measurements. This is point-score dominance, not a significance test or full-suite admission.

Size is labeled in decimal GB. Registered whole-model sizes, projected formats, weight-file sizes and published packed sizes stay separate. A missing size cannot enter a size–score front; its observation remains in the register. Projected size does not mean a verified packed export. A locally measured Bonsai score may still carry provider-reported packed bytes; its quality is measured and its size basis remains published. Counts become percentages only with an explicit sample denominator. C4 loss, teacher KL and copy ratios have their own lower-is-better charts in native units. Local-only diagnostics and unresolved counts stay in the detailed explorer rather than being converted into accuracy.

All selected bars are expanded without pagination, chart scrolling or a benchmark dropdown. Longer charts use aligned columns on wide displays with one shared scale per benchmark (0–100 for percentages, a native-unit range for losses/ratios); mobile layouts use a single column. Bars are ordered by category and color, then ascending whole-model GB across model names and evaluation cohorts; unknown sizes come last. Names and protocols only break equal-size ties. Published references remain a separate evidence group, with originals and compressed methods kept together by color. Read columns top to bottom, then left to right. Model names, GB sizes, method colors and patterns, and explicit group labels remain visible. E/P codes and published protocol names bind bars to their exact conditions. Click or keyboard-activate a bar for the full record. Search filters the already-computed fronts; it does not promote a dominated result. The evidence buttons are optional filters. Monochrome and SVG exports preserve patterns and labels.

This front-only overview follows the September 28 presentation request. The full history—including dominated and failed candidates—remains in the scatter plots, register and downloads. A failed candidate can be on a benchmark front. A check mark still means all recorded development gates passed within that candidate’s original cohort, not every benchmark on the page. Existing scatter pass-only controls do not alter the overview.


## Native-first accounting · September 28, 2026

New primary studies measure DendriNet replacement and whole-model recovery at the original value precision before low-bit quantization. Report original/native byte reduction, native/quantized-native reduction and original/final reduction separately, using exact artifact lineage and identical byte scopes. A hybrid’s total reduction is not labeled as DendriNet’s standalone contribution. Existing hybrid and conventional observations remain visible with their original evidence.


## Local IFEval measurements · September 28

The new local IFEval results use all 541 official prompts and 834 instructions, explicit greedy nonthinking generation with a 4,096-token output budget, and the average of prompt-strict and instruction-strict accuracy. These are our measurements, not reproductions of Prism’s serving stack. The Bonsai packed sizes remain provider-reported; evaluation uses unpacked weights. No full-suite or significance claim follows from this single benchmark.


## Historical size notes and contrast · September 28 follow-up

The older BF16 OLMo-3-7B teacher record includes 14,596,022,784 complete-model registered bytes, but the generic registry importer classified `teacher_registered_bytes` as unqualified `registered_bytes`. The same benchmark score also appeared against the 270,532,608-byte layer cost. The overview now applies an audited size note to the complete-model row and folds the exact layer-cost duplicate into it. `data/benchmark_size_notes.json` binds the correction to point IDs, model, cohort, source hashes and the original byte value; mismatches fail closed. The full snapshot, raw metrics and register retain both original cost scopes.

The older FP32 teacher characterization reports 7,298,011,136 parameters without a verified complete-model byte ledger. Its reference bars say **GB not recorded**, with the parameter count and the reason in the detail. This is an accounting gap, not a zero-size model. We do not infer registered bytes from model names, parameter counts, or a different precision.

Method colors now use charcoal for originals, blue for dendritic replacements, amber for dendritic + quantization, and rose/magenta for non-dendritic methods. Wider spacing between pattern marks preserves the base colors; diagonal lines, crosses and dots provide redundant distinctions. Group headers carry colored strips and the legend has larger swatches. Monochrome retains visible patterns. The same three method colors apply to the matched scatter view; the pooled plot retains its separate model-color convention.


## Qwen3-8B 10x program · November 2, 2026

**Models.** Each model replaces all 36 FFNs of Qwen3-8B. Dendritic sparse
cells keep a selected subset of input connections per cell (seeded in three
arms that failed). Their compartments are linear, so each cell computes a
sparse gated unit: the differences between cells and twins are a
selective-wiring result, not evidence for nonlinear dendritic integration.
Dense SwiGLU twins are the dense control, sized to a cell model's FFN bytes;
one narrower set is not matched to any cell. “INT4 parent” means INT4
attention and embedding/head tables; “low-bit parent” means INT3 attention and
tables with a binary input embedding; other labels name their formats.
Training: 67.1M targets of C4 text, teacher chat replies and synthetic copy
sequences (wave 1); two 67.1M stages (H7q); 268.4M targets with teacher
reasoning traces on GSM8K and MATH training problems added after 67.1M (the
milestone, taken mid-schedule from a longer run). One seed each. Each point
states its provenance: study-built (the study's own trainer and dense twin),
with cells built by the DendriNet package where cells are used; the package
also rebuilds and exports the 19.5 MB/FFN cell model bit for bit.

**Sizes.** The x axis, titled “Projected complete-model storage, 16-bit
auxiliary ledger (GB)”, is the projected low-bit byte ledger: every stored
value, scale and connectivity mask at its recorded format, with adapters and
norms at 16 bits. It is not a packed file. Factors divide the BF16 teacher's
16,381,470,720 bytes by it. Stored as trained, adapters and norms are FP32,
about 16 MB more. The 19.5 MB/FFN cell model's qualified export measures
1,628,789,072 bytes for every file (10.06×) with FP32 adapters and norms and a
more compact connectivity code. It is a separate field of that model's points
(“Measured artifact” in the result details and bar details), not a position on
the axis.

**Instruments.** Development GSM: 1,024 frozen items, 5-shot, 512-token cap,
one sampled answer per item at Qwen3's default decoding (temperature 0.6,
top-k 20, top-p 0.95), H100; the teacher scores 946 on the same items and
prompts. Six-task probe: the same 6,144 items and scorer as the earlier six-task
H100 probe panels, here run on H200; the teacher's 4,942 is the H100 value. KL is KL(teacher ‖ model) over
the full vocabulary at every next-token position, averaged per sequence or
row and then over the set. The old fresh confirmation set has 64 sequences per
family (C4, chat, copy). The frozen held-out set was built afterwards from
sources outside every training stream (C4 validation shard 1, new chat prompts
with teacher replies, copy windows from a separate index range), screened by
document hash, 13-word shingles and near-duplicates, and frozen by manifest
hash before use. Pool M (32 rows per family) calibrates the KL caps. Pool K
(64 rows per family) is the confirmation pool; its only two results (the
17.4 MB/FFN dense arm at 67.1M and at 268M) were scored before the caps were
chosen, so they are informative rather than untouched tests. Trainer gates are
each run's fixed C4 validation windows and copy gate at the evaluated dose.

**Exposure.** A value appears only when its sequences lie outside the model's
training streams. The 268M milestone and H7q trained past the stream positions
of the old set's C4 and chat sequences, so those values are left out. Their
copy values, held-out pools, GSM and probe are clean. No trace row of the
milestone matches a development or few-shot GSM item, but the traces come from
the same GSM8K training distribution.

**Quality levels.** Frozen on November 2 as fractions of the teacher's
full-precision scores (GSM 946/1,024; probe 4,942/6,144 = 0.804362). Probe
cutoffs apply to the unrounded aggregate.

| Level | Role | GSM ≥ (of 1,024) | Probe ≥ (accuracy · of 6,144) |
| --- | --- | --- | --- |
| τ1 | High-fidelity target | 899 (0.95 × 946) | 0.764144 · 4,695 |
| τ2 | Main development target | 663 (0.70) | 0.643490 · 3,954 |
| τ3 | Intermediate milestone | 473 (0.50) | 0.563053 · 3,460 |
| τ4 | Low-quality diagnostic boundary | 332 (0.35) | 0.522835 · 3,213 |

KL caps, version 1, were frozen on November 3 from pool M only, as declared
operational tolerances rather than natural boundaries implied by the teacher
or by theory:

| Level | C4 KL ≤ | Chat KL ≤ | Copy KL ≤ |
| --- | --- | --- | --- |
| τ1 | 0.131 | 0.151 | 0.0984 |
| τ2 | 0.502 | 0.552 | 0.0984 |
| τ3 | 0.749 | 0.838 | 0.0984 |
| τ4 | 0.951 | 1.030 | 0.0984 |

A KL requirement holds when the measured value is at most the cap; a confirmed
pass uses the one-sided 95% upper bound on pool K. The copy cap is one
permissive guard at every level: the untrained INT4 RTN parent's pool-M copy KL
plus a tolerance of ln 1.10 nats per copied token. A level needs all five
requirements (GSM, probe, and C4, chat and copy KL on the common held-out set,
with their uncertainty checks), so this page assigns no complete level to any
model. A model that meets only a level's GSM and probe cutoffs is described as
meeting that level's GSM/probe point thresholds, never as reaching the level.
Threshold shading stays off for these panels; it covers only the curated OLMo
cohort. Passing τ4 is never described as preserving broad teacher quality.


## Metadata correction v1 · November 3, 2026

Approved by Houman Safaai: raw measurements are preserved; known false or
uninformative metadata is not. No id, value, size, source hash or verdict
changes, and no record is removed.

**Model names.** Every label follows one scheme: “family · FFN storage/FFN ·
parent · training · size GB”. References read “Reference · …” and external
models “External · …”. Qwen3-8B labels are the frontier inventory's labels for
the same runs. An earlier checkpoint of a run keeps that label with its own
cumulative training targets. Labels of other models use only fields the point
itself records: the method family, the original arm name kept as the variant,
parent formats stated in the record, recorded training positions and
whole-model bytes. They also name the teacher. A slot with no recorded value
is left out. Point ids still carry the original run identifiers, and no panel
gives two different models one label.

**Development-GSM decoding.** One Qwen3-8B cohort (three panels) said
“greedy”. Each of its 72 student shards and the teacher's 8 reference shards
is bound, by path and hash, to the job log that wrote it. Every one of those
logs records the merge of Qwen3's generation defaults: one sampled answer at
temperature 0.6, top-k 20, top-p 0.95. The cohort now says so. No cohort needed
the label “decoding unknown”. Greedy labels of other benchmarks (EvalScope,
EvalPlus, IFEval, coding smoke) were out of scope and are unchanged.

**Size axis and artifact.** In 21 Qwen3-8B panels, every size equals the
model's projected 16-bit ledger. These panels now title the axis “Projected
complete-model storage, 16-bit auxiliary ledger (GB)”. The measured task-17
artifact (1,628,789,072 bytes, every file, 10.06×) is a separate field.

**Correction layer.** `data/metadata_corrections_v1.json` lists every corrected
field with its original value, its reason and the record that establishes it.
Records are cited by hash, never by path. A ledger hashes every point, panel
and candidate as published at commit f876667. `scripts/corrections.py apply`
migrates data rebuilt from the original registries. `scripts/validate.py`
fails if any value changes, a ledgered record is removed, or metadata differs
from the original beyond the listed corrections. `metrics.csv` keeps each
registry's original metric names, because they are registry records, not
model labels.

<!-- update-20261103:begin -->
## Qwen3-8B 10x program · November 3, 2026 update

Approved by Houman Safaai: the clean held-out results, the completed long-dose milestones and the measured
artifact sizes. Three new cohorts hold 71 new points in 16 panels; every published point, panel and row is
unchanged. Labels follow the scheme above; run identifiers stay in point IDs.

**1. Pool K under KL caps v1.** Nine checkpoints scored on pool K of the frozen held-out set v1 (manifest
SHA-256 `56fa9b87a6b69a46917191226e18a7ded81b243ef0b7c1d83a5228477585531a`; 64 C4 windows, 64 packed chat rows and 64 copy windows, mean per-token KL to the
teacher). Five historical checkpoints were scored once, after the caps were frozen, from frozen states whose
hashes were checked before scoring. Two results of the 17.4 MB/FFN dense twins (at 67.1M and 268M targets)
reuse the earlier pool-K evaluation, read before the levels and caps were chosen, so they are informative
rather than untouched tests. The last two are new long-dose milestones. These are historical checkpoints:
their development GSM and probe entered the program's decisions, and seven of them calibrated the caps on
pool M. The reassessment is retrospective and descriptive, not a prospective confirmation of a frontier.

| Model | GSM (of 1,024) | Probe | K C4 / chat / copy KL | Point estimates | Five one-sided 95% bounds |
| --- | ---: | ---: | --- | --- | --- |
| Dendritic sparse cells · 30 MB/FFN · INT4 parent · 67M · 2.52 GB | 645 | 0.6226 | 0.5277 / 0.5926 / 0.0336 | τ3; next τ2: GSM 645 against 663 (violation); probe 0.6226 against 0.6435 (violation); C4 KL 0.5277 against 0.502 (violation); chat KL 0.5926 against 0.552 (violation) | τ3; next τ2: GSM 645 against 663 (violation); probe 0.6226 against 0.6435 (violation); C4 KL 0.5277 against 0.502 (violation); chat KL 0.5926 against 0.552 (violation) |
| Dense SwiGLU · 30 MB/FFN · INT4 parent · 67M · 2.52 GB | 608 | 0.5939 | 0.5788 / 0.6332 / 0.0307 | τ3; next τ2: GSM 608 against 663 (violation); probe 0.5939 against 0.6435 (violation); C4 KL 0.5788 against 0.502 (violation); chat KL 0.6332 against 0.552 (violation) | τ3; next τ2: GSM 608 against 663 (violation); probe 0.5939 against 0.6435 (violation); C4 KL 0.5788 against 0.502 (violation); chat KL 0.6332 against 0.552 (violation) |
| Dendritic sparse cells · 19.5 MB/FFN · low-bit parent · 67M · 1.64 GB | 495 | 0.5505 | 0.7631 / 0.8182 / 0.0526 | τ4; next τ3: probe 0.5505 against 0.5631 (violation); C4 KL 0.7631 against 0.749 (violation) | τ4; next τ3: GSM 469 against 473 (bound crosses); probe 0.5505 against 0.5631 (violation); C4 KL 0.7631 against 0.749 (violation); chat KL 0.8887 against 0.838 (bound crosses) |
| Dense SwiGLU · 19.5 MB/FFN · low-bit parent · 67M · 1.64 GB | 394 | 0.5312 | 0.8111 / 0.8485 / 0.0495 | τ4; next τ3: GSM 394 against 473 (violation); probe 0.5312 against 0.5631 (violation); C4 KL 0.8111 against 0.749 (violation); chat KL 0.8485 against 0.838 (violation) | none; next τ4: probe 0.5218 against 0.5228 (bound crosses) |
| Dense SwiGLU · 17.4 MB/FFN · low-bit parent · 67M · 1.56 GB | 352 | 0.5231 | 0.8578 / 0.8927 / 0.0516 | τ4; next τ3: GSM 352 against 473 (violation); probe 0.5231 against 0.5631 (violation); C4 KL 0.8578 against 0.749 (violation); chat KL 0.8927 against 0.838 (violation) | none; next τ4: GSM 327 against 332 (bound crosses); probe 0.5127 against 0.5228 (bound crosses) |
| Dendritic sparse cells · 30 MB/FFN · INT4 parent · 134M (2-stage) · 2.52 GB | 678 | 0.6294 | 0.4873 / 0.5265 / 0.0304 | τ3; next τ2: probe 0.6294 against 0.6435 (violation) | τ3; next τ2: GSM 654 against 663 (bound crosses); probe 0.6294 against 0.6435 (violation); C4 KL 0.512 against 0.502 (bound crosses); chat KL 0.573 against 0.552 (bound crosses) |
| Dense SwiGLU · 17.4 MB/FFN · low-bit parent · 268M +traces · 1.56 GB | 679 | 0.5488 | 0.7513 / 0.7691 / 0.0446 | τ4; next τ3: probe 0.5488 against 0.5631 (violation); C4 KL 0.7513 against 0.749 (violation) | τ4; next τ3: probe 0.5488 against 0.5631 (violation); C4 KL 0.7513 against 0.749 (violation) |
| Dendritic sparse cells · 19.5 MB/FFN · low-bit parent · 268M +traces · 1.64 GB | 717 | 0.5661 | 0.6799 / 0.7163 / 0.0452 | τ3; next τ2: probe 0.5661 against 0.6435 (violation); C4 KL 0.6799 against 0.502 (violation); chat KL 0.7163 against 0.552 (violation) | τ4; next τ3: probe 0.5558 against 0.5631 (bound crosses) |
| Dense SwiGLU · 17.4 MB/FFN · low-bit parent · 671M +traces · 1.56 GB | 719 | 0.5588 | 0.6523 / 0.7018 / 0.0362 | τ4; next τ3: probe 0.5588 against 0.5631 (violation) | τ4; next τ3: probe 0.5588 against 0.5631 (violation) |

The two statuses are kept apart: “point estimates” names the strictest level whose five requirements (GSM,
probe, and C4, chat and copy KL on pool K) all hold at their measured values; “five one-sided 95% bounds”
names the strictest level whose GSM and probe lower bounds and three KL upper bounds all hold. “Violation”
means the measured value misses the requirement; “bound crosses” means the value meets it but its bound
does not. A level is a statement about the thresholds above, never about broad teacher quality.

**2. The long dose's completed milestones.** Each milestone is its own checkpoint observation, bound to its
STATE SHA-256, with its exact cumulative exposure. The 67.1M wave-1 state (67,109,249 targets of C4, teacher
chat and copy; no reasoning traces) continued on four GPUs with C4, teacher chat, teacher reasoning traces on
GSM8K and MATH training problems, and copy:

| Milestone | Cumulative targets | Of which long-dose C4 / chat / traces / copy | GSM | Probe | M C4 / chat / copy KL |
| --- | ---: | --- | ---: | ---: | --- |
| Dense SwiGLU · 17.4 MB/FFN · low-bit parent · 268M +traces · 1.56 GB | 268,437,127 | 35,158,464 / 53,858,130 / 41,959,988 / 70,351,296 | 679 | 0.5488 | 0.7886 / 0.8898 / 0.0448 |
| Dendritic sparse cells · 19.5 MB/FFN · low-bit parent · 268M +traces · 1.64 GB | 268,437,127 | 35,158,464 / 53,858,130 / 41,959,988 / 70,351,296 | 717 | 0.5661 | 0.7234 / 0.8263 / 0.0455 |
| Dense SwiGLU · 17.4 MB/FFN · low-bit parent · 671M +traces · 1.56 GB | 671,100,034 | 105,459,024 / 161,626,525 / 125,884,100 / 211,021,136 | 719 | 0.5588 | 0.6813 / 0.8198 / 0.0372 |

The long dose lengthened training and added the teacher traces at the same time, so a change from the
67.1M state is not a training-length effect alone; no trace row matches a development or few-shot GSM item,
but the traces come from the GSM8K training distribution. The 268M milestones are mid-schedule and
undecayed; 671M ends the registered schedule. The 671M state's milestone record gives 982,073,555
cumulative targets, double-counting a resumed stretch; the run's accounting gives 671,100,034, used here.
Paired comparisons (development GSM over items; pool K over rows):
- the 19.5 MB/FFN cells against the 17.4 MB/FFN dense twins at 268M: GSM +3.71 points [+0.88, +6.54]; K C4 ×0.905 [0.897, 0.913], chat ×0.931 [0.923, 0.940], copy ×1.015 [1.007, 1.022] (at 67.1M: C4 ×0.890 [0.882, 0.897], chat ×0.917 [0.908, 0.925], copy ×1.020 [1.015, 1.025]). These
  finalists are not byte-matched: the cells are larger by 75,068,316 B on the 16-bit ledger and by
  33,605,536 B as measured artifacts at their qualified 67.1M exports;
- the dense twins from 268M to 671M: GSM +3.91 points [+1.27, +6.64]; K C4 ×0.868 [0.861, 0.875], chat ×0.913 [0.900, 0.925], copy ×0.811 [0.806, 0.816];
- outside the registered rules, the cells at 268M against the dense twins at 671M: GSM -0.20
  [-2.83, +2.54]; K C4 ×1.042 [1.031, 1.054], chat ×1.021 [1.005, 1.036], copy ×1.252 [1.242, 1.262].

**3. Measured complete-model storage.** Four checkpoints have qualified package exports: the package's
loader, its training form and the evaluated model agree bit for bit on every tensor and on the logits, and
the artifact reloads with no teacher, run or data file. Their every-file sizes form their own byte
convention (x axis “Measured complete-model storage”), each bound to the exported checkpoint by its STATE
SHA-256. The 16-bit ledger sizes stay on their own axis and are never replaced by these.

| Model | Every file (bytes) | ×BF16 teacher | 16-bit ledger (bytes) | Resident after loading | Peak, 2,048-token prefill |
| --- | ---: | ---: | ---: | ---: | ---: |
| Dense SwiGLU · 17.4 MB/FFN · low-bit parent · 67M · 1.56 GB | 1,595,183,536 | 10.27× | 1,562,901,504 | 10.40 GB | 10.91 GB |
| Dendritic sparse cells · 19.5 MB/FFN · low-bit parent · 67M · 1.64 GB | 1,628,789,072 | 10.06× | 1,637,969,820 | 11.85 GB | 16.49 GB |
| Dense SwiGLU · 19.5 MB/FFN · low-bit parent · 67M · 1.64 GB | 1,670,128,144 | 9.81× | 1,637,846,016 | 10.98 GB | 11.50 GB |
| Dense SwiGLU · 17.4 MB/FFN · low-bit parent · 671M +traces · 1.56 GB | 1,595,183,756 | 10.27× | 1,562,901,504 | 10.40 GB | 10.91 GB |

Memory is measured after the package loader expands the codes (a BF16 parent and FP32 FFN values), so it
is not a low-bit runtime's. The 19.5 MB/FFN cells' 268M state has no qualified export: no artifact size is
attached to it, and the export of its 67.1M state does not stand in for it.

**Reading the cells.** The successful cells are selectively connected sparse gated units with linear
compartments. A difference from the dense twins is therefore a selective-wiring result, not evidence of an
E/I or shunting advantage. Their copy KL is slightly worse than their byte-matched twins' on pool K:
×1.095 [1.084, 1.106] at 30 MB/FFN and ×1.062 [1.057, 1.067] at 19.5 MB/FFN
(67.1M), while their C4 and chat KL are lower (×0.912 [0.903, 0.921] and ×0.936 [0.924, 0.948]; ×0.941 [0.933, 0.948] and ×0.964 [0.956, 0.972]).

**One capability vector.** Fronts are drawn per metric. No model here is described as better across the
whole vector: the metrics and their protocols differ, and every comparison above has a metric that goes
the other way or a size that differs.

**External models.** Where external releases appear on this site (PrismML's Bonsai models, GGUF files),
their training data are unknown, and so is their exposure to these evaluation sets. Scores we measured on
them are measurements of the released files, not evidence about how they were trained.

**Pending** (no value is inferred and no level is assigned until measured): the 19.5 MB/FFN cells' 671M
milestone (training; due near 10:00 on 4 November 2026); the nine-benchmark suites at 671M (the dense
twins' generations on their qualified artifact are running; the cells' follow their milestone); the
program's registered 671M decision between the two finalists; exports of the cells' 268M and 671M states.
These appear in the experiment ledger as running or planned.

**Correction history (exposure and records).**
- 2 November: the long dose's training stream was found to pass the stream positions of the old fresh
  confirmation set's C4 and chat sequences. Those values of the long-dose milestones are exposed and are
  in no clean comparison; a frozen held-out set (v1, above) was built from sources outside every training
  stream. The 2 November publication already left them out.
- 2 November, night: H7q (two 67.1M stages) was found exposed in the same way; its old-set C4 and chat values
  are excluded as well.
- 3 November: the 671M milestone record's derived cumulative-target total double-counts a resumed stretch;
  the run's accounting is used (item 2).
- 3 November: sizes of the two finalists are stated in both conventions, the 16-bit ledger difference and
  the measured artifact difference at matched 67.1M checkpoints (item 2), never one for the other.
<!-- update-20261103:end -->

# Benchmark coverage

Benchmark cards distinguish measured scores from evaluation work. The coverage
note is a dated status snapshot, not a score or a new pass verdict. Pending
evaluations never become zero-height bars. Published references remain labeled
as unreproduced, and protocols remain separate.

The September 29 coverage wave evaluates full HumanEval+ (164 tasks) and MBPP+
(378 tasks), using EvalPlus 0.3.1 augmented tests, on the Qwen3-8B teacher,
recovered INT4 parent, eight-cell hybrid, and all six native BF16 endpoints.
Those native endpoints also receive full IFEval (541 prompts, 834 instructions).
These are matched local H100/eager, greedy, nonthinking evaluations; they do not
reproduce Prism's serving stack. Native whole-model sizes remain projections
until physical exports qualify. Coding results do not establish agentic coding
performance, and historical GSM/MC/copy gates do not imply passing these tests.

Future data rebuilds must preserve `benchmark_evaluation_coverage.json` and its
manifest digest, as well as the audited `benchmark_size_notes.json`. Update work
status from receipts; only publish scores after complete item coverage and
scorer verification.
