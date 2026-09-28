# DendriNet-first compression campaign · September 28, 2026

Primary objective: find the largest useful **native DendriNet structural compression**, recover the complete model and benchmark it at the original value precision. Then quantize that exact native model and benchmark it again. The >100B campaign retains its **at least 5× complete-model target**; no such achieved result is claimed.

The native-only factor is original bytes divided by recovered native bytes. The additional quantization factor is those native bytes divided by the quantized native artifact’s bytes. Their product is meaningful only for the same parent-child artifacts and accounting scope. Active values, connectivity, complete artifact bytes and resident memory are reported separately.

Six whole-model Qwen3-8B recoveries have been submitted: 8, 18 or all 36 FFNs, each at 25% or 50% retained active-value budgets. The pretrained backbone remains BF16; cells and counted surrounding adapters/norms train, and dendritic nonlinearities are learnable. Each receives 8.39M recovery target presentations, followed by full GSM1024, MC6144 and C4/copy evaluation. A fresh explicit-greedy teacher reference is included. The GPU training/cold-reload canary passed and all six recoveries started. Low-bit quantization is deferred on these branches.

Final native values are assessed at BF16; the current recovery/evaluation engine uses FP32 arithmetic inside cells and FP32 norms. Runtime memory is therefore not inferred from BF16 stored-value bytes. Physical mask-free whole-model exports must still be qualified before a deployed-size claim.

The reference has 235,093,634,560 BF16 values (470.187 GB). Its MoE activates about 22B parameters per token. The target artifact must fit below 94.037 GB, including executable connectivity, quantization metadata, routing, retained weights and adapters. File bytes, resident memory and inference speed will be reported separately.

## Models

| Model | Role | Current state |
| --- | --- | --- |
| Qwen3-235B-A22B-Instruct-2507 | >100B teacher and dendritic + quantization target | Pinned download started; four-GPU qualification, teacher-context capture, 48 BF16-value expert pilots and full IFEval submitted |
| GPT-OSS-120B | Nearby-size MoE comparator; native MXFP4 | Canonical 65.249 GB weight files staging; benchmark port pending |
| GLM-4.5-Air | 106B / 12B-active MoE comparator | Source revision and metadata pinned; weights and runtime pending |
| Mixtral-8×22B-Instruct | About 141B total MoE comparator | Source revision and metadata pinned; weights and runtime pending |
| Qwen3.8-27B / Ternary Bonsai 2 27B | Dense teacher / Prism compression reference | Published scores already displayed; independent reproduction pending |
| Qwen/Bonsai 1.7B, 4B and 8B; native Qwen8B hybrids | Smaller-model comparison | Existing measured and published cohorts retained; additional IFEval runs in progress |

Total parameters, active parameters and bytes are different measurements. A 235B MoE is not treated as a dense 235B model. GPT-OSS is distributed with native low-bit weights; its file size is not presented as our compression achievement.

## Native and conventional controls

The >100B native pilots use the existing PopulationNetwork teacher-parity implementation, teacher-derived per-neuron supports and independent expert cells. The pending INT4-QAT pilot array was cancelled before starting and replaced by an unquantized study: 12.5%, 25%, 50% and 75% active projection-value budgets, including `[2,2]`, `[2,2,2,2]`, `[3,3,3]` and `[2,2,2,2,2]` trees. Matched-value dense controls remain secondary. Early, middle and late expert sites are represented. These local fits support engineering and allocation; whole-model composition, recovery and benchmarks remain the decisive steps.

At BF16 values, replacing every Qwen235 expert projects to about 3.36× at a 25%-value budget or 6.03× at a 12.5%-value budget, with retained attention/tables/routers and a connectivity allowance. Both are **arithmetic projections without measured quality or physical complete exports**. Coverage, cell size, larger chunks and attention are the main native compression variables. Quantization is a subsequent complementary stage, not the source of the headline native factor.

Prior hybrid results and conventional quantization comparisons remain in the evidence record. Useful existing runs continue; the priority change does not retroactively relabel their savings.

## Benchmarks and comparability

First suite: MMLU-Redux, MuSR, GSM8K, HumanEval+, IFEval and BFCL v3. The first large-teacher submission covers all 541 IFEval prompts, with the mean of strict prompt and strict instruction scores, nonthinking greedy decoding and a 4,096-token output budget. Its HF/SDPA/H200 cohort is separate from Prism’s published EvalScope/vLLM protocol.

Extensions: GPQA Diamond, MATH-500, MBPP+, IFBench, AA-LCR, AIME 2025/2026, LiveCodeBench v6, BigCodeBench and tau2-bench. SWE-bench Verified and Terminal-Bench 2.1 form a separate agentic suite. These additional large-model runs are not yet submitted. Vision benchmarks are not applicable to the text-only target and must not enter a common average as zeros.

Thinking budgets, prompting, scorer, sample count, hardware and provenance remain attached to each result. Prism’s rules-plus-judge numbers are not silently equated with rules-only results. Missing scores remain pending, failed measured outcomes stay visible, and no 5× claim is made before a reloadable complete artifact is evaluated.

Sources: [Qwen235 model card](https://huggingface.co/Qwen/Qwen3-235B-A22B-Instruct-2507), [GPT-OSS-120B](https://huggingface.co/openai/gpt-oss-120b), [GLM-4.5-Air](https://huggingface.co/zai-org/GLM-4.5-Air), [Mixtral](https://huggingface.co/mistralai/Mixtral-8x22B-Instruct-v0.1), [Prism Bonsai 2 27B](https://prismml.com/news/bonsai-2-27b).
