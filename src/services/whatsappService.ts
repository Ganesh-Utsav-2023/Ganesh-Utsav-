import { WhatsAppContactNumber, AdminWhatsAppSettings } from '../types/index.ts';

const WA_STORAGE_KEY = 'nygmm_whatsapp_numbers_v1';

export type Unsubscribe = () => void;

export const DEFAULT_WHATSAPP_NUMBERS: WhatsAppContactNumber[] = [
  {
    id: 'wa-aarti-pass',
    label: 'Aarti Pass',
    phoneNumber: '+91 7724095705',
    active: true,
    isDefault: true,
  },
  {
    id: 'wa-donation',
    label: 'Donation',
    phoneNumber: '+91 6262982251',
    active: true,
    isDefault: false,
  },
  {
    id: 'wa-general-enquiry',
    label: 'General Enquiry',
    phoneNumber: '+91 7724095705',
    active: true,
    isDefault: false,
  },
  {
    id: 'wa-mandal-office',
    label: 'Mandal Office',
    phoneNumber: '+91 6262982251',
    active: true,
    isDefault: false,
  },
];

export function normalizeWhatsAppNumber(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

export async function getAdminWhatsAppNumbers(): Promise<WhatsAppContactNumber[]> {
  try {
    const raw = localStorage.getItem(WA_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, 4);
      }
    }
  } catch (error) {
    console.warn('Could not read admin WhatsApp configuration from local storage:', error);
  }
  return DEFAULT_WHATSAPP_NUMBERS;
}

export async function saveAdminWhatsAppNumbers(
  numbers: WhatsAppContactNumber[],
  adminEmail: string = 'navyuvakganeshmitramandal14@gmail.com'
): Promise<void> {
  if (numbers.length > 4) {
    throw new Error('Maximum 4 WhatsApp contact numbers are allowed.');
  }

  const sanitizedNumbers: WhatsAppContactNumber[] = numbers.map((item, idx) => ({
    id: item.id || `wa-${Date.now()}-${idx}`,
    label: (item.label || 'Contact').trim(),
    phoneNumber: (item.phoneNumber || '').trim(),
    active: Boolean(item.active),
    isDefault: Boolean(item.isDefault),
  }));

  const activeNumbers = sanitizedNumbers.filter((n) => n.active);
  const hasDefaultActive = activeNumbers.some((n) => n.isDefault);
  if (activeNumbers.length > 0 && !hasDefaultActive) {
    activeNumbers[0].isDefault = true;
  }

  try {
    localStorage.setItem(WA_STORAGE_KEY, JSON.stringify(sanitizedNumbers));
    window.dispatchEvent(new Event('nygmm_whatsapp_updated'));
  } catch (error) {
    console.warn('Error saving whatsapp numbers:', error);
    throw error;
  }
}

export function subscribeToAdminWhatsAppNumbers(
  onUpdate: (numbers: WhatsAppContactNumber[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const notify = () => {
    getAdminWhatsAppNumbers().then(onUpdate).catch(() => onUpdate(DEFAULT_WHATSAPP_NUMBERS));
  };

  notify();
  window.addEventListener('nygmm_whatsapp_updated', notify);

  return () => {
    window.removeEventListener('nygmm_whatsapp_updated', notify);
  };
}
