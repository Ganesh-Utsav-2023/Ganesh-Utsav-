/**
 * Centralized Date Formatting Utilities for Navyuvak Ganesh Mitra Mandal
 * 
 * Enforces Indian standard date formatting: DD-MM-YYYY (e.g. 14-09-2026)
 * across all user-facing interfaces, passes, PDFs, modals, and admin views,
 * while safely preserving ISO (YYYY-MM-DD) storage format in Firestore.
 */

/**
 * Converts a date string (ISO YYYY-MM-DD or full ISO timestamp) into user-facing DD-MM-YYYY format.
 * 
 * Examples:
 * - '2026-09-14' -> '14-09-2026'
 * - '2026-10-01' -> '01-10-2026'
 * - '2026-11-05' -> '05-11-2026'
 * - '2026-12-25' -> '25-12-2026'
 * - '14-09-2026' -> '14-09-2026' (idempotent)
 */
export function formatToIndianDate(dateStr?: string | null): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const trimmed = dateStr.trim();
  if (!trimmed) return '';

  // Check if it's already in DD-MM-YYYY format (e.g., 14-09-2026)
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    return trimmed;
  }

  // Check if it's in DD/MM/YYYY format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    return trimmed.replace(/\//g, '-');
  }

  // Check if it's YYYY-MM-DD (e.g., 2026-09-14)
  const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch;
    return `${day}-${month}-${year}`;
  }

  // Check if it's a parseable date string (e.g., ISO timestamp)
  try {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    }
  } catch {
    // Return original if parsing fails
  }

  return trimmed;
}

/**
 * Converts an ISO string or timestamp to 'DD-MM-YYYY, hh:mm A'
 */
export function formatToIndianDateTime(dateStr?: string | null): string {
  if (!dateStr || typeof dateStr !== 'string') return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return formatToIndianDate(dateStr);
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    const hoursStr = String(hours).padStart(2, '0');

    return `${day}-${month}-${year}, ${hoursStr}:${minutes} ${ampm}`;
  } catch {
    return formatToIndianDate(dateStr);
  }
}

/**
 * Formats a YYYY-MM-DD date into 'DD-MM-YYYY (Day)' or similar readable text
 * e.g., '2026-09-14' -> '14-09-2026 (Mon)'
 */
export function formatIndianDateWithDay(dateStr?: string | null): string {
  if (!dateStr) return '';
  const indianDate = formatToIndianDate(dateStr);
  
  // Extract YYYY-MM-DD for weekday calculation
  let d: Date | null = null;
  const ymdMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    const [, y, m, day] = ymdMatch;
    d = new Date(Number(y), Number(m) - 1, Number(day));
  } else {
    const dmyMatch = indianDate.match(/^(\d{2})-(\d{2})-(\d{4})/);
    if (dmyMatch) {
      const [, day, m, y] = dmyMatch;
      d = new Date(Number(y), Number(m) - 1, Number(day));
    }
  }

  if (d && !isNaN(d.getTime())) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${indianDate} (${dayNames[d.getDay()]})`;
  }

  return indianDate;
}

/**
 * Helper to convert user-input DD-MM-YYYY to standard ISO YYYY-MM-DD if needed
 */
export function parseIndianDateToIso(dateStr?: string | null): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const trimmed = dateStr.trim();
  const dmyMatch = trimmed.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return `${year}-${month}-${day}`;
  }
  return trimmed;
}
