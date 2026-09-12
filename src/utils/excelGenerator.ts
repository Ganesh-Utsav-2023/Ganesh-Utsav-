import * as XLSX from 'xlsx';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig.ts';
import { Booking, ChandaReceipt, ExpenseRecord, AartiSlot } from '../types/index.ts';
import { formatToIndianDate } from './dateUtils.ts';
import { getCalculatedFestivalPeriod, getDatesListBetween } from './festivalCalculator.ts';
import { DAILY_AARTI_CAPACITY } from '../lib/slotsService.ts';

/**
 * Normalizes time string format
 */
function formatSlotTime(b: Booking): string {
  if (b.slot_start_time && b.slot_end_time) {
    return `${b.slot_start_time} – ${b.slot_end_time}`;
  }
  return '07:30 PM – 09:00 PM';
}

/**
 * Formats ISO date string to clean readable date-time in IST
 */
function formatTimestamp(isoStr?: string): string {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch (e) {
    return isoStr;
  }
}

/**
 * Helper to safely calculate auto column widths
 */
function calculateColumnWidths(headers: string[], rows: Record<string, any>[]): { wch: number }[] {
  return headers.map((key) => {
    let maxLen = key.length;
    rows.forEach((row) => {
      const val = String(row[key] ?? '');
      if (val.length > maxLen) {
        maxLen = val.length;
      }
    });
    return { wch: Math.min(Math.max(maxLen + 3, 12), 42) };
  });
}

/**
 * Generates and downloads the centralized master Excel workbook (.xlsx)
 * containing all 5 sheets:
 * 1. Aarti Bookings
 * 2. Chanda / Donations
 * 3. Spending / Expenses
 * 4. Financial Summary
 * 5. Aarti Summary
 */
