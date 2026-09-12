import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebaseConfig.ts';
import { ExpenseRecord } from '../types/index.ts';

const EXPENSE_STORAGE_KEY = 'nygmm_expenses_records_v1';

export type Unsubscribe = () => void;

export function formatExpenseNumber(num: number): string {
  const safeNum = Math.max(1, Math.floor(Number(num) || 1));
  const numStr = safeNum < 10000 ? safeNum.toString().padStart(4, '0') : safeNum.toString();
  return `NYGMM-EXP-${numStr}`;
}

export function parseExpenseNumber(expenseNo?: string): number {
  if (!expenseNo || typeof expenseNo !== 'string') return 0;
  const clean = expenseNo.trim();

  const match = clean.match(/NYGMM-EXP-(\d+)/i);
  if (match) return parseInt(match[1], 10);

  const trailingMatch = clean.match(/(\d+)$/);
  if (trailingMatch) return parseInt(trailingMatch[1], 10);

  return 0;
}

export function findLowestUnusedExpenseNumber(
  activeExpenses: { expenseNumber?: string }[]
): {
  serialNumber: number;
  expenseNumber: string;
} {
  const usedNumbers = new Set<number>();

  for (const item of activeExpenses) {
    if (item && item.expenseNumber) {
      const parsed = parseExpenseNumber(item.expenseNumber);
      if (parsed > 0) {
        usedNumbers.add(parsed);
      }
    }
  }

  let candidate = 1;
  while (usedNumbers.has(candidate)) {
    candidate++;
  }

  return {
    serialNumber: candidate,
    expenseNumber: formatExpenseNumber(candidate),
  };
}

export function getStoredExpenses(): ExpenseRecord[] {
  try {
    const raw = localStorage.getItem(EXPENSE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Error reading stored expenses:', e);
  }
  return [];
}

export function saveStoredExpenses(expenses: ExpenseRecord[]): void {
  try {
    localStorage.setItem(EXPENSE_STORAGE_KEY, JSON.stringify(expenses));
    window.dispatchEvent(new Event('nygmm_expenses_updated'));
  } catch (e) {
    console.warn('Error saving expenses:', e);
  }
}

export async function getHighestExistingExpenseNumber(): Promise<number> {
  const expenses = getStoredExpenses();
  let maxNumber = 0;
  expenses.forEach((e) => {
    const num = parseExpenseNumber(e.expenseNumber);
    if (num > maxNumber) maxNumber = num;
  });
  return maxNumber;
}

export async function getExpenseCounterInfo(): Promise<{
  currentNumber: number;
  nextExpenseNumber: string;
}> {
  const expenses = getStoredExpenses();
  const result = findLowestUnusedExpenseNumber(expenses);
  return {
    currentNumber: result.serialNumber,
    nextExpenseNumber: result.expenseNumber,
  };
}

export function generateExpenseId(existingExpensesOrCount?: ExpenseRecord[] | number): string {
  if (Array.isArray(existingExpensesOrCount)) {
    return findLowestUnusedExpenseNumber(existingExpensesOrCount).expenseNumber;
  }
  const count = typeof existingExpensesOrCount === 'number' ? existingExpensesOrCount : 0;
  return formatExpenseNumber(count + 1);
}

export function subscribeToExpenses(
  onUpdate: (expenses: ExpenseRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, 'expenses'), orderBy('createdAt', 'desc'));

  const unsubFirestore = onSnapshot(
    q,
    (snapshot) => {
      const expenses: ExpenseRecord[] = snapshot.docs.map((d) => ({
        id: d.id,
        expenseId: d.id,
        ...d.data(),
      } as ExpenseRecord));

      saveStoredExpenses(expenses);
      onUpdate(expenses);
    },
    (err) => {
      console.warn('Firestore expenses subscription warning, falling back to local storage:', err);
      if (onError) onError(err);
      onUpdate(getStoredExpenses());
    }
  );

  return unsubFirestore;
}

export async function createExpense(
  data: Omit<ExpenseRecord, 'id' | 'expenseId' | 'createdAt' | 'updatedAt'>
): Promise<ExpenseRecord> {
  const currentExpenses = getStoredExpenses();
  const nextInfo = findLowestUnusedExpenseNumber(currentExpenses);

  const now = new Date().toISOString();
  const docId = `EXP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const newRecord: ExpenseRecord = {
    ...data,
    id: docId,
    expenseId: docId,
    expenseNumber: nextInfo.expenseNumber,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const docRef = doc(db, 'expenses', docId);
    await setDoc(docRef, newRecord);
  } catch (err) {
    console.warn('Error writing expense to Firestore, saving locally:', err);
  }

  const updated = [newRecord, ...currentExpenses];
  saveStoredExpenses(updated);
  return newRecord;
}

export async function updateExpense(
  id: string,
  data: Partial<ExpenseRecord>
): Promise<ExpenseRecord | null> {
  const currentExpenses = getStoredExpenses();
  const index = currentExpenses.findIndex((e) => e.id === id || e.expenseId === id);
  if (index === -1) return null;

  const existing = currentExpenses[index];
  const updatedRecord: ExpenseRecord = {
    ...existing,
    ...data,
    updatedAt: new Date().toISOString(),
  };

  try {
    const docRef = doc(db, 'expenses', id);
    await setDoc(docRef, updatedRecord, { merge: true });
  } catch (err) {
    console.warn('Error updating expense in Firestore:', err);
  }

  currentExpenses[index] = updatedRecord;
  saveStoredExpenses(currentExpenses);
  return updatedRecord;
}

export async function deleteExpense(id: string): Promise<boolean> {
  const currentExpenses = getStoredExpenses();
  const filtered = currentExpenses.filter((e) => e.id !== id && e.expenseId !== id);

  try {
    const docRef = doc(db, 'expenses', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Error deleting expense from Firestore:', err);
  }

  saveStoredExpenses(filtered);
  return true;
}
