/**
 * Date utilities for IST (Asia/Kolkata, UTC+5:30).
 *
 * NEVER use `new Date().toISOString().split('T')[0]` for attendance "today" —
 * that gives UTC date which differs from IST date for any IST time between
 * midnight and 05:30.
 */

/** Returns today's date string in IST as 'YYYY-MM-DD' */
export function getISTDate(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

/** Returns current ISO timestamp adjusted to IST offset (+05:30) */
export function nowISO(): string {
  return new Date().toISOString();
}
