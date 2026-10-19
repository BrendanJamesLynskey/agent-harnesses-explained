/**
 * The shared definitions page (/definitions, brief 44C): the terms the
 * sixteen sites define differently, or assume without defining, each with one
 * definition, one formula in one notation, the chapters that use it, and,
 * where a site's own wording or notation differs, why. Hosted here (the
 * Agents track's first site) and linked from every site's About page or
 * glossary. tests/unit/definitions.test.ts checks the formulas compile, the
 * links' shape, and every link into this site; the other sites' chapters
 * were checked to exist when the page was written (brief 44C report).
 */
export type Use = {
  /** The site's short name, as in the site menu. */
  site: string;
  /** The chapter's title, or what it does with the term. */
  what: string;
  href: string;
};

export type Definition = {
  /** The anchor on /definitions. */
  id: string;
  term: string;
  /** One definition, in a sentence or two. */
  definition: string;
  /** One formula, in this page's notation (KaTeX). */
  tex: string;
  /** The formula, read aloud (the equation's aria-label). */
  say: string;
  /** What each symbol is. */
  symbols: string;
  uses: readonly Use[];
  /** Where a site's wording or notation differs from this page, and why. */
  differs?: string;
  /** Where the term comes from. */
  source?: { label: string; href: string };
};

const DECODER = "https://transformer-decoder-explained.vercel.app/learn";
const TRAINING = "https://transformer-training-explained.vercel.app/training";
const SERVING = "https://llm-inference-explained.vercel.app/learn";
const ARCH = "https://llm-architectures-explained.vercel.app/learn";
const KERNELS = "https://gpu-kernels-explained.vercel.app/learn";
const NUMERICS = "https://numerics-explained.vercel.app/learn";
const SYSTOLIC = "https://systolic-arrays-explained.vercel.app/learn";
const TRADEOFFS = "https://inference-tradeoffs-explained.vercel.app/learn";
const RACKS = "https://ai-racks-explained.vercel.app/learn";
const ACCEL = "https://ai-accelerators-explained.vercel.app/learn";
const CONTEXT = "https://agent-context-explained.vercel.app/learn";
const ORCH = "https://agent-orchestration-explained.vercel.app/learn";
const PROTOCOLS = "https://agent-protocols-explained.vercel.app/learn";
const EVALS = "https://agent-evals-explained.vercel.app/learn";

