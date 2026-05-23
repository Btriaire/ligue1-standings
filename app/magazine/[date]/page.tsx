// /magazine/[date] — archived issue. The date param is a YYYY-MM-DD
// string; we re-derive the issue deterministically from the date hash,
// so a permalink shared today still resolves to the same content
// tomorrow. Returns a 404 if the date string is malformed or in the
// future (we don't want bots crawling endless future-issue URLs).

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import IssueView from "../_components/IssueView";
import { generateIssue, parseYmd } from "../_lib/issue";

interface Params { date: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { date } = await params;
  const parsed = parseYmd(date);
  if (!parsed) return { title: "Numéro introuvable — Foot Magazine" };
  const issue = generateIssue(parsed);
  return {
    title: `Foot Magazine — ${issue.formattedDate}`,
    description: issue.hero.title,
  };
}

export default async function ArchivedIssue({ params }: { params: Promise<Params> }) {
  const { date } = await params;
  const parsed = parseYmd(date);
  if (!parsed) notFound();

  // Cap the archive at today — we don't render placeholder future issues
  // even though the generator would happily produce one.
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  if (parsed.getTime() > now.getTime()) notFound();

  const issue = generateIssue(parsed);
  const referenceDate = new Date();
  referenceDate.setHours(12, 0, 0, 0);
  return <IssueView issue={issue} referenceDate={referenceDate} showSiblingNav />;
}
