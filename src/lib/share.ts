/**
 * How this site presents itself when a link to it is shared (brief 39): its name, track, one-line
 * claim and how it is checked, as drawn on the link-preview card (src/app/_og/card.tsx), and the
 * Open Graph and Twitter tags for each page. Every page passes its own path to `withShare`, so
 * a shared chapter link names that chapter, not the home page.
 */
import type { Metadata } from "next";

import { SITE_URL } from "@/lib/site";

export type Share = {
  name: string;
  /** The track in the site menu (null: the site sits outside the four tracks). */
  track: string | null;
  /** The card's top line, when it is not "<TRACK> TRACK". */
  kicker?: string;
  /** The one-line claim under the name on the card. */
  claim: string;
  /** How the site is checked, in one line (from the About page). */
  checkedShort: string;
  /** The site's colour on its card and favicon. */
  color: string;
  url: string;
  description: string;
  /** The site's card (the opengraph-image route); a page whose segment has its own card overrides it. */
  image?: string;
};

export const SHARE: Share = {
  name: "Agent Harnesses Explained",
  track: "Agents",
  claim: "What sits between a model and the world",
  checkedShort:
    "Python reference and the TS port in your browser agree token for token, float for float",
  color: "#dc2626",
  url: SITE_URL,
  description:
    "What sits between a model and the world: the agent loop, tool calls, the context budget, prompt caching, permissions, sub-agents, hooks and sandboxing, failure and recovery, harnesses compared, and cost and latency, each animated by a tested agent-loop simulator replaying recorded traces.",
};

/**
 * `m` plus Open Graph and Twitter tags for the page at `path` (titled as `m` titles it). A page
 * whose segment draws its own card (a chapter) passes `ownCard`, so that card is used instead of
 * the site's.
 */
export function withShare<M extends Metadata>(
  path: string,
  m: M,
  share: Share = SHARE,
  ownCard = false,
): M & Pick<Metadata, "openGraph" | "twitter"> {
  const t = m.title;
  const own =
    typeof t === "string"
      ? t
      : t && typeof t === "object" && "absolute" in t
        ? t.absolute
        : null;
  const title =
    own && !own.endsWith(share.name)
      ? `${own} · ${share.name}`
      : (own ?? share.name);
  const description =
    typeof m.description === "string" ? m.description : share.description;
  // a page's own openGraph replaces its parent's, card included, so name the site's card here
  const card = share.image ?? "/opengraph-image";
  const alt = `${share.name}: ${share.claim}`;
  return {
    ...m,
    openGraph: {
      title,
      description,
      url: path,
      siteName: share.name,
      type: path === "/" ? "website" : "article",
      locale: "en_GB",
      ...(ownCard
        ? {}
        : {
            images: [
              { url: card, width: 1200, height: 630, alt, type: "image/png" },
            ],
          }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(ownCard
        ? {}
        : {
            images: [
              { url: card.replace(/opengraph-image$/, "twitter-image"), alt },
            ],
          }),
    },
  };
}
