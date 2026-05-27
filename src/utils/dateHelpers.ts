/**
 * Date helpers that treat YYYY-MM-DD strings as pure dates (no timezone shift).
 * Avoid using `new Date('YYYY-MM-DD')` directly — JS parses it as UTC midnight
 * which often rolls back a day in negative-offset timezones (e.g. America/Sao_Paulo).
 */

/** Returns today's date as `YYYY-MM-DD` in the user's local timezone. */
export const todayISO = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Parse a `YYYY-MM-DD` (or ISO) string into a local `Date` at 00:00 local time.
 * Safe replacement for `new Date('YYYY-MM-DD')`.
 */
export const parseDateOnly = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  const raw = String(dateStr).slice(0, 10);
  const [y, m, d] = raw.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

/** Format a `YYYY-MM-DD` string as `DD/MM/YYYY` without timezone gotchas. */
export const formatDateBR = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  const raw = String(dateStr).slice(0, 10);
  const [y, m, d] = raw.split('-');
  if (!y || !m || !d) return raw;
  return `${d}/${m}/${y}`;
};

/** Convert a Date into `YYYY-MM-DD` in local time. */
export const toDateOnlyString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
