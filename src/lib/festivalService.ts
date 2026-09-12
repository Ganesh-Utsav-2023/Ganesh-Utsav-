import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig.ts';
import {
  getCalculatedFestivalPeriod,
  getDatesListBetween,
} from '../utils/festivalCalculator.ts';

export interface FestivalSettings {
  year: number;
  festivalName: string;
  ganeshChaturthiDate: string; // YYYY-MM-DD
  festivalStartDate: string;   // YYYY-MM-DD
  festivalEndDate: string;     // YYYY-MM-DD
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

const SETTINGS_KEY_PREFIX = 'nygmm_festival_settings_';
const ACTIVE_YEAR_KEY = 'nygmm_active_festival_year';

export async function ensureYearAartiSlotsExist(
  festivalStartDate: string,
  festivalEndDate: string
): Promise<void> {
  // Slots managed server-side or via slots API
}

export async function getOrInitFestivalSettings(year: number): Promise<FestivalSettings> {
  try {
    const docRef = doc(db, 'festivalSettings', String(year));
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as FestivalSettings;
      localStorage.setItem(`${SETTINGS_KEY_PREFIX}${year}`, JSON.stringify(data));
      return data;
    }
  } catch (e) {
    // Fallback to local storage
  }

  try {
    const raw = localStorage.getItem(`${SETTINGS_KEY_PREFIX}${year}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    // Fallback
  }

  const defaults = getCalculatedFestivalPeriod(year);
  const nowIso = new Date().toISOString();
  const settings: FestivalSettings = {
    ...defaults,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const isAdmin = auth.currentUser?.email === 'navyuvakganeshmitramandal14@gmail.com';
  if (isAdmin) {
    try {
      await setDoc(doc(db, 'festivalSettings', String(year)), settings, { merge: true });
      localStorage.setItem(`${SETTINGS_KEY_PREFIX}${year}`, JSON.stringify(settings));
    } catch (e) {
      // Ignore
    }
  } else {
    localStorage.setItem(`${SETTINGS_KEY_PREFIX}${year}`, JSON.stringify(settings));
  }

  return settings;
}

export async function updateFestivalSettings(
  year: number,
  updates: Partial<FestivalSettings>
): Promise<FestivalSettings> {
  const current = await getOrInitFestivalSettings(year);
  const updated: FestivalSettings = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'festivalSettings', String(year)), updated, { merge: true });
    localStorage.setItem(`${SETTINGS_KEY_PREFIX}${year}`, JSON.stringify(updated));
    window.dispatchEvent(new Event('nygmm_festival_updated'));
  } catch (e) {
    console.warn('Error updating festival settings:', e);
  }

  return updated;
}

export function subscribeToFestivalSettings(
  year: number,
  onUpdate: (settings: FestivalSettings) => void,
  onError?: (err: unknown) => void
): () => void {
  const docRef = doc(db, 'festivalSettings', String(year));

  const unsub = onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as FestivalSettings;
        localStorage.setItem(`${SETTINGS_KEY_PREFIX}${year}`, JSON.stringify(data));
        onUpdate(data);
      } else {
        const defaults = getCalculatedFestivalPeriod(year);
        const fallbackSettings: FestivalSettings = {
          ...defaults,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(`${SETTINGS_KEY_PREFIX}${year}`, JSON.stringify(fallbackSettings));
        onUpdate(fallbackSettings);
      }
    },
    (err) => {
      console.warn('Firestore festivalSettings listener error:', err);
      if (onError) onError(err);
      const defaults = getCalculatedFestivalPeriod(year);
      onUpdate({
        ...defaults,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  );

  return () => {
    unsub();
  };
}

export interface ActiveFestivalYearDoc {
  activeYear: number;
  updatedAt: string;
}

export async function getActiveFestivalYear(): Promise<number> {
  try {
    const docRef = doc(db, 'festivalSettings', 'current');
    const snap = await getDoc(docRef);
    if (snap.exists() && snap.data().activeYear) {
      const activeYear = Number(snap.data().activeYear);
      localStorage.setItem(ACTIVE_YEAR_KEY, String(activeYear));
      return activeYear;
    }
  } catch (e) {
    // Fallback
  }

  try {
    const raw = localStorage.getItem(ACTIVE_YEAR_KEY);
    if (raw) {
      const year = parseInt(raw, 10);
      if (!isNaN(year)) return year;
    }
  } catch (e) {
    // Ignore
  }
  return 2026;
}

export async function setActiveFestivalYear(year: number): Promise<void> {
  const nowIso = new Date().toISOString();
  try {
    await setDoc(doc(db, 'festivalSettings', 'current'), {
      activeYear: year,
      updatedAt: nowIso,
    }, { merge: true });

    localStorage.setItem(ACTIVE_YEAR_KEY, String(year));
    window.dispatchEvent(new Event('nygmm_active_year_updated'));
  } catch (e) {
    console.warn('Error setting active festival year:', e);
  }
}

export function subscribeToActiveFestivalYear(
  onUpdate: (year: number) => void,
  onError?: (err: unknown) => void
): () => void {
  const docRef = doc(db, 'festivalSettings', 'current');

  const unsub = onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists() && snap.data().activeYear) {
        const year = Number(snap.data().activeYear);
        localStorage.setItem(ACTIVE_YEAR_KEY, String(year));
        onUpdate(year);
      } else {
        onUpdate(2026);
      }
    },
    (err) => {
      console.warn('Firestore active festival year listener error:', err);
      if (onError) onError(err);
      onUpdate(2026);
    }
  );

  return () => {
    unsub();
  };
}
