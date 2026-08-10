/** Cafe local calendar (Ethiopia). Use for analytics windows and expense defaults. */
export const CAFE_TIME_ZONE = "Africa/Addis_Ababa";

/** YYYY-MM-DD in cafe local time. */
export function cafeDateISO(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CAFE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Cafe-local calendar date N days before `date` (approx via UTC ms; format in cafe TZ). */
export function cafeDateDaysAgo(days: number, date: Date = new Date()): string {
  return cafeDateISO(new Date(date.getTime() - days * 24 * 60 * 60 * 1000));
}
