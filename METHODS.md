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
Outer rings identify point-estimate Pareto membership, independently of method.
Filtering by dose, method or teacher inclusion recomputes the displayed front
for that subset. SVG downloads include the method symbols and legend.

A Pareto point can fail the full capability gates. The front does not imply
statistical dominance, replication, a latency advantage, a SOTA result or
reserved-final certification. Most current architecture results use one
construction seed; small differences require replication. Development selection
and calibration choices also limit generalization.

## Current interpretation

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
Public SHA-256 references bind the aggregate points to archived evidence.
Raw model artifacts and per-item data are not included in this website.
