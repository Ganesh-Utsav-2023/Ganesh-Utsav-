/**
 * Festival Date Calculator & Timezone Helpers for Shri Ganesh Utsav
 * Primary timezone: Asia/Kolkata (Jannod, Rampura, Madhya Pradesh, India)
 */

// Verified Ganesh Chaturthi (Bhadrapada Shukla Chaturthi) dates in IST (Asia/Kolkata)
const VERIFIED_GANESH_CHATURTHI_DATES: Record<number, string> = {
  2020: '2020-08-22',
  2021: '2021-09-10',
  2022: '2022-08-31',
  2023: '2023-09-19',
  2024: '2024-09-07',
  2025: '2025-08-27',
  2026: '2026-09-14',
  2027: '2027-09-04',
  2028: '2028-08-23',
  2029: '2029-09-11',
  2030: '2030-09-01',
  2031: '2031-09-20',
  2032: '2032-09-08',
  2033: '2033-08-28',
  2034: '2034-09-16',
  2035: '2035-09-05',
  2036: '2036-08-25',
  2037: '2037-09-13',
  2038: '2038-09-02',
  2039: '2039-08-22',
  2040: '2040-09-09',
};

/**
 * Calculates or looks up the exact Ganesh Chaturthi date for a given year.
 */
export function getGaneshChaturthiDate(year: number): string {
  if (VERIFIED_GANESH_CHATURTHI_DATES[year]) {
    return VERIFIED_GANESH_CHATURTHI_DATES[year];
  }

  // Fallback estimation algorithm based on Hindu Metonic cycle offset relative to 2026
  const baseYear = 2026;
  const baseDate = new Date(2026, 8, 14); // Sep 14, 2026
  const diffYears = year - baseYear;

  // Average lunar year is ~354.36 days (10.88 days shorter than solar year)
  // Intercalary month (Adhika Masa) added roughly every 2.7 years
  let daysShift = diffYears * 11;
  const adhikaMonths = Math.floor((diffYears * 12 + 4) / 33);
  daysShift -= adhikaMonths * 30;

  const estimatedDate = new Date(baseDate);
  estimatedDate.setDate(estimatedDate.getDate() + daysShift);

  const yyyy = estimatedDate.getFullYear();
  const mm = String(estimatedDate.getMonth() + 1).padStart(2, '0');
  const dd = String(estimatedDate.getDate()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Formats a Date object or YYYY-MM-DD into a date string + offset helper for 12 days festival duration.
 */
export function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  dateObj.setUTCDate(dateObj.getUTCDate() + days);

  const yyyy = dateObj.getUTCFullYear();
  const mm = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getUTCDate()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Returns complete calculated festival settings defaults for a year.
 */
export function getCalculatedFestivalPeriod(year: number) {
  const ganeshChaturthiDate = getGaneshChaturthiDate(year);
  const festivalStartDate = ganeshChaturthiDate; // Ganesh Chaturthi day 1
  const festivalEndDate = addDaysToDateStr(ganeshChaturthiDate, 11); // 12 days total (Chaturthi to Anant Chaturdashi)

  return {
    year,
    festivalName: `Shri Ganesh Utsav ${year}`,
    ganeshChaturthiDate,
    festivalStartDate,
    festivalEndDate,
    status: 'ACTIVE' as const,
  };
}

/**
 * Returns today's date strictly formatted as YYYY-MM-DD in Asia/Kolkata timezone (IST).
 */
export function getTodayInKolkata(): string {
  const now = new Date();
  const kolkataStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // Output format: YYYY-MM-DD
  return kolkataStr;
}

/**
 * Determines whether a date (YYYY-MM-DD) is in the past according to Asia/Kolkata timezone.
 */
export function isDateInPastInKolkata(dateStr: string): boolean {
  const todayKolkata = getTodayInKolkata();
  return dateStr < todayKolkata;
}

/**
 * Generates an array of date strings ("YYYY-MM-DD") between start and end dates inclusive.
 */
export function getDatesListBetween(startDateStr: string, endDateStr: string): string[] {
  const list: string[] = [];
  let curr = startDateStr;

  while (curr <= endDateStr) {
    list.push(curr);
    curr = addDaysToDateStr(curr, 1);
  }

  return list;
}

export * from './celebrationYear';
