/**
 * Chapter 9's sourced matrix: how each public harness makes each choice, from its own
 * documentation (src/lib/agent/harnesses.ts). Every cell links its source; cells we infer
 * rather than read are marked. The last row is the policy the engine runs to imitate it.
 * Server Component; the table scrolls sideways inside its own focusable box on a phone.
 */
import {
  ACCESSED,
  CHOICES,
  HARNESSES,
  MATRIX,
  SOURCES,
  type SourceKey,
} from "@/lib/agent/harnesses";

export function HarnessMatrix(): JSX.Element {
  // number the sources in order of first use
  const order: SourceKey[] = [];
  for (const c of CHOICES)
    for (const h of HARNESSES) {
      const s = MATRIX[h.key][c].src;
      if (s && !order.includes(s)) order.push(s);
    }
  const num = (s: SourceKey) => order.indexOf(s) + 1;
  return (
    <figure data-testid="harness-matrix" className="my-6 min-w-0">
      <figcaption className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
        How the public harnesses choose (from their docs, accessed {ACCESSED})
      </figcaption>
      <div
        className="mt-2 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800"
        tabIndex={0}
        aria-label="The harness matrix (scrolls sideways)"
      >
        <table className="w-full min-w-[64rem] table-fixed border-collapse text-left text-[0.72rem] leading-snug">
          <thead className="bg-neutral-50 dark:bg-neutral-900">
            <tr>
              <th className="w-24 p-2 font-medium text-neutral-600 dark:text-neutral-400">
                Choice
              </th>
              {HARNESSES.map((h) => (
                <th
                  key={h.key}
                  scope="col"
                  className="p-2 font-semibold text-neutral-900 dark:text-neutral-100"
                >
                  {h.label}
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
                {HARNESSES.map((h) => {
                  const cell = MATRIX[h.key][c];
                  return (
                    <td
                      key={h.key}
                      data-cell={`${h.key}:${c}`}
                      className={`p-2 align-top text-neutral-800 dark:text-neutral-200 ${c === "Imitated as" ? "font-mono text-[0.68rem]" : ""}`}
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
            (accessed {ACCESSED})
          </li>
        ))}
      </ol>
    </figure>
  );
}