export const DEFINITIONS: readonly Definition[] = [
  {
    id: "kv-cache",
    term: "KV cache, and its bytes per token κ",
    definition:
      "While a decoder generates, each attention layer keeps the keys and values of every earlier token so they are not recomputed. Its size grows by κ bytes for every token of context, for every sequence in the batch.",
    tex: "\\kappa = 2 \\cdot L \\cdot n_{kv} \\cdot d_h \\cdot b",
    say: "kappa equals 2 times L times n k v times d h times b",
    symbols:
      "L layers, n_kv key/value heads of dimension d_h, b bytes per value; the 2 is one key and one value.",
    uses: [
      {
        site: "Decoder",
        what: "why generation keeps a cache",
        href: `${DECODER}/07-sampling`,
      },
      {
        site: "Serving",
        what: "the cache in bytes per token",
        href: `${SERVING}/02-kv-cache`,
      },
      {
        site: "Architectures",
        what: "MHA, GQA, MQA and MLA per token",
        href: `${ARCH}/01-attention`,
      },
      {
        site: "Numerics",
        what: "a quantised cache",
        href: `${NUMERICS}/09-kv-cache`,
      },
      {
        site: "Accelerators",
        what: "the cache in a decode step's bytes",
        href: `${ACCEL}/02-gpus-the-baseline`,
      },
      {
        site: "Racks",
        what: "handing the cache from prefill to decode",
        href: `${RACKS}/08-disaggregated-inference`,
      },
      {
        site: "Trade-offs",
        what: "paged KV memory",
        href: `${TRADEOFFS}/02-paged-kv-and-preemption`,
      },
    ],
    differs:
      "Accelerators writes k_KV for κ. Architectures counts values per token, before multiplying by b. MLA caches one compressed latent per layer instead of 2 · n_kv · d_h values, so its κ is (d_c + d_h^R) · L · b.",
  },
  {
    id: "ttft-tpot",
    term: "TTFT, TPOT and ITL",
    definition:
      "Time to first token: from a request's arrival to its first output token (queueing plus prefill). Time per output token: the mean gap between its later tokens. Inter-token latency keeps every gap, so a single stall shows in its tail.",
    tex: "\\begin{gathered} \\mathrm{TTFT}_r = \\tau_{r,1} - a_r \\\\ \\mathrm{TPOT}_r = \\frac{\\tau_{r,n_r} - \\tau_{r,1}}{n_r - 1} \\end{gathered}",
    say: "TTFT of r equals tau r 1 minus a r; TPOT of r equals tau r n r minus tau r 1, over n r minus 1",
    symbols:
      "a_r the arrival of request r, τ_{r,i} the time of its i-th output token, n_r its output tokens.",
    uses: [
      {
        site: "Serving",
        what: "the serving metrics",
        href: `${SERVING}/10-serving-metrics`,
      },
      {
        site: "Trade-offs",
        what: "p99 TTFT and TPOT at a reference load",
        href: `${TRADEOFFS}/01-batching-and-chunked-prefill`,
      },
      {
        site: "Racks",
        what: "TTFT as queueing plus prefill",
        href: `${RACKS}/08-disaggregated-inference`,
      },
      {
        site: "Architectures",
        what: "TTFT under an SLO",
        href: `${ARCH}/09-encoder-decoder-and-ced`,
      },
      {
        site: "Harnesses",
        what: "a hosted API's time to first token",
        href: "/learn/10-cost-and-latency",
      },
    ],
    differs:
      "The Agents sites see a hosted API from the client's side: time to first token is a fixed overhead plus the uncached prompt at a prefill rate, with no queueing (Harnesses chapters 4 and 10, Context chapter 9). That is the server's TTFT at low load.",
  },
  {
    id: "goodput",
    term: "Goodput (two quantities, one name)",
    definition:
      "In serving, the rate of requests that met both latency targets (TTFT and TPOT SLOs): throughput counts everything served, goodput only what was served well enough. In training, the share of a job's wall-clock time that advances training, after checkpoints, failures and restarts.",
    tex: "\\begin{gathered} G_{\\text{serve}} = \\max \\lambda \\ \\text{ such that} \\\\ \\Pr[\\mathrm{TTFT} \\le T^{*} \\wedge \\mathrm{TPOT} \\le P^{*}] \\ge 0.9 \\\\[4pt] G_{\\text{train}} = \\frac{t_{\\text{training}}}{t_{\\text{wall clock}}} \\end{gathered}",
    say: "serving goodput is the largest arrival rate at which at least 90 percent of requests meet both SLOs; training goodput is time advancing training over wall-clock time",
    symbols:
      "λ the arrival rate, T* and P* the TTFT and TPOT targets; 0.9 is the share of requests that must meet both.",
    uses: [
      {
        site: "Serving",
        what: "requests a second that met both SLOs",
        href: `${SERVING}/10-serving-metrics`,
      },
      {
        site: "Trade-offs",
        what: "goodput per GPU at capacity",
        href: `${TRADEOFFS}/01-batching-and-chunked-prefill`,
      },
      {
        site: "Training",
        what: "the share of time a job trains",
        href: `${TRAINING}/15-running-a-real-job#t-goodput`,
      },
    ],
    differs:
      "Serving counts the requests a second that met both SLOs at the load offered; Trade-offs reports the highest rate at which 90% do, per GPU (DistServe's capacity form, the formula above). Training's goodput is a different quantity under the same name; read it from the site's context.",
    source: {
      label: "DistServe, arXiv:2401.09670",
      href: "https://arxiv.org/abs/2401.09670",
    },
  },
  {
    id: "bubble",
    term: "Pipeline bubble",
    definition:
      "With a model cut into p pipeline stages and a batch split into m micro-batches, stages sit idle while the pipeline fills and drains. The bubble is that idle time, given here as a share of the step.",
    tex: "\\begin{gathered} \\text{fraction} = \\frac{p - 1}{m + p - 1} \\\\ \\text{ratio} = \\frac{p - 1}{v\\,m} \\end{gathered}",
    say: "bubble fraction equals p minus 1 over m plus p minus 1; bubble ratio equals p minus 1 over v times m",
    symbols:
      "p stages, m micro-batches, v model chunks per device (interleaving; v = 1 without it).",
    uses: [
      {
        site: "Serving",
        what: "pipeline parallelism (GPipe)",
        href: `${SERVING}/09-parallelism`,
      },
      {
        site: "Trade-offs",
        what: "TP, PP and EP",
        href: `${TRADEOFFS}/08-tp-pp-ep`,
      },
      {
        site: "Training",
        what: "pipelines and interleaving",
        href: `${TRAINING}/12-model-parallelism#t-pipeline`,
      },
      {
        site: "Systolic",
        what: "an empty slot in the array's own pipeline",
        href: `${SYSTOLIC}/02-weight-stationary`,
      },
    ],
    differs:
      "Training quotes the ratio of idle time to useful work per device, (p − 1)/(v m), the Megatron-LM convention, which shows interleaving's gain directly. The share of the whole step is ratio / (1 + ratio): at p = 4, m = 4 the ratio is 0.75 and the fraction 3/7 ≈ 0.43. Systolic's bubble is the same idea one level down: a cycle in which a PE has no operand.",
    source: {
      label: "GPipe, arXiv:1811.06965",
      href: "https://arxiv.org/abs/1811.06965",
    },
  },
  {
    id: "roofline",
    term: "Roofline, arithmetic intensity, ridge point",
    definition:
      "A kernel or step that does F operations while moving B bytes runs no faster than the peak rate, and no faster than the bandwidth times its intensity. Below the ridge it is memory-bound; above it, compute-bound.",
    tex: "\\begin{gathered} P(I) = \\min(\\pi,\\ \\beta I) \\\\ I = \\frac{F}{B}, \\qquad I^{*} = \\frac{\\pi}{\\beta} \\end{gathered}",
    say: "P of I equals the minimum of pi and beta times I; I equals F over B; the ridge I star equals pi over beta",
    symbols:
      "π the peak rate (FLOP/s), β the bandwidth (bytes/s), F the operations, B the bytes moved, I the intensity (FLOP/byte), I* the ridge.",
    uses: [
      { site: "Kernels", what: "the roofline", href: `${KERNELS}/02-roofline` },
      {
        site: "Serving",
        what: "a decode step on the roofline",
        href: `${SERVING}/03-roofline`,
      },
      {
        site: "Accelerators",
        what: "the GPU baseline",
        href: `${ACCEL}/02-gpus-the-baseline`,
      },
      {
        site: "Racks",
        what: "the package's ridge",
        href: `${RACKS}/02-the-package`,
      },
      {
        site: "Systolic",
        what: "reuse at the array's edge",
        href: `${SYSTOLIC}/01-why-systolic`,
      },
    ],
    differs:
      "Kernels writes P_peak and W for π and β. Racks writes the ridge as F/B with F the dense peak and B the bandwidth (where Serving's B is bytes moved). Systolic counts bandwidth in words per cycle, so its intensity is MACs per word. The model is the same throughout.",
  },
  {
    id: "mfu",
    term: "MFU, model FLOPs utilisation",
    definition:
      "The arithmetic the model needs per second, counted from the tokens actually processed, as a share of the hardware's peak. Recomputed activations do not count, so it compares systems fairly.",
    tex: "\\begin{gathered} \\mathrm{MFU} = \\frac{f \\times \\text{tokens/s}}{\\text{peak FLOP/s}} \\\\ f = 6N + 12\\,L\\,H\\,Q\\,T \\end{gathered}",
    say: "MFU equals f times tokens per second, over the peak FLOP per second, where f, the model FLOPs per token, is 6 N plus 12 L H Q T",
    symbols:
      "f the model FLOPs per token: N parameters, and 12 L H Q T is attention's share per token (L layers, H heads of dimension Q, sequence length T), as in PaLM.",
    uses: [
      {
        site: "Training",
        what: "MFU defined",
        href: `${TRAINING}/11-data-parallelism#t-mfu`,
      },
      {
        site: "Training",
        what: "throughput and MFU of a real job",
        href: `${TRAINING}/15-running-a-real-job`,
      },
      {
        site: "Kernels",
        what: "the roofline beside MFU",
        href: `${KERNELS}/02-roofline`,
      },
      {
        site: "Serving",
        what: "utilisation on the roofline",
        href: `${SERVING}/03-roofline`,
      },
    ],
    differs:
      "Counting recomputed activations gives hardware FLOPs utilisation, which is higher. Other utilisations in the track are different quantities: a systolic array's share of useful MAC slots (Systolic chapter 4), the busy share of concurrency slots (Orchestration chapter 8) and a link's busy fraction (Training chapter 13).",
    source: {
      label: "PaLM, arXiv:2204.02311",
      href: "https://arxiv.org/abs/2204.02311",
    },
  },
  {
    id: "int-range",
    term: "INT range of a symmetric quantiser",
    definition:
      "A b-bit symmetric quantiser stores round(x / s), clipped to ±(2^(b−1) − 1): −127 to 127 for INT8, −7 to 7 for INT4. Two's complement's extra code, −2^(b−1), is left unused so the grid is symmetric about zero.",
    tex: "\\begin{gathered} q = \\operatorname{round}(x/s) \\\\ |q| \\le 2^{b-1}-1 \\ \\text{(clamped)} \\\\ s = \\frac{\\max|x|}{2^{b-1}-1} \\end{gathered}",
    say: "q equals round x over s, clamped to minus 2 to the b minus 1, minus 1, and 2 to the b minus 1, minus 1; s equals the largest magnitude over 2 to the b minus 1, minus 1",
    symbols:
      "b bits, s the scale (absmax here), x a value, q its stored integer.",
    uses: [
      {
        site: "Numerics",
        what: "quantisation basics",
        href: `${NUMERICS}/05-quantisation-basics`,
      },
      {
        site: "Serving",
        what: "weight quantisation",
        href: `${SERVING}/08-quantisation`,
      },
      {
        site: "Training",
        what: "quantised values and clipping",
        href: `${TRAINING}/09-mixed-precision#t-quantisation`,
      },
      {
        site: "Context",
        what: "int8 embedding vectors",
        href: `${CONTEXT}/03-dense-retrieval`,
      },
    ],
    differs:
      "The sites agree on the restricted range. Some kernels use the full range, −128 to 127 for INT8, which Numerics and Serving both mention.",
  },
  {
    id: "cache-rho",
    term: "Prompt cache: read multiplier ρ, write premium w, minimum length",
    definition:
      "A provider that keeps the processed prefix of recent prompts charges a cache read ρ times the input price and a cache write w times it, and caches only prefixes of at least L_min tokens. A prefix written once and read k times pays when k passes the bound.",
    tex: "\\begin{gathered} \\text{cost} = p_i\\big(\\rho\\,h N + w\\,(1-h)\\,N\\big) + p_o M \\\\ \\text{the write pays when } k > \\frac{w-1}{1-\\rho} \\end{gathered}",
    say: "cost equals p i times rho h N plus w times 1 minus h times N, plus p o M; the write pays when k is greater than w minus 1 over 1 minus rho",
    symbols:
      "p_i and p_o the input and output prices, N prompt tokens (at least L_min to be cached), a share h of them read from the cache, M output tokens.",
    uses: [
      {
        site: "Harnesses",
        what: "prompt caching, derived",
        href: "/learn/04-prompt-caching",
      },
      {
        site: "Harnesses",
        what: "why a sub-agent can cost more",
        href: "/learn/06-sub-agents",
      },
      {
        site: "Context",
        what: "long context or retrieval",
        href: `${CONTEXT}/09-long-context-or-retrieval`,
      },
      {
        site: "Orchestration",
        what: "cached prefixes in multi-agent patterns",
        href: `${ORCH}/05-multi-agent-patterns`,
      },
      {
        site: "Trade-offs",
        what: "the server's side: prefix caching",
        href: `${TRADEOFFS}/03-prefix-caching`,
      },
    ],
    differs:
      "ρ means other things elsewhere in the track: a within-task correlation (Evals chapters 1, 3, 5 and 8), a load λ/μ (Orchestration chapter 8) or a link's busy fraction (Training chapter 13), a compression ratio (Serving chapter 12) and air density (Racks chapter 7). On this page ρ is always the cache read multiplier. Trade-offs' prefix caching is the same reuse seen by the server, in prefill time saved rather than price.",
  },
  {
    id: "context-rot",
    term: "Context rot",
    definition:
      "A model's use of its context gets worse as the context grows, and worse again when the part that matters sits in the middle. None of the sites measures it on a real model; each that needs it uses a labelled stand-in.",
    tex: "\\begin{gathered} \\text{Context: } p(x) \\text{ U-shaped in } x \\in [0, 1] \\\\ \\text{Orchestration: } \\\\ p_i = p_0 - \\beta\\,(n_i - 4\\text{K})^{+} \\end{gathered}",
    say: "Context models the chance of using an answer as a U-shaped function of its position; Orchestration models a call's accuracy as p 0 minus beta times the prompt tokens beyond 4 thousand",
    symbols:
      "x the answer's relative position in the prompt; n_i call i's prompt tokens, p_0 its accuracy up to 4,000 tokens, β the loss per token beyond.",
    uses: [
      {
        site: "Context",
        what: "lost in the middle, and where to put the best chunk",
        href: `${CONTEXT}/06-packing-the-window`,
      },
      {
        site: "Context",
        what: "the window as working memory",
        href: `${CONTEXT}/01-the-window-is-the-working-memory`,
      },
      {
        site: "Orchestration",
        what: "accuracy that falls with context",
        href: `${ORCH}/05-multi-agent-patterns`,
      },
      {
        site: "Orchestration",
        what: "choosing a pattern",
        href: `${ORCH}/09-choosing-a-pattern`,
      },
      {
        site: "Harnesses",
        what: "keeping the window small",
        href: "/learn/03-the-context-budget",
      },
    ],
    differs:
      "The stand-ins differ on purpose and each says so: a U in position (Context, after Liu et al.) and a linear fall in length (Orchestration). The Harnesses chapters assume a model reads its whole context perfectly. The shape for your model and task is something to measure.",
    source: {
      label:
        "Liu et al., Lost in the Middle, arXiv:2307.03172; Chroma, Context Rot (2025)",
      href: "https://research.trychroma.com/context-rot",
    },
  },
  {
    id: "percentiles",
    term: "Latency percentiles (p50, p95, p99)",
    definition:
      "The latency below which a given share of requests fall: p50 the typical request, p95 and p99 the tail users remember. Two estimators are in use in the track.",
    tex: "\\begin{gathered} \\text{nearest rank: } x_{(\\lceil q n \\rceil)} \\\\ \\text{linear: } x_{(\\lfloor k \\rfloor)} + (k - \\lfloor k \\rfloor)\\, \\Delta_k \\\\ k = (n-1)\\,q,\\quad \\Delta_k = x_{(\\lceil k \\rceil)} - x_{(\\lfloor k \\rfloor)} \\end{gathered}",
    say: "nearest rank takes the order statistic at the ceiling of q n; linear interpolates between the order statistics around k equals n minus 1 times q",
    symbols:
      "x_(1) ≤ … ≤ x_(n) the sorted latencies (nearest rank counts from 1, linear from 0), q the share (0.95 for p95).",
    uses: [
      {
        site: "Serving",
        what: "why percentiles, and why p99",
        href: `${SERVING}/10-serving-metrics`,
      },
      {
        site: "Trade-offs",
        what: "p99 inter-token latency under each batch policy",
        href: `${TRADEOFFS}/01-batching-and-chunked-prefill`,
      },
      {
        site: "Racks",
        what: "p99 TTFT and TPOT as the pools are sized",
        href: `${RACKS}/08-disaggregated-inference`,
      },
      {
        site: "Orchestration",
        what: "the tail as load grows",
        href: `${ORCH}/08-running-at-scale`,
      },
    ],
    differs:
      "Serving, Trade-offs and Racks interpolate (numpy's default); Orchestration takes the nearest rank, so its p95 is always an observed latency. Over hundreds of requests the two differ by less than the gap between neighbouring observations.",
  },
  {
    id: "littles-law",
    term: "Little's law",
    definition:
      "In any stable system, the average number of items inside equals the arrival rate times the average time each spends inside. It needs no assumption about arrivals or service times.",
    tex: "L = \\lambda W",
    say: "L equals lambda W",
    symbols:
      "L the mean number in the system, λ the arrival rate, W the mean time in the system.",
    uses: [
      {
        site: "Serving",
        what: "a check on any simulator",
        href: `${SERVING}/10-serving-metrics`,
      },
      {
        site: "Orchestration",
        what: "workflows in the system",
        href: `${ORCH}/08-running-at-scale`,
      },
      {
        site: "Protocols",
        what: "streams held open while users think",
        href: `${PROTOCOLS}/05-sampling-and-elicitation`,
      },
    ],
  },
  {
    id: "pass-at-k",
    term: "pass@k and pass^k",
    definition:
      "pass@k: of k tries at a task, does some one pass? pass^k: do all k pass? Both are estimated without bias from n ≥ k samples of which c pass.",
    tex: "\\begin{gathered} \\text{pass@}k = 1 - \\frac{\\binom{n-c}{k}}{\\binom{n}{k}} \\\\ \\text{pass}^k = \\frac{\\binom{c}{k}}{\\binom{n}{k}} \\end{gathered}",
    say: "pass at k equals 1 minus n minus c choose k over n choose k; pass hat k equals c choose k over n choose k",
    symbols: "n samples of a task, c of them passing, averaged over tasks.",
    uses: [
      {
        site: "Evals",
        what: "pass@k and pass^k",
        href: `${EVALS}/03-pass-at-k-and-pass-hat-k`,
      },
      {
        site: "Evals",
        what: "the harness effect",
        href: `${EVALS}/08-the-harness`,
      },
    ],
  },
];
