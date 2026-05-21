// Weekly cron — runs the veracity check, logs a summary, and (if configured)
// posts a Discord/Slack webhook when mismatches are found. The full report is
// fetched on-demand from /api/club-veracity by the admin UI.

import { NextResponse } from "next/server";
import { checkAllClubs } from "@/app/lib/clubVeracity";

export const maxDuration = 120;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const reports = await checkAllClubs();
  const mismatched = reports.filter(r => !r.ok);

  // Compact summary line per mismatched club: "OM: entraineur Habib Beye ≠ Foo".
  const lines = mismatched.map(r => {
    const diffs = r.checks.filter(c => !c.match && c.expected).map(c =>
      `${c.field}: "${c.expected}" ≠ "${c.actual ?? "—"}"`
    );
    return `[${r.league}] ${r.name} → ${diffs.join("; ") || r.error || "?"}`;
  });

  // Optional Discord/Slack webhook for proactive alerts. Skip silently if unset.
  const hookUrl = process.env.VERACITY_WEBHOOK_URL;
  if (hookUrl && mismatched.length > 0) {
    try {
      await fetch(hookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `🔎 Club veracity check: ${mismatched.length}/${reports.length} clubs out of date\n\n${lines.join("\n")}`,
        }),
      });
    } catch {
      // Non-fatal — log endpoint failures shouldn't break the cron response.
    }
  }

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    total: reports.length,
    mismatched: mismatched.length,
    summary: lines,
  });
}
