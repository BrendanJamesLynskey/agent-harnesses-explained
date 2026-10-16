/**
 * How this site presents itself when a link to it is shared (brief 39): its name, track, one-line
 * claim and how it is checked, as drawn on the link-preview card (src/app/_og/card.tsx), and the
 * Open Graph and Twitter tags for each page. Every page passes its own path to `withShare`, so
 * a shared chapter link names that chapter, not the home page.
 */
import type { Metadata } from "next";

import { SITE_URL } from "@/lib/site";

export const SHARE = {
  name: "Agent Harnesses Explained",
  /** The track in the site menu (null: the site sits outside the four tracks). */
  track: "Agents" as string | null,
  /** The one-line claim under the name on the card. */
  claim: "What sits between a model and the world",
  /** How the site is checked, in one line (from the About page). */
  checkedShort:
    "Python reference and the TS port in your browser agree token for token, float for float",
  /** The site's colour on its card and favicon. */
  color: "#dc2626",
  url: SITE_URL,
  description:
    "What sits between a model and the world: the agent loop, tool calls, the context budget, prompt caching, permissions, sub-agents, hooks and sandboxing, failure and recovery, harnesses compared, and cost and latency, each animated by a tested agent-loop simulator replaying recorded traces.",
} as const;

/** `m` plus Open Graph and Twitter tags for the page at `path` (titled as `m` titles it). */
export function withShare<M extends Metadata>(
  path: string,
  m: M,
): M & Pick<Metadata, "openGraph" | "twitter"> {
  const t = m.title;
  const own =
    typeof t === "string"
      ? t
      : t && typeof t === "object" && "absolute" in t
        ? t.absolute
        : null;
  const title =
    own && own !== SHARE.name ? `${own} · ${SHARE.name}` : SHARE.name;
  const description =
    typeof m.description === "string" ? m.description : SHARE.description;
  return {
    ...m,
    openGraph: {
      title,
      description,
      url: path,
      siteName: SHARE.name,
      type: path === "/" ? "website" : "article",
      locale: "en_GB",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}
