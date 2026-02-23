/**
 * Get number of days in a given month.
 */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Get all dates in a given month as YYYY-MM-DD strings.
 */
export function getDatesInMonth(year: number, month: number): string[] {
  const total = daysInMonth(year, month);
  const dates: string[] = [];
  for (let d = 1; d <= total; d++) {
    const date = new Date(year, month - 1, d);
    dates.push(formatDate(date));
  }
  return dates;
}

/**
 * Format a Date object to YYYY-MM-DD string.
 */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse a YYYY-MM-DD string to Date object.
 */
export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Check if a date falls on specified weekend days.
 * @param date - The date to check
 * @param weekendDays - Array of day numbers (0=Sunday, 6=Saturday)
 */
export function isWeekend(date: Date, weekendDays: number[] = [0, 6]): boolean {
  return weekendDays.includes(date.getDay());
}

/**
 * Count working days in a month excluding weekends and holidays.
 */
export function countWorkingDays(
  year: number,
  month: number,
  holidays: string[],
  weekendDays: number[] = [0, 6]
): number {
  const dates = getDatesInMonth(year, month);
  const holidaySet = new Set(holidays);
  let count = 0;
  for (const dateStr of dates) {
    const date = parseDate(dateStr);
    if (isWeekend(date, weekendDays)) continue;
    if (holidaySet.has(dateStr)) continue;
    count++;
  }
  return count;
}

/**
 * Count working days between two dates (inclusive), excluding weekends and holidays.
 */
export function countWorkingDaysBetween(
  startDate: string,
  endDate: string,
  holidays: string[],
  weekendDays: number[] = [0, 6]
): number {
  const holidaySet = new Set(holidays);
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    if (!isWeekend(current, weekendDays) && !holidaySet.has(formatDate(current))) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}
