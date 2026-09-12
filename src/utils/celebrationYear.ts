/**
 * Utility functions for calculating the dynamic Utsav Celebration Year.
 * Navyuvak Ganesh Mitra Mandal was established in 2023.
 * Formula: celebratingYear = currentYear - 2023 + 1
 *
 * Examples:
 * - 2023 -> 1st year
 * - 2024 -> 2nd year
 * - 2025 -> 3rd year
 * - 2026 -> 4th year
 * - 2027 -> 5th year
 * - 2028 -> 6th year
 * - 2029 -> 7th year
 * - 2030 -> 8th year
 */

export const ESTABLISHMENT_YEAR = 2023;

/**
 * Returns the English ordinal suffix for any integer (1st, 2nd, 3rd, 4th, 11th, 21st, etc.).
 */
export function getOrdinalSuffix(n: number): string {
  const absN = Math.abs(Math.round(n));
  const mod10 = absN % 10;
  const mod100 = absN % 100;

  if (mod100 >= 11 && mod100 <= 13) {
    return `${absN}th`;
  }
  if (mod10 === 1) {
    return `${absN}st`;
  }
  if (mod10 === 2) {
    return `${absN}nd`;
  }
  if (mod10 === 3) {
    return `${absN}rd`;
  }
  return `${absN}th`;
}

/**
 * Calculates the numeric celebrating year based on the calendar year.
 * Formula: currentYear - 2023 + 1
 */
export function getCelebratingYearNumber(year: number = new Date().getFullYear()): number {
  return Math.max(1, year - ESTABLISHMENT_YEAR + 1);
}

/**
 * Calculates and returns the ordinal celebrating year string (e.g. "4th" for 2026).
 * Reusable throughout the website.
 */
export function getCelebratingYear(year: number = new Date().getFullYear()): string {
  const num = getCelebratingYearNumber(year);
  return getOrdinalSuffix(num);
}

/**
 * Returns the standard celebratory phrase with the dynamic year.
 * For 2026: "Celebrating our 4th year of divine devotion, socio-cultural seva, and grandeur."
 */
export function getCelebratingYearText(year: number = new Date().getFullYear()): string {
  const ordinalYear = getCelebratingYear(year);
  return `Celebrating our ${ordinalYear} year of divine devotion, socio-cultural seva, and grandeur.`;
}
