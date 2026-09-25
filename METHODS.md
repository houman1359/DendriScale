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

The original matched plots remain the default. The additional benchmark selector pools recorded models on an absolute whole-model registered-byte axis, displayed in decimal GB. Percentage-axis duplicates are collapsed; failed and dominated outcomes remain available. Local cell costs and unspecified file/resident sizes are not promoted to whole-model bytes.

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
