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
import { ChandaReceipt } from '../types/index.ts';

const CHANDA_STORAGE_KEY = 'nygmm_chanda_receipts_v1';

export type Unsubscribe = () => void;

export function formatChandaReceiptNumber(num: number): string {
  const safeNum = Math.max(1, Math.floor(Number(num) || 1));
  const numStr = safeNum < 10000 ? safeNum.toString().padStart(4, '0') : safeNum.toString();
  return `NYGMM-CH-${numStr}`;
}

export function parseReceiptNumber(receiptNo?: string): number {
  if (!receiptNo || typeof receiptNo !== 'string') return 0;
  const clean = receiptNo.trim();

  const nygmmMatch = clean.match(/NYGMM-CH-(\d+)/i);
  if (nygmmMatch) return parseInt(nygmmMatch[1], 10);

  const nygmmYearMatch = clean.match(/NYGMM-\d+-CH-(\d+)/i);
  if (nygmmYearMatch) return parseInt(nygmmYearMatch[1], 10);

  const chYearMatch = clean.match(/CH-\d{4}-(\d+)/i);
  if (chYearMatch) return parseInt(chYearMatch[1], 10);

  const chMatch = clean.match(/CH-(\d+)/i);
  if (chMatch) return parseInt(chMatch[1], 10);

  const trailingDigitsMatch = clean.match(/(\d+)$/);
  if (trailingDigitsMatch) return parseInt(trailingDigitsMatch[1], 10);

  return 0;
}

export function findLowestUnusedReceiptNumber(
  activeReceipts: { receiptNumber?: string }[]
): {
  serialNumber: number;
  receiptNumber: string;
} {
  const usedNumbers = new Set<number>();

  for (const item of activeReceipts) {
    if (item && item.receiptNumber) {
      const parsed = parseReceiptNumber(item.receiptNumber);
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
    receiptNumber: formatChandaReceiptNumber(candidate),
  };
}

export function getStoredReceipts(): ChandaReceipt[] {
  try {
    const raw = localStorage.getItem(CHANDA_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Error reading stored chanda receipts:', e);
  }
  return [];
}

export function saveStoredReceipts(receipts: ChandaReceipt[]): void {
  try {
    localStorage.setItem(CHANDA_STORAGE_KEY, JSON.stringify(receipts));
    window.dispatchEvent(new Event('nygmm_chanda_updated'));
  } catch (e) {
    console.warn('Error saving chanda receipts:', e);
  }
}

export async function getHighestExistingReceiptNumber(): Promise<number> {
  const receipts = getStoredReceipts();
  let maxNumber = 0;
  receipts.forEach((r) => {
    const num = parseReceiptNumber(r.receiptNumber);
    if (num > maxNumber) maxNumber = num;
  });
  return maxNumber;
}

export async function getChandaReceiptCounterInfo(): Promise<{
  currentNumber: number;
  nextReceiptNumber: string;
}> {
  const receipts = getStoredReceipts();
  const result = findLowestUnusedReceiptNumber(receipts);
  return {
    currentNumber: result.serialNumber,
    nextReceiptNumber: result.receiptNumber,
  };
}

export function generateReceiptNumber(existingReceiptsOrCount?: ChandaReceipt[] | number): string {
  if (Array.isArray(existingReceiptsOrCount)) {
    return findLowestUnusedReceiptNumber(existingReceiptsOrCount).receiptNumber;
  }
  const count = typeof existingReceiptsOrCount === 'number' ? existingReceiptsOrCount : 0;
  return formatChandaReceiptNumber(count + 1);
}

export function subscribeToChandaReceipts(
  onUpdate: (receipts: ChandaReceipt[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  // Real-time Firestore subscription
  const q = query(collection(db, 'chandaReceipts'), orderBy('createdAt', 'desc'));

  const unsubFirestore = onSnapshot(
    q,
    (snapshot) => {
      const receipts: ChandaReceipt[] = snapshot.docs.map((d) => ({
        id: d.id,
        receiptId: d.id,
        ...d.data(),
      } as ChandaReceipt));

      saveStoredReceipts(receipts);
      onUpdate(receipts);
    },
    (err) => {
      console.warn('Firestore subscription warning, falling back to local storage:', err);
      if (onError) onError(err);
      onUpdate(getStoredReceipts());
    }
  );

  return () => {
    unsubFirestore();
  };
}

export async function createChandaReceipt(
  payload: Omit<ChandaReceipt, 'id' | 'createdAt' | 'updatedAt' | 'receiptId' | 'receiptNumber' | 'createdBy'> & {
    receiptNumber?: string;
    createdBy?: string;
  },
  adminUserEmail?: string
): Promise<{ receiptId: string; receiptNumber: string; fullReceipt: ChandaReceipt }> {
  const receipts = getStoredReceipts();
  const lowestAvailable = findLowestUnusedReceiptNumber(receipts);
  const assignedReceiptNumber = payload.receiptNumber || lowestAvailable.receiptNumber;

  const now = new Date().toISOString();
  const newId = `CH-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const newReceipt: ChandaReceipt = {
    id: newId,
    receiptId: newId,
    receiptNumber: assignedReceiptNumber,
    donorName: (payload.donorName || '').trim(),
    mobileNumber: (payload.mobileNumber || '').trim(),
    amount: Number(payload.amount) || 0,
    amountInWords: (payload.amountInWords || '').trim(),
    paymentMode: payload.paymentMode || 'CASH',
    donationDate: payload.donationDate || now.split('T')[0],
    collectedBy: (payload.collectedBy || 'Navyuvak Ganesh Mitra Mandal').trim(),
    purpose: (payload.purpose || 'Ganesh Utsav Seva').trim(),
    createdAt: now,
    updatedAt: now,
    createdBy: adminUserEmail || 'navyuvakganeshmitramandal14@gmail.com',
    temporaryMobile: (payload.mobileNumber || '').trim(),
  };

  // Write to Firestore
  try {
    await setDoc(doc(db, 'chandaReceipts', newId), newReceipt, { merge: true });
  } catch (err) {
    console.warn('Failed to write receipt to Firestore:', err);
  }

  receipts.unshift(newReceipt);
  saveStoredReceipts(receipts);

  return {
    receiptId: newId,
    receiptNumber: assignedReceiptNumber,
    fullReceipt: newReceipt,
  };
}

export async function updateChandaReceipt(
  receiptId: string,
  payload: Partial<Omit<ChandaReceipt, 'id' | 'createdAt' | 'receiptId'>>,
  adminUserEmail?: string
): Promise<void> {
  const now = new Date().toISOString();
  const updateData = {
    ...payload,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, 'chandaReceipts', receiptId), updateData, { merge: true });
  } catch (err) {
    console.warn('Failed to update receipt in Firestore:', err);
  }

  const receipts = getStoredReceipts();
  const index = receipts.findIndex((r) => r.id === receiptId || r.receiptId === receiptId);
  if (index !== -1) {
    receipts[index] = { ...receipts[index], ...updateData };
    saveStoredReceipts(receipts);
  }
}

export async function deleteChandaReceipt(receiptId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'chandaReceipts', receiptId));
  } catch (err) {
    console.warn('Failed to delete receipt from Firestore:', err);
  }

  const receipts = getStoredReceipts();
  const filtered = receipts.filter((r) => r.id !== receiptId && r.receiptId !== receiptId);
  saveStoredReceipts(filtered);
}
