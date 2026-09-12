import * as XLSX from 'xlsx';
import { ExpenseRecord } from '../types/index.ts';
import { formatToIndianDate } from './dateUtils.ts';

/**
 * Generates and downloads a clean, beautifully formatted Excel sheet of all Expense records & summary.
 */
export function exportExpensesToExcel(
  expenses: ExpenseRecord[],
  filenamePrefix: string = 'Navyuvak-Ganesh-Expenses-Report'
): { success: boolean; count: number } {
  if (!expenses || expenses.length === 0) {
    alert('No expense records found to export.');
    return { success: false, count: 0 };
  }

  // 1. Prepare structured row data for Expense Records
  const rows = expenses.map((e, index) => ({
    'S.No': index + 1,
    'Expense Number': e.expenseNumber,
    'Expense Date': e.expenseDate ? formatToIndianDate(e.expenseDate) : '',
    'Category': e.category,
    'Amount (₹)': Number(e.amount) || 0,
    'Payment Mode': (e.paymentMode || 'CASH').replace('_', ' '),
    'Paid To / Vendor': e.paidTo || '-',
    'Recorded By': e.recordedBy || 'Admin',
    'Created At': e.createdAt ? new Date(e.createdAt).toLocaleString('en-IN') : '',
    'Updated At': e.updatedAt ? new Date(e.updatedAt).toLocaleString('en-IN') : '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  worksheet['!cols'] = [
    { wch: 6 },  // S.No
    { wch: 18 }, // Expense Number
    { wch: 14 }, // Expense Date
    { wch: 24 }, // Category
    { wch: 14 }, // Amount
    { wch: 16 }, // Payment Mode
    { wch: 24 }, // Paid To / Vendor
    { wch: 22 }, // Recorded By
    { wch: 22 }, // Created At
    { wch: 22 }, // Updated At
  ];

  // 2. Prepare Summary Sheet Data
  const totalSpending = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  
  const categoryMap: Record<string, number> = {};
  const paymentMap: Record<string, number> = {};

  expenses.forEach((e) => {
    const cat = e.category || 'Miscellaneous';
    categoryMap[cat] = (categoryMap[cat] || 0) + (Number(e.amount) || 0);

    const mode = (e.paymentMode || 'CASH').replace('_', ' ');
    paymentMap[mode] = (paymentMap[mode] || 0) + (Number(e.amount) || 0);
  });

  const summaryRows: any[] = [
    { 'Metric / Category': 'Total Expenses Count', 'Value (₹ / Count)': expenses.length },
    { 'Metric / Category': 'Total Spending Amount', 'Value (₹ / Count)': totalSpending },
    { 'Metric / Category': '---', 'Value (₹ / Count)': '---' },
    { 'Metric / Category': 'CATEGORY-WISE BREAKDOWN', 'Value (₹ / Count)': '' },
  ];

  Object.entries(categoryMap).forEach(([cat, amt]) => {
    summaryRows.push({ 'Metric / Category': `  • ${cat}`, 'Value (₹ / Count)': amt });
  });

  summaryRows.push({ 'Metric / Category': '---', 'Value (₹ / Count)': '---' });
  summaryRows.push({ 'Metric / Category': 'PAYMENT MODE BREAKDOWN', 'Value (₹ / Count)': '' });

  Object.entries(paymentMap).forEach(([mode, amt]) => {
    summaryRows.push({ 'Metric / Category': `  • ${mode}`, 'Value (₹ / Count)': amt });
  });

  const summaryWorksheet = XLSX.utils.json_to_sheet(summaryRows);
  summaryWorksheet['!cols'] = [{ wch: 35 }, { wch: 25 }];

  // 3. Create workbook and add sheets
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Expense Records');
  XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Financial Summary');

  // 4. Generate filename and download
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `${filenamePrefix}-${dateStr}.xlsx`;
  XLSX.writeFile(workbook, filename);

  return { success: true, count: expenses.length };
}
