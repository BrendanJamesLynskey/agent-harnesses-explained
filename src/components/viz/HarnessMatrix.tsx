/**
 * Chapter 9's sourced matrix: how each public harness (and, since brief 43, two agent SDKs)
 * makes each choice, from its own documentation (src/lib/agent/harnesses.ts). Every cell
 * links its source; cells we infer rather than read are marked. The last row is the policy
 * the engine runs to imitate it. Beside it, what the matrix and the imitation do not show.
 * Server Component; the table scrolls sideways inside its own focusable box on a phone.
 */
import {
  ACCESSED,
  ACCESSED_SDK,
  CHOICES,
  COLUMNS,
  MATRIX,
  SDKS,
  SOURCES,
  type SourceKey,
} from "@/lib/agent/harnesses";

const SDK_KEYS = new Set<string>(SDKS.map((s) => s.key));
const accessedOf = (s: SourceKey) =>
  s.startsWith("sdk-") || s.startsWith("oa-") ? ACCESSED_SDK : ACCESSED;

/** What the matrix and the imitation leave out, so the rows are not over-read. */
const NOT_SHOWN: { text: string; href?: string; link?: string }[] = [
  {
    text: "How good each product is. One scripted model takes the same turns in every row, so the imitation ranks what the harness does around a model (mostly how many approvals it asks for), not the model, prompts or tools that dominate real results.",
    href: "https://agent-evals-explained.vercel.app/learn/08-the-harness",
    link: "Evals: one model, many harnesses",
  },
  {
    text: "Real people. The simulated human answers in 3 to 9 seconds and approves every question; real approvals get slower and less careful as they pile up.",
    href: "https://agent-security-explained.vercel.app/learn/08-humans-in-the-loop",
    link: "Security: humans in the loop",
  },
  {
    text: "Anything beyond the documented defaults: every product is configurable, and the rows change with each release.",
  },
  {
    text: "Real bills. One list price for every row, on Qwen2.5 token counts, not each product's own model and tokenizer.",
  },
  {
    text: "The two SDK columns in the animation: they are libraries you build a harness with, so there is no default to imitate.",
  },
];

export function HarnessMatrix(): JSX.Element {
  // number the sources in order of first use
  const order: SourceKey[] = [];
  for (const c of CHOICES)
    for (const h of COLUMNS) {
      const s = MATRIX[h.key][c].src;
      if (s && !order.includes(s)) order.push(s);
    }
  const num = (s: SourceKey) => order.indexOf(s) + 1;
  return (
    <figure data-testid="harness-matrix" className="my-6 min-w-0">
      <figcaption className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
        How the public harnesses and two agent SDKs choose (from their docs,
        accessed {ACCESSED}; SDK columns {ACCESSED_SDK})
      </figcaption>
      <div
        className="mt-2 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800"
        tabIndex={0}
        aria-label="The harness matrix (scrolls sideways)"
      >
        <table className="w-full min-w-[80rem] table-fixed border-collapse text-left text-[0.72rem] leading-snug">
          <thead className="bg-neutral-50 dark:bg-neutral-900">
            <tr>
              <th className="w-24 p-2 font-medium text-neutral-600 dark:text-neutral-400">
                Choice
              </th>
              {COLUMNS.map((h) => (
                <th
                  key={h.key}
                  scope="col"
                  className={`p-2 font-semibold text-neutral-900 dark:text-neutral-100 ${SDK_KEYS.has(h.key) ? "border-l-2 border-neutral-300 dark:border-neutral-600" : ""}`}
                >
                  {h.label}
                  {SDK_KEYS.has(h.key) && (
                    <span className="block text-[0.65rem] font-normal text-neutral-600 dark:text-neutral-400">
                      agent SDK
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CHOICES.map((c) => (
              <tr
                key={c}
                className={
                  c === "Imitated as"
                    ? "bg-indigo-50 dark:bg-indigo-950/40"
                    : "border-t border-neutral-200 dark:border-neutral-800"
                }
              >
                <th
                  scope="row"
                  className="p-2 align-top font-medium text-neutral-700 dark:text-neutral-300"
                >
                  {c}
                </th>
                {COLUMNS.map((h) => {
                  const cell = MATRIX[h.key][c];
                  return (
                    <td
                      key={h.key}
                      data-cell={`${h.key}:${c}`}
                      className={`p-2 align-top text-neutral-800 dark:text-neutral-200 ${c === "Imitated as" ? "font-mono text-[0.68rem]" : ""} ${SDK_KEYS.has(h.key) ? "border-l-2 border-neutral-300 dark:border-neutral-600" : ""}`}
                    >
                      {cell.text}
                      {cell.inferred && (
                        <span className="ml-1 rounded bg-neutral-200 px-1 text-[0.65rem] text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100">
                          inferred
                        </span>
                      )}
                      {cell.src && (
                        <sup className="ml-0.5">
                          <a
                            href={SOURCES[cell.src].url}
                            className="focus-ring rounded text-accent underline dark:text-indigo-300"
                            aria-label={`Source ${num(cell.src)}: ${SOURCES[cell.src].title}`}
                          >
                            [{num(cell.src)}]
                          </a>
                        </sup>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[0.72rem] font-medium text-neutral-700 dark:text-neutral-300">
        The last row is a policy imitation, not the product: the engine&apos;s
        settings closest to each harness&apos;s documented defaults. The
        products do much more than these rows say, and change often.
      </p>
      <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-[0.72rem] text-neutral-700 dark:text-neutral-300">
        {order.map((s) => (
          <li key={s}>
            <a
              href={SOURCES[s].url}
              className="focus-ring rounded text-accent underline dark:text-indigo-300"
            >
              {SOURCES[s].title}
            </a>{" "}
            (accessed {accessedOf(s)})
          </li>
        ))}
      </ol>
      <aside
        data-testid="harness-not-shown"
        aria-label="What this does not show"
        className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-[0.78rem] text-neutral-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-neutral-200"
      >
        <p className="font-semibold text-neutral-900 dark:text-neutral-100">
          What this does not show
        </p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          {NOT_SHOWN.map((x) => (
            <li key={x.text}>
              {x.text}
              {x.href && (
                <>
                  {" "}
                  <a
                    href={x.href}
                    className="focus-ring rounded text-accent underline dark:text-indigo-300"
                  >
                    {x.link}
                  </a>
                  .
                </>
              )}
            </li>
          ))}
        </ul>
      </aside>
    </figure>
  );
}
