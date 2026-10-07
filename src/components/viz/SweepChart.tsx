/**
 * Chapter 8's chart: success against the retry budget, from the engine's seeded sweep
 * (src/data/sweep_configs.json: 100 seeds per budget). Two measures per budget: the run
 * finished (the model gave a final answer), and it finished with its last test run
 * passing. A loop "nudge" lifts the first and not the second. Server Component: computed at
 * build time by the vendored engine; tests/unit/frames.test.ts checks the sweep against the
 * Python reference.
 */
import { serverSweep } from "@/lib/agent/values";
import { SWEEP_CONFIGS } from "@/lib/engine";
import { fmtMs, pct } from "@/lib/format";
import { OKABE_ITO } from "@/lib/viz/palette";

const MEASURES = [
  { key: "success", label: "finished", colour: OKABE_ITO.sky },
  {
    key: "verified_rate",
    label: "finished with the tests passing",
    colour: OKABE_ITO.green,
  },
] as const;

const POLICY_LABEL: Record<string, string> = {
  stop: "On a loop: stop the run",
  nudge: "On a loop: nudge the model",
};

export function SweepChart(): JSX.Element {
  const sweep = serverSweep("recovery");
  const n = SWEEP_CONFIGS.recovery.seeds;
  return (
    <figure
      data-testid="sweep-chart"
      className="my-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <figcaption className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
        Success against the retry budget ({n} seeded runs per bar)
      </figcaption>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 rounded bg-white px-2 py-1 text-[0.72rem] text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">
        {MEASURES.map((m) => (
          <li key={m.key} className="flex items-center gap-1">
            <span
              aria-hidden
              className="inline-block h-2.5 w-4 rounded-sm"
              style={{ backgroundColor: m.colour }}
            />
            {m.label}
          </li>
        ))}
      </ul>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {Object.entries(sweep).map(([policy, rows]) => (
          <div key={policy} className="min-w-0">
            <p className="text-[0.75rem] font-medium text-neutral-800 dark:text-neutral-200">
              {POLICY_LABEL[policy] ?? policy}
            </p>
            <table className="mt-1 w-full text-[0.72rem]">
              <thead className="sr-only">
                <tr>
                  <th>Retries</th>
                  <th>Finished / with passing tests</th>
                  <th>Mean time</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.retries as number} data-retries={r.retries}>
                    <th
                      scope="row"
                      className="w-14 pr-2 text-left font-normal text-neutral-700 dark:text-neutral-300"
                    >
                      {r.retries as number}{" "}
                      {r.retries === 1 ? "retry" : "retries"}
                    </th>
                    <td className="py-0.5">
                      {MEASURES.map((m) => (
                        <div key={m.key} className="flex items-center gap-1">
                          <div className="relative h-2.5 min-w-0 flex-1 rounded-sm bg-neutral-200 dark:bg-neutral-800">
                            <span
                              className="absolute inset-y-0 left-0 rounded-sm"
                              style={{
                                width: `${100 * (r[m.key] as number)}%`,
                                backgroundColor: m.colour,
                              }}
                            />
                          </div>
                          <span className="w-10 text-right font-mono text-neutral-800 dark:text-neutral-200">
                            {pct(r[m.key] as number)}
                          </span>
                        </div>
                      ))}
                    </td>
                    <td className="w-16 pl-2 text-right font-mono text-neutral-600 dark:text-neutral-400">
                      {fmtMs(r.mean_elapsed as number)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[0.7rem] text-neutral-600 dark:text-neutral-400">
        Right-hand column: the mean simulated run time. Every run is the
        scripted fix-the-test task with the shell failing 30% of attempts; the
        failure rate and the timings are illustrative.
      </p>
    </figure>
  );
}
