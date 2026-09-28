# Large-model compression campaign · September 28, 2026

Target: at least **5× complete-model compression** of **Qwen3-235B-A22B-Instruct-2507**, preserving useful benchmark performance. This is a target, not an achieved result.

The reference has 235,093,634,560 BF16 values (470.187 GB). Its MoE activates about 22B parameters per token. The target artifact must fit below 94.037 GB, including executable connectivity, quantization metadata, routing, retained weights and adapters. File bytes, resident memory and inference speed will be reported separately.

## Models

| Model | Role | Current state |
| --- | --- | --- |
| Qwen3-235B-A22B-Instruct-2507 | >100B teacher and dendritic + quantization target | Pinned download started; four-GPU qualification, teacher-context capture, 24 expert pilots and full IFEval submitted |
| GPT-OSS-120B | Nearby-size MoE comparator; native MXFP4 | Canonical 65.249 GB weight files staging; benchmark port pending |
| GLM-4.5-Air | 106B / 12B-active MoE comparator | Source revision and metadata pinned; weights and runtime pending |
| Mixtral-8×22B-Instruct | About 141B total MoE comparator | Source revision and metadata pinned; weights and runtime pending |
| Qwen3.8-27B / Ternary Bonsai 2 27B | Dense teacher / Prism compression reference | Published scores already displayed; independent reproduction pending |
| Qwen/Bonsai 1.7B, 4B and 8B; native Qwen8B hybrids | Smaller-model comparison | Existing measured and published cohorts retained; additional IFEval runs in progress |

Total parameters, active parameters and bytes are different measurements. A 235B MoE is not treated as a dense 235B model. GPT-OSS is distributed with native low-bit weights; its file size is not presented as our compression achievement.

## Native and conventional controls

The first native pilots use the existing PopulationNetwork teacher-parity implementation, teacher-derived per-neuron supports and independent expert cells. They compare 25% and 50% active projection-value budgets, `[2,2]` and `[2,2,2,2]` trees, and matched-value dense replacements at early, middle and late layers. These are local qualification experiments, not whole-model benchmarks.

Planned whole-model compositions span 25–100% expert coverage, with attention and tables also quantized. Routers and residual structure are retained. Arithmetic examples are 5.07× for INT3 projections with INT8 tables, and about 5.06–5.65× for INT4 plus 25%-value native cells at 37.5–50% expert coverage. These exclude final serialization overhead and have **no measured quality yet**. Complete exports and whole-model evaluation must replace the projections.

## Benchmarks and comparability

First suite: MMLU-Redux, MuSR, GSM8K, HumanEval+, IFEval and BFCL v3. The first large-teacher submission covers all 541 IFEval prompts, with the mean of strict prompt and strict instruction scores, nonthinking greedy decoding and a 4,096-token output budget. Its HF/SDPA/H200 cohort is separate from Prism’s published EvalScope/vLLM protocol.

Extensions: GPQA Diamond, MATH-500, MBPP+, IFBench, AA-LCR, AIME 2025/2026, LiveCodeBench v6, BigCodeBench and tau2-bench. SWE-bench Verified and Terminal-Bench 2.1 form a separate agentic suite. These additional large-model runs are not yet submitted. Vision benchmarks are not applicable to the text-only target and must not enter a common average as zeros.

Thinking budgets, prompting, scorer, sample count, hardware and provenance remain attached to each result. Prism’s rules-plus-judge numbers are not silently equated with rules-only results. Missing scores remain pending, failed measured outcomes stay visible, and no 5× claim is made before a reloadable complete artifact is evaluated.

Sources: [Qwen235 model card](https://huggingface.co/Qwen/Qwen3-235B-A22B-Instruct-2507), [GPT-OSS-120B](https://huggingface.co/openai/gpt-oss-120b), [GLM-4.5-Air](https://huggingface.co/zai-org/GLM-4.5-Air), [Mixtral](https://huggingface.co/mistralai/Mixtral-8x22B-Instruct-v0.1), [Prism Bonsai 2 27B](https://prismml.com/news/bonsai-2-27b).
