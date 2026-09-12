import * as XLSX from 'xlsx';
import { ChandaReceipt } from '../types/index.ts';
import { formatToIndianDate } from './dateUtils.ts';

/**
 * Generates and downloads a clean, beautifully formatted Excel sheet of all Chanda / Donation records.
 * STRICT PRIVACY: Does NOT export any donor mobile numbers, emails, or personal addresses.
 */
export function exportChandaToExcel(
  receipts: ChandaReceipt[],
  filenamePrefix: string = 'Navyuvak-Ganesh-Chanda-Donations'
): { success: boolean; count: number } {
  if (!receipts || receipts.length === 0) {
    alert('No donation records found to export.');
    return { success: false, count: 0 };
  }

  // 1. Prepare structured row data adhering strictly to privacy guidelines
  const rows = receipts.map((r, index) => ({
    'S.No': index + 1,
    'Receipt Number': r.receiptNumber,
    'Donor Name': r.donorName,
    'Amount (₹)': Number(r.amount) || 0,
    'Amount in Words': r.amountInWords,
    'Payment Mode': (r.paymentMode || 'CASH').replace('_', ' '),
    'Donation Date': r.donationDate ? formatToIndianDate(r.donationDate) : '',
    'Collected By': r.collectedBy,
    'Purpose / Remark': r.purpose || 'Ganesh Utsav Seva',
    'Created At': r.createdAt ? new Date(r.createdAt).toLocaleString('en-IN') : '',
  }));

  // 2. Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths for optimal readability
  worksheet['!cols'] = [
    { wch: 6 },  // S.No
    { wch: 18 }, // Receipt Number
    { wch: 28 }, // Donor Name
    { wch: 14 }, // Amount
    { wch: 40 }, // Amount in Words
    { wch: 16 }, // Payment Mode
    { wch: 14 }, // Donation Date
    { wch: 24 }, // Collected By
    { wch: 32 }, // Purpose
    { wch: 22 }, // Created At
  ];

  // 3. Create workbook and add sheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Chanda Receipts');

  // 4. Generate filename with date
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `${filenamePrefix}-${dateStr}.xlsx`;

  // 5. Download file
  XLSX.writeFile(workbook, filename);

  return { success: true, count: receipts.length };
}
