// /magazine — today's issue. We render it as a server component so the
// HTML is fully formed before hydration (good for SEO + first paint).
// The deterministic issue generator means SSR is cheap and cache-friendly.

import IssueView from "./_components/IssueView";
import { generateIssue } from "./_lib/issue";

// Refresh the today page every 15 minutes — the issue itself is stable
// across the day, but the inner client islands (standings, TV) fetch
// fresh data on mount anyway.
export const revalidate = 900;

export default function MagazinePage() {
  const today = new Date();
  today.setHours(12, 0, 0, 0); // anchor mid-day to avoid timezone edge cases
  const issue = generateIssue(today);
  return <IssueView issue={issue} referenceDate={today} />;
}
