/**
 * Utility functions for handling UTC dates from database and converting to local timezone
 */

/**
 * Safely parses any database date string (which may be UTC without 'Z', or with space instead of 'T')
 * into a valid JavaScript Date object in UTC.
 */
export function parseDbDate(dateStr: string | Date | null | undefined): Date | null {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;

  let str = String(dateStr).trim();
  if (!str) return null;

  // Replace space with 'T' if format is "YYYY-MM-DD HH:mm:ss"
  if (str.includes(' ') && !str.includes('T')) {
    str = str.replace(' ', 'T');
  }

  // If no timezone offset (Z or +HH:mm) is present, append 'Z' to treat database time as UTC
  if (!str.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(str)) {
    str += 'Z';
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Returns local YYYY-MM-DD string for a given Date or DB date string.
 */
export function getLocalDateStr(dateInput: string | Date | null | undefined): string {
  const d = parseDbDate(dateInput);
  if (!d) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Given local YYYY-MM-DD date range (e.g. from 2026-08-12 to 2026-08-12),
 * converts local start of day (00:00:00) and end of day (23:59:59.999) to UTC ISO strings.
 */
export function getUtcRangeForLocalDate(fromDateStr: string, toDateStr: string) {
  if (!fromDateStr || !toDateStr) return { fromUtc: '', toUtc: '' };

  const [fromY, fromM, fromD] = fromDateStr.split('-').map(Number);
  const [toY, toM, toD] = toDateStr.split('-').map(Number);

  if (!fromY || !fromM || !fromD || !toY || !toM || !toD) {
    return { fromUtc: fromDateStr, toUtc: toDateStr };
  }

  // Local start of fromDate (00:00:00.000)
  const startDate = new Date(fromY, fromM - 1, fromD, 0, 0, 0, 0);
  // Local end of toDate (23:59:59.999)
  const endDate = new Date(toY, toM - 1, toD, 23, 59, 59, 999);

  return {
    fromUtc: startDate.toISOString(),
    toUtc: endDate.toISOString(),
  };
}

/**
 * Formats a DB UTC timestamp into localized human-readable format (e.g., "Aug 12, 12:06 AM").
 */
export function formatDateLocalized(dateInput: string | Date | null | undefined): string {
  const d = parseDbDate(dateInput);
  if (!d) return '';
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStrFormatted = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return `${dateStrFormatted}, ${timeStr}`;
}
