// French-locale date/time formatters shared across the UI.
//
// Before this module, every component reached for `new Date(iso)
// .toLocaleDateString("fr-FR", { ... })` with slightly different option
// objects. The result was ~30 ad-hoc formatter blocks, easy to drift apart
// (e.g. some sites used `day: "2-digit"`, others `day: "numeric"`). Pull
// the four shapes we actually need into named helpers; consumers pick the
// right name instead of re-spelling the options.

const FR = "fr-FR" as const;

type DateLike = string | number | Date;

function toDate(v: DateLike): Date | null {
  if (v instanceof Date) return v;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "22 mai" — day + short month, day padded to two digits. */
export function fmtDayMonth(v: DateLike): string {
  const d = toDate(v);
  return d ? d.toLocaleDateString(FR, { day: "2-digit", month: "short" }) : "";
}

/** "5 mai" — day + short month, day unpadded. Used in dense news lists
 * where the leading zero hurts more than it helps. */
export function fmtDayMonthShort(v: DateLike): string {
  const d = toDate(v);
  return d ? d.toLocaleDateString(FR, { day: "numeric", month: "short" }) : "";
}

/** "22 mai 2026" — day + short month + year. */
export function fmtDayMonthYear(v: DateLike): string {
  const d = toDate(v);
  return d ? d.toLocaleDateString(FR, { day: "2-digit", month: "short", year: "numeric" }) : "";
}

/** "lun. 22 mai" — weekday + day + short month. */
export function fmtWeekdayDayMonth(v: DateLike): string {
  const d = toDate(v);
  return d ? d.toLocaleDateString(FR, { weekday: "short", day: "2-digit", month: "short" }) : "";
}

/** "lun. 22 mai 2026" — weekday + day + short month + year. */
export function fmtWeekdayDayMonthYear(v: DateLike): string {
  const d = toDate(v);
  return d ? d.toLocaleDateString(FR, { weekday: "short", day: "2-digit", month: "short", year: "numeric" }) : "";
}

/** "20:45" — hour + minute, both padded. */
export function fmtTime(v: DateLike): string {
  const d = toDate(v);
  return d ? d.toLocaleTimeString(FR, { hour: "2-digit", minute: "2-digit" }) : "";
}

/** Compact "ago" label: "5min" / "3h" / "2j" / falls back to fmtDayMonth.
 *
 * Thresholds match the convention already used in MonClubTab fan/news lists.
 * Set `weeks` to false to fall back to absolute date at the 1-day mark
 * (the previous behaviour of a couple of call sites). */
export function fmtAgo(v: DateLike, opts: { weeks?: boolean } = {}): string {
  const d = toDate(v);
  if (!d) return "";
  const ms = Date.now() - d.getTime();
  if (ms < 3_600_000)   return `${Math.round(ms / 60_000)}min`;
  if (ms < 86_400_000)  return `${Math.round(ms / 3_600_000)}h`;
  if (opts.weeks !== false && ms < 604_800_000) return `${Math.round(ms / 86_400_000)}j`;
  return fmtDayMonth(d);
}