export async function generateUnifiedAdminExcel(userRole: string = 'admin'): Promise<{
  success: boolean;
  filename: string;
  bookingsCount: number;
  chandaCount: number;
  expenseCount: number;
}> {
  // Security Check: Only admin users can export full mandal data
  if (userRole !== 'admin') {
    const errorMsg = 'Security Violation: Only authenticated Mandal Admin accounts are authorized to export portal data.';
    alert(errorMsg);
    throw new Error(errorMsg);
  }

  // 1. Fetch live data from all Firestore collections
  let liveBookings: Booking[] = [];
  let liveChanda: ChandaReceipt[] = [];
  let liveExpenses: ExpenseRecord[] = [];
  let liveSlots: AartiSlot[] = [];

  try {
    const [bookingsSnap, chandaSnap, expensesSnap, slotsSnap] = await Promise.all([
      getDocs(collection(db, 'bookings')).catch(() => ({ docs: [] })),
      getDocs(collection(db, 'chandaReceipts')).catch(() => ({ docs: [] })),
      getDocs(collection(db, 'expenses')).catch(() => ({ docs: [] })),
      getDocs(collection(db, 'aartiSlots')).catch(() => ({ docs: [] })),
    ]);

    liveBookings = bookingsSnap.docs.map((d) => ({ ...(d.data() as any), id: d.id, doc_id: d.id }));
    liveChanda = chandaSnap.docs.map((d) => ({ ...(d.data() as any), id: d.id, receiptId: d.id }));
    liveExpenses = expensesSnap.docs.map((d) => ({ ...(d.data() as any), id: d.id, expenseId: d.id }));
    liveSlots = slotsSnap.docs.map((d) => ({ ...(d.data() as any), id: d.id, doc_id: d.id }));
  } catch (err: any) {
    console.error('Error fetching live data for Excel export:', err);
    throw new Error('Failed to retrieve live data from Firestore. Please check your internet connection.');
  }

  // Sort Bookings: newest first
  liveBookings.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  // Sort Chanda: newest first
  liveChanda.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  // Sort Expenses: newest first
  liveExpenses.sort((a, b) => new Date(b.expenseDate || b.createdAt || 0).getTime() - new Date(a.expenseDate || a.createdAt || 0).getTime());

  // 2. Build Sheet 1: Aarti Bookings
  const bookingHeaders = [
    'Booking ID',
    'Token Number',
    'Pass ID',
    'Devotee Name',
    'Mobile Number',
    'Email',
    'Aarti Date',
    'Aarti Time',
    'Number of People',
    'Status',
    'Booking Source',
    'Address',
    'Special Request',
    'Created At',
    'Updated At',
  ];

  const bookingRows = liveBookings.map((b) => {
    const passCode = b.passId || b.pass_id || (b.status === 'ACCEPTED' ? `GA-PASS-${b.booking_id}` : '-');
    const bDate = b.slot_date || (b as any).date || '';
    return {
      'Booking ID': b.booking_id || '-',
      'Token Number': b.tokenNumber ?? b.token_number ?? '-',
      'Pass ID': passCode,
      'Devotee Name': b.devotee_name || '-',
      'Mobile Number': b.phone || '-',
      'Email': b.email || '-',
      'Aarti Date': bDate ? formatToIndianDate(bDate) : '-',
      'Aarti Time': formatSlotTime(b),
      'Number of People': Number(b.number_of_people) || 1,
      'Status': b.status || 'PENDING',
      'Booking Source': b.booking_source || 'ONLINE',
      'Address': b.address || '-',
      'Special Request': b.special_request || '-',
      'Created At': formatTimestamp(b.created_at),
      'Updated At': formatTimestamp(b.updated_at),
    };
  });

  const wsBookings = bookingRows.length > 0
    ? XLSX.utils.json_to_sheet(bookingRows, { header: bookingHeaders })
    : XLSX.utils.aoa_to_sheet([bookingHeaders]);

  wsBookings['!cols'] = calculateColumnWidths(bookingHeaders, bookingRows);
  if (bookingRows.length > 0) {
    const lastColLetter = XLSX.utils.encode_col(bookingHeaders.length - 1);
    wsBookings['!autofilter'] = { ref: `A1:${lastColLetter}${bookingRows.length + 1}` };
  }
  (wsBookings as any)['!freeze'] = { xSplit: 0, ySplit: 1, topRow: 1, activePane: 'bottomLeft', state: 'frozen' };

  // 3. Build Sheet 2: Chanda / Donations
  const chandaHeaders = [
    'Receipt Number',
    'Donor Name',
    'Mobile Number',
    'Amount',
    'Amount in Words',
    'Payment Mode',
    'Donation Date',
    'Collected By',
    'Purpose',
    'Created At',
    'Updated At',
  ];

  const chandaRows = liveChanda.map((r) => ({
    'Receipt Number': r.receiptNumber || '-',
    'Donor Name': r.donorName || '-',
    'Mobile Number': r.mobileNumber || '-',
    'Amount': Number(r.amount) || 0,
    'Amount in Words': r.amountInWords || '-',
    'Payment Mode': (r.paymentMode || 'CASH').replace('_', ' '),
    'Donation Date': r.donationDate ? formatToIndianDate(r.donationDate) : '-',
    'Collected By': r.collectedBy || '-',
    'Purpose': r.purpose || 'Ganesh Utsav Seva',
    'Created At': formatTimestamp(r.createdAt),
    'Updated At': formatTimestamp(r.updatedAt),
  }));

  const wsChanda = chandaRows.length > 0
    ? XLSX.utils.json_to_sheet(chandaRows, { header: chandaHeaders })
    : XLSX.utils.aoa_to_sheet([chandaHeaders]);

  wsChanda['!cols'] = calculateColumnWidths(chandaHeaders, chandaRows);
  if (chandaRows.length > 0) {
    const lastColLetter = XLSX.utils.encode_col(chandaHeaders.length - 1);
    wsChanda['!autofilter'] = { ref: `A1:${lastColLetter}${chandaRows.length + 1}` };
  }
  (wsChanda as any)['!freeze'] = { xSplit: 0, ySplit: 1, topRow: 1, activePane: 'bottomLeft', state: 'frozen' };

  // 4. Build Sheet 3: Spending / Expenses
  // STRICT REQUIREMENT: Include ONLY the 9 specified columns. Do NOT include Spent On / Item, Detailed Summary, Description / Details, Internal Notes.
  const expenseHeaders = [
    'Expense Number',
    'Expense Date',
    'Category',
    'Amount',
    'Payment Mode',
    'Paid To / Vendor',
    'Recorded By',
    'Created At',
    'Updated At',
  ];

  const expenseRows = liveExpenses.map((e) => ({
    'Expense Number': e.expenseNumber || '-',
    'Expense Date': e.expenseDate ? formatToIndianDate(e.expenseDate) : '-',
    'Category': e.category || 'Miscellaneous',
    'Amount': Number(e.amount) || 0,
    'Payment Mode': (e.paymentMode || 'CASH').replace('_', ' '),
    'Paid To / Vendor': e.paidTo || '-',
    'Recorded By': e.recordedBy || 'Admin',
    'Created At': formatTimestamp(e.createdAt),
    'Updated At': formatTimestamp(e.updatedAt),
  }));

  const wsExpenses = expenseRows.length > 0
    ? XLSX.utils.json_to_sheet(expenseRows, { header: expenseHeaders })
    : XLSX.utils.aoa_to_sheet([expenseHeaders]);

  wsExpenses['!cols'] = calculateColumnWidths(expenseHeaders, expenseRows);
  if (expenseRows.length > 0) {
    const lastColLetter = XLSX.utils.encode_col(expenseHeaders.length - 1);
    wsExpenses['!autofilter'] = { ref: `A1:${lastColLetter}${expenseRows.length + 1}` };
  }
  (wsExpenses as any)['!freeze'] = { xSplit: 0, ySplit: 1, topRow: 1, activePane: 'bottomLeft', state: 'frozen' };

  // 5. Build Sheet 4: Financial Summary
  const totalChanda = liveChanda.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const totalExpenses = liveExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const currentBalance = totalChanda - totalExpenses;

  // Category-wise Expense Totals
  const categoryExpenseMap: Record<string, { total: number; count: number }> = {};
  liveExpenses.forEach((e) => {
    const cat = e.category || 'Miscellaneous';
    if (!categoryExpenseMap[cat]) {
      categoryExpenseMap[cat] = { total: 0, count: 0 };
    }
    categoryExpenseMap[cat].total += Number(e.amount) || 0;
    categoryExpenseMap[cat].count += 1;
  });

  // Payment-mode-wise Chanda Totals
  const chandaPaymentMap: Record<string, { total: number; count: number }> = {
    Cash: { total: 0, count: 0 },
    UPI: { total: 0, count: 0 },
    'Bank Transfer': { total: 0, count: 0 },
    Other: { total: 0, count: 0 },
  };

  liveChanda.forEach((r) => {
    const rawMode = (r.paymentMode || 'CASH').toUpperCase().trim();
    let mode = 'Other';
    if (rawMode === 'CASH') mode = 'Cash';
    else if (rawMode === 'UPI') mode = 'UPI';
    else if (rawMode === 'BANK_TRANSFER' || rawMode === 'BANK TRANSFER' || rawMode === 'NET_BANKING') mode = 'Bank Transfer';
    else if (rawMode === 'CHEQUE') mode = 'Cheque';
    else if (rawMode === 'OTHER' || rawMode === 'OTHERS') mode = 'Other';
    else mode = rawMode.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');

    if (!chandaPaymentMap[mode]) {
      chandaPaymentMap[mode] = { total: 0, count: 0 };
    }
    chandaPaymentMap[mode].total += Number(r.amount) || 0;
    chandaPaymentMap[mode].count += 1;
  });

  // Payment-mode-wise Expense Totals
  const expensePaymentMap: Record<string, { total: number; count: number }> = {
    Cash: { total: 0, count: 0 },
    UPI: { total: 0, count: 0 },
    'Bank Transfer': { total: 0, count: 0 },
    Other: { total: 0, count: 0 },
  };

  liveExpenses.forEach((e) => {
    const rawMode = (e.paymentMode || 'CASH').toUpperCase().trim();
    let mode = 'Other';
    if (rawMode === 'CASH') mode = 'Cash';
    else if (rawMode === 'UPI') mode = 'UPI';
    else if (rawMode === 'BANK_TRANSFER' || rawMode === 'BANK TRANSFER' || rawMode === 'NET_BANKING') mode = 'Bank Transfer';
    else if (rawMode === 'CHEQUE') mode = 'Cheque';
    else if (rawMode === 'OTHER' || rawMode === 'OTHERS') mode = 'Other';
    else mode = rawMode.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');

    if (!expensePaymentMap[mode]) {
      expensePaymentMap[mode] = { total: 0, count: 0 };
    }
    expensePaymentMap[mode].total += Number(e.amount) || 0;
    expensePaymentMap[mode].count += 1;
  });

  const financialSummaryAoa: any[][] = [
    // Row 1: A1:D1
    ['NAVYUVAK GANESH MITRA MANDAL — CONSOLIDATED FINANCIAL REPORT', '', '', ''],
    // Row 2: A2, B2
    ['Generated On', formatTimestamp(new Date().toISOString()), '', ''],
    // Row 3: A3, B3:D3
    ['Source of Truth', 'Live Firebase Firestore Collections (bookings, chandaReceipts, expenses)', '', ''],
    // Row 4: Blank
    ['', '', '', ''],
    // Row 5: Section 1 Header
    ['OVERALL FINANCIAL SUMMARY', 'AMOUNT (₹)', 'STATUS / REMARK', ''],
    // Row 6: Total Chanda
    ['Total Chanda Collected', totalChanda, `${liveChanda.length} donation receipts`, ''],
    // Row 7: Total Expenses
    ['Total Expenses', totalExpenses, `${liveExpenses.length} expense entries`, ''],
    // Row 8: Current Balance
    ['Current Balance', currentBalance, currentBalance >= 0 ? 'Surplus (+)' : 'Deficit (-)', ''],
    // Row 9: Blank
    ['', '', '', ''],
    // Row 10: Section 2 Header
    ['CATEGORY-WISE EXPENSE TOTALS', 'TOTAL SPENT (₹)', '% OF TOTAL EXPENSES', 'RECORD COUNT'],
  ];

  // Section 2 Data Rows
  if (Object.keys(categoryExpenseMap).length === 0) {
    financialSummaryAoa.push(['No expenses recorded yet', 0, '0%', 0]);
  } else {
    Object.entries(categoryExpenseMap)
      .sort((a, b) => b[1].total - a[1].total)
      .forEach(([cat, data]) => {
        const pct = totalExpenses > 0 ? ((data.total / totalExpenses) * 100).toFixed(1) + '%' : '0%';
        financialSummaryAoa.push([cat, data.total, pct, data.count]);
      });
  }

  // Section 3: Payment-Mode-Wise Chanda Totals
  financialSummaryAoa.push(['', '', '', '']);
  financialSummaryAoa.push(['PAYMENT-MODE-WISE CHANDA TOTALS', 'COLLECTED (₹)', '% OF TOTAL CHANDA', 'RECEIPT COUNT']);
  if (liveChanda.length === 0) {
    financialSummaryAoa.push(['No chanda recorded yet', 0, '0%', 0]);
  } else {
    Object.entries(chandaPaymentMap).forEach(([mode, data]) => {
      const pct = totalChanda > 0 ? ((data.total / totalChanda) * 100).toFixed(1) + '%' : '0%';
      financialSummaryAoa.push([mode, data.total, pct, data.count]);
    });
  }

  // Section 4: Payment-Mode-Wise Expense Totals
  financialSummaryAoa.push(['', '', '', '']);
  financialSummaryAoa.push(['PAYMENT-MODE-WISE EXPENSE TOTALS', 'SPENT (₹)', '% OF TOTAL EXPENSES', 'EXPENSE COUNT']);
  if (liveExpenses.length === 0) {
    financialSummaryAoa.push(['No expenses recorded yet', 0, '0%', 0]);
  } else {
    Object.entries(expensePaymentMap).forEach(([mode, data]) => {
      const pct = totalExpenses > 0 ? ((data.total / totalExpenses) * 100).toFixed(1) + '%' : '0%';
      financialSummaryAoa.push([mode, data.total, pct, data.count]);
    });
  }

  const wsFinancialSummary = XLSX.utils.aoa_to_sheet(financialSummaryAoa);
  wsFinancialSummary['!cols'] = [{ wch: 38 }, { wch: 22 }, { wch: 24 }, { wch: 18 }];
  wsFinancialSummary['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, // A1:D1
    { s: { r: 2, c: 1 }, e: { r: 2, c: 3 } }, // B3:D3
  ];

  // Apply number formatting for numeric cells in Financial Summary
  if (wsFinancialSummary['!ref']) {
    const range = XLSX.utils.decode_range(wsFinancialSummary['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = wsFinancialSummary[cellAddress];
        if (cell && typeof cell.v === 'number') {
          if (C === 1 && R >= 4) {
            cell.z = '#,##0';
          } else if (C === 3 && R >= 9) {
            cell.z = '#,##0';
          }
        }
      }
    }
  }

  // 6. Build Sheet 5: Aarti Summary
  const currentYear = new Date().getFullYear();
  const festPeriod = getCalculatedFestivalPeriod(currentYear >= 2026 ? currentYear : 2026);
  const defaultDates = getDatesListBetween(festPeriod.festivalStartDate, festPeriod.festivalEndDate);

  // Gather all unique dates from festival dates, live slots, and live bookings
  const allDatesSet = new Set<string>(defaultDates);
  liveSlots.forEach((s) => {
    if (s.date) allDatesSet.add(s.date);
  });
  liveBookings.forEach((b) => {
    const d = b.slot_date || (b as any).date;
    if (d) allDatesSet.add(d);
  });

  const sortedDates = Array.from(allDatesSet).sort();

  // Create slot capacity lookup map
  const capacityMap: Record<string, number> = {};
  liveSlots.forEach((s) => {
    if (s.date) {
      capacityMap[s.date] = Number(s.capacity) || DAILY_AARTI_CAPACITY;
    }
  });

  // Calculate occupied seats per date from PENDING and ACCEPTED bookings
  const occupiedMap: Record<string, number> = {};
  liveBookings.forEach((b) => {
    const d = b.slot_date || (b as any).date;
    const status = b.status || 'PENDING';
    if (d && (status === 'PENDING' || status === 'ACCEPTED' || status === 'COMPLETED')) {
      const people = Number(b.number_of_people) || 1;
      occupiedMap[d] = (occupiedMap[d] || 0) + people;
    }
  });

  const aartiSummaryHeaders = [
    'Aarti Date',
    'Capacity',
    'Occupied Seats',
    'Remaining Seats',
    'Status',
  ];

  const aartiSummaryRows = sortedDates.map((dateStr) => {
    const cap = capacityMap[dateStr] ?? DAILY_AARTI_CAPACITY;
    const occupied = occupiedMap[dateStr] || 0;
    const remaining = Math.max(0, cap - occupied);
    let status = 'AVAILABLE';
    if (remaining <= 0) {
      status = 'FULL';
    } else if (occupied > 0) {
      status = 'AVAILABLE (PARTIAL)';
    }

    return {
      'Aarti Date': formatToIndianDate(dateStr),
      'Capacity': cap,
      'Occupied Seats': occupied,
      'Remaining Seats': remaining,
      'Status': status,
    };
  });

  const wsAartiSummary = aartiSummaryRows.length > 0
    ? XLSX.utils.json_to_sheet(aartiSummaryRows, { header: aartiSummaryHeaders })
    : XLSX.utils.aoa_to_sheet([aartiSummaryHeaders]);

  wsAartiSummary['!cols'] = calculateColumnWidths(aartiSummaryHeaders, aartiSummaryRows);
  if (aartiSummaryRows.length > 0) {
    const lastColLetter = XLSX.utils.encode_col(aartiSummaryHeaders.length - 1);
    wsAartiSummary['!autofilter'] = { ref: `A1:${lastColLetter}${aartiSummaryRows.length + 1}` };
  }
  (wsAartiSummary as any)['!freeze'] = { xSplit: 0, ySplit: 1, topRow: 1, activePane: 'bottomLeft', state: 'frozen' };

  // 7. Create Workbook & Append All 5 Sheets in Order
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, wsBookings, 'Aarti Bookings');
  XLSX.utils.book_append_sheet(workbook, wsChanda, 'Chanda Donations');
  XLSX.utils.book_append_sheet(workbook, wsExpenses, 'Spending Expenses');
  XLSX.utils.book_append_sheet(workbook, wsFinancialSummary, 'Financial Summary');
  XLSX.utils.book_append_sheet(workbook, wsAartiSummary, 'Aarti Summary');

  // 8. Generate Filename & Trigger Download
  const todayIso = new Date().toISOString().split('T')[0];
  const filename = `Navyuvak-Ganesh-Mandal-Master-Report-${todayIso}.xlsx`;

  XLSX.writeFile(workbook, filename);

  return {
    success: true,
    filename,
    bookingsCount: liveBookings.length,
    chandaCount: liveChanda.length,
    expenseCount: liveExpenses.length,
  };
}

// Backward-compatible alias for any legacy callers
export const generateBookingsExcel = generateUnifiedAdminExcel;
