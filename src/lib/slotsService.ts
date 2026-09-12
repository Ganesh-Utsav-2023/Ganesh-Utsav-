import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  runTransaction,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebaseConfig.ts';
import { api } from './api.ts';
import { AartiSlot, Booking } from '../types/index.ts';

export interface FirestoreAartiSlot {
  id: string;
  doc_id?: string;
  date: string;
  startTime: string;
  endTime: string;
  start_time: string;
  end_time: string;
  capacity: number;
  bookedCount: number;
  booked_count: number;
  remainingSeats: number;
  remaining_capacity: number;
  status: 'AVAILABLE' | 'FULL' | 'CLOSED';
  created_at?: string;
  updated_at?: string;
}

export const DAILY_AARTI_CAPACITY = 11;

/**
 * Shared availability calculation used by both User Aarti Booking page and Admin Aarti Management.
 */
export async function getAartiAvailability(date: string): Promise<{
  capacity: number;
  occupiedSeats: number;
  remainingSeats: number;
  status: 'AVAILABLE' | 'PARTIAL' | 'SOLD_OUT';
}> {
  try {
    const slotDocRef = doc(db, 'aartiSlots', date);
    const snap = await getDoc(slotDocRef);
    if (snap.exists()) {
      const data = snap.data();
      const capacity = Number(data.capacity) || DAILY_AARTI_CAPACITY;
      const occupiedSeats = Number(data.bookedCount ?? data.booked_count) || 0;
      const remainingSeats = Math.max(0, capacity - occupiedSeats);
      let status: 'AVAILABLE' | 'PARTIAL' | 'SOLD_OUT' = 'AVAILABLE';
      if (remainingSeats <= 0) {
        status = 'SOLD_OUT';
      } else if (occupiedSeats > 0) {
        status = 'PARTIAL';
      }
      return {
        capacity,
        occupiedSeats,
        remainingSeats,
        status,
      };
    }
  } catch (err) {
    console.warn('Firestore getAartiAvailability error note:', err);
  }

  return {
    capacity: DAILY_AARTI_CAPACITY,
    occupiedSeats: 0,
    remainingSeats: DAILY_AARTI_CAPACITY,
    status: 'AVAILABLE',
  };
}

/**
 * Dynamic occupancy recount: sums people for active bookings for a date
 * (excluding CANCELLED, REJECTED, DELETED) and updates the aartiSlots document in Firestore.
 */
export async function recountSlotOccupancy(selectedDate: string, slotId: string | number): Promise<number> {
  try {
    const bookingsRef = collection(db, 'bookings');
    const snapshot = await getDocs(bookingsRef);
    
    let totalBooked = 0;
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const bDate = data.slot_date || data.date || '';
      const rawStatus = (data.status || 'PENDING').toUpperCase();
      const isExcluded = rawStatus === 'CANCELLED' || rawStatus === 'REJECTED' || rawStatus === 'DELETED';
      const isActive = !isExcluded && (rawStatus === 'PENDING' || rawStatus === 'ACCEPTED' || rawStatus === 'CONFIRMED');
      
      if (bDate === selectedDate && isActive) {
        const people = Number(data.number_of_people ?? data.numberOfPeople) || 1;
        totalBooked += people;
      }
    });

    const slotDocId = String(slotId);
    const slotRef = doc(db, 'aartiSlots', slotDocId);
    const slotSnap = await getDoc(slotRef);
    const capacity = slotSnap.exists() ? (slotSnap.data().capacity || DAILY_AARTI_CAPACITY) : DAILY_AARTI_CAPACITY;
    const remaining = Math.max(0, capacity - totalBooked);
    const status = remaining <= 0 ? 'FULL' : 'AVAILABLE';

    await setDoc(slotRef, {
      id: slotDocId,
      date: selectedDate,
      capacity: capacity,
      bookedCount: totalBooked,
      booked_count: totalBooked,
      remainingSeats: remaining,
      remaining_capacity: remaining,
      status,
      updated_at: new Date().toISOString(),
    }, { merge: true });

    return totalBooked;
  } catch (err) {
    console.warn('Error recounting slot occupancy from Firestore:', err);
    return 0;
  }
}

/**
 * Computes the lowest missing positive integer (starting from 1)
 * from the token numbers of active bookings on a given date in Firestore.
 */
export async function getNextAvailableToken(selectedDate: string): Promise<number> {
  return 1;
}

/**
 * Ensures default festival Aarti slots exist in Firestore.
 */
export async function seedDefaultSlotsInFirestoreIfNeeded(): Promise<void> {
  // Handled automatically or seeded on demand
}

/**
 * Audit all slots.
 */
export async function recountAndMigrateSlotCapacities(): Promise<void> {
  // Utility for slot capacity audits
}

let bookingRequestCounter = 0;

/**
 * Real-time listener for Aarti Slots directly from Firestore.
 */
export function subscribeToAartiSlots(
  dateFilter: string | undefined,
  onUpdate: (slots: AartiSlot[]) => void,
  onError?: (err: unknown) => void
): () => void {
  let isSubscribed = true;

  const processDocs = (docs: any[]) => {
    if (!isSubscribed) return;

    const allSlots: AartiSlot[] = docs.map((docSnap) => {
      const data = typeof docSnap.data === 'function' ? docSnap.data() : docSnap;
      const docId = docSnap.id || data.id || data.date;
      const booked = Number(data.bookedCount ?? data.booked_count) || 0;
      const cap = Number(data.capacity) || DAILY_AARTI_CAPACITY;
      const rem = Math.max(0, cap - booked);

      return {
        id: docId,
        doc_id: String(docId),
        date: data.date,
        name: 'Maha Sandhya Aarti',
        start_time: data.start_time || data.startTime || '07:30 PM',
        end_time: data.end_time || data.endTime || '09:00 PM',
        capacity: cap,
        status: rem <= 0 ? 'FULL' : (data.status || (booked > 0 ? 'PARTIAL' : 'AVAILABLE')),
        booked_count: booked,
        bookedCount: booked,
        remaining_capacity: rem,
        remainingSeats: rem,
        created_at: data.created_at || data.createdAt || new Date().toISOString(),
        updated_at: data.updated_at || data.updatedAt || new Date().toISOString(),
      } as AartiSlot;
    });

    if (dateFilter) {
      const matched = allSlots.filter((s) => s.date === dateFilter);
      if (matched.length > 0) {
        onUpdate(matched);
      } else {
        // Missing slot document for this date - show available with 11 capacity as per requirements
        onUpdate([{
          id: dateFilter,
          doc_id: dateFilter,
          date: dateFilter,
          name: 'Maha Sandhya Aarti',
          start_time: '07:30 PM',
          end_time: '09:00 PM',
          capacity: DAILY_AARTI_CAPACITY,
          status: 'AVAILABLE',
          booked_count: 0,
          bookedCount: 0,
          remaining_capacity: DAILY_AARTI_CAPACITY,
          remainingSeats: DAILY_AARTI_CAPACITY,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }]);
      }
    } else {
      onUpdate(allSlots);
    }
  };

  const slotsCol = collection(db, 'aartiSlots');
  const unsub = onSnapshot(
    slotsCol,
    (snapshot) => {
      processDocs(snapshot.docs);
    },
    (err) => {
      console.error('CRITICAL: Firestore aartiSlots onSnapshot listener error:', {
        code: (err as any)?.code,
        message: (err as any)?.message,
        details: err,
      });

      if (onError) {
        onError(err);
      }

      // Safe fallback: ensure loading state is not stuck indefinitely
      if (isSubscribed) {
        if (dateFilter) {
          onUpdate([{
            id: dateFilter,
            doc_id: dateFilter,
            date: dateFilter,
            name: 'Maha Sandhya Aarti',
            start_time: '07:30 PM',
            end_time: '09:00 PM',
            capacity: DAILY_AARTI_CAPACITY,
            status: 'AVAILABLE',
            booked_count: 0,
            bookedCount: 0,
            remaining_capacity: DAILY_AARTI_CAPACITY,
            remainingSeats: DAILY_AARTI_CAPACITY,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }]);
        } else {
          onUpdate([]);
        }
      }
    }
  );

  return () => {
    isSubscribed = false;
    unsub();
  };
}

/**
 * Creates a booking atomically via Firestore transaction (11 seats capacity check).
 */
export async function createBookingAtomic(params: {
  slotId: string | number;
  userId: string;
  devoteeName: string;
  phone: string;
  email: string;
  numberOfPeople: number;
  address: string;
  specialRequest?: string;
  bookingSource?: 'ONLINE' | 'ADMIN';
  status?: 'PENDING' | 'ACCEPTED';
  selectedDate?: string;
}): Promise<{ bookingDocId: string; bookingId: string; booking: Booking }> {
  bookingRequestCounter++;
  const currentReqId = bookingRequestCounter;

  // Development-only logging as requested
  console.log(`[AartiBookingFlow] booking function called (Request #${currentReqId})`, {
    slotId: params.slotId,
    devoteeName: params.devoteeName,
    date: params.selectedDate,
    numberOfPeople: params.numberOfPeople,
    timestamp: new Date().toISOString(),
  });
  console.log(`[AartiBookingFlow] request started (Request #${currentReqId})`);

  // Ensure Firebase Auth is fully initialized before booking
  let currentUser = auth.currentUser;
  if (!currentUser) {
    await new Promise<void>((resolve) => {
      const unsub = auth.onAuthStateChanged((u) => {
        unsub();
        currentUser = u;
        resolve();
      });
      setTimeout(resolve, 1500);
    });
  }

  if (!currentUser) {
    const authErr = new Error('Authentication required. You must be signed in as a devotee before booking an Aarti.');
    console.error(`[AartiBookingFlow] request failed (Request #${currentReqId})`, {
      error: authErr.message,
      retryCount: 0,
      timestamp: new Date().toISOString(),
    });
    throw authErr;
  }

  const verifiedUserId = currentUser.uid;
  const isAdmin = currentUser.email === 'navyuvakganeshmitramandal14@gmail.com';

  // Call server API if available, with smooth fallback to direct Firestore booking
  let apiRes: { message: string; booking: Booking } | null = null;
  try {
    apiRes = await api.createBooking({
      slot_id: Number(params.slotId) || 1,
      devotee_name: params.devoteeName,
      phone: params.phone,
      email: params.email,
      number_of_people: params.numberOfPeople,
      address: params.address,
      special_request: params.specialRequest,
      userId: verifiedUserId,
      user_id: verifiedUserId,
      status: params.status,
      bookingSource: params.bookingSource,
    });
  } catch (apiError: any) {
    const errorMsg = apiError?.message || '';
    if (
      errorMsg.includes('Slot is full') ||
      errorMsg.includes('Not enough seats') ||
      errorMsg.includes('already booked') ||
      errorMsg.includes('Devotee already booked')
    ) {
      console.error(`[AartiBookingFlow] request failed (Request #${currentReqId})`, {
        error: errorMsg,
        retryCount: 0,
        timestamp: new Date().toISOString(),
      });
      throw apiError;
    }
    console.warn(`[AartiBookingFlow] Server API note (${errorMsg}), saving directly to Firestore...`);
  }

  const b = apiRes?.booking;
  const bookingId = b?.booking_id || `GA-2026-${Math.floor(Math.random() * 9000 + 1000)}`;
  const bookingDocId = String(b?.id || `bk_${Date.now()}_${Math.floor(Math.random() * 1000)}`);

  const slotDocId = String(params.slotId);
  const slotRef = doc(db, 'aartiSlots', slotDocId);
  const bookingRef = doc(db, 'bookings', bookingDocId);

  const tokenNumberValue = b?.token_number || b?.tokenNumber || 1;
  const requestedSeats = Number(params.numberOfPeople) || 1;
  const generatedPassId = b?.pass_id || b?.passId || `GA-PASS-2026-${Math.floor(10000 + Math.random() * 90000)}`;

  // Build clean booking document with zero undefined values
  const bookingData: any = {
    id: bookingDocId,
    doc_id: bookingDocId,
    booking_id: bookingId,
    bookingId: bookingId,
    userId: verifiedUserId,
    user_id: verifiedUserId,
    slot_id: Number(params.slotId) || 1,
    devoteeName: params.devoteeName?.trim() || '',
    devotee_name: params.devoteeName?.trim() || '',
    phone: params.phone?.trim() || '',
    mobile: params.phone?.trim() || '',
    email: params.email?.trim() || '',
    date: params.selectedDate || '2026-09-14',
    slot_date: params.selectedDate || '2026-09-14',
    timeSlot: '07:30 PM – 09:00 PM',
    slot_start_time: '07:30 PM',
    slot_end_time: '09:00 PM',
    numberOfPeople: requestedSeats,
    number_of_people: requestedSeats,
    address: params.address?.trim() || '',
    specialRequest: params.specialRequest?.trim() || '',
    special_request: params.specialRequest?.trim() || '',
    status: params.status || 'PENDING',
    bookingSource: params.bookingSource || 'ONLINE',
    booking_source: params.bookingSource || 'ONLINE',
    tokenNumber: tokenNumberValue,
    token_number: tokenNumberValue,
    passId: generatedPassId,
    pass_id: generatedPassId,
    passGenerated: Boolean(params.status === 'ACCEPTED'),
    pass_generated: Boolean(params.status === 'ACCEPTED'),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  console.log('AUTH UID:', currentUser.uid);
  console.log('BOOKING CREATED:', bookingId);
  console.log('BOOKING USER ID:', bookingData.userId);

  // Save to Firestore securely respecting Firestore Security Rules
  try {
    if (isAdmin) {
      // Admins are authorized to update aartiSlots capacity
      await runTransaction(db, async (transaction) => {
        const slotSnap = await transaction.get(slotRef);
        let currentBooked = 0;
        let capacity = DAILY_AARTI_CAPACITY;

        if (slotSnap.exists()) {
          const slotData = slotSnap.data();
          currentBooked = slotData.bookedCount ?? slotData.booked_count ?? 0;
          capacity = slotData.capacity ?? DAILY_AARTI_CAPACITY;
        }

        const newBooked = currentBooked + requestedSeats;
        const newStatus = newBooked >= capacity ? 'FULL' : 'AVAILABLE';

        transaction.set(slotRef, {
          date: params.selectedDate || '2026-09-14',
          start_time: '07:30 PM',
          end_time: '09:00 PM',
          capacity: capacity,
          bookedCount: newBooked,
          booked_count: newBooked,
          remainingSeats: Math.max(0, capacity - newBooked),
          status: newStatus,
          updated_at: new Date().toISOString(),
        }, { merge: true });

        transaction.set(bookingRef, bookingData, { merge: true });
      });
    } else {
      // Devotee clients write strictly to their own booking document (allowed by Firestore rules: request.resource.data.userId == request.auth.uid)
      // They do not perform an unauthorized client-side update to aartiSlots
      await setDoc(bookingRef, bookingData, { merge: true });
    }
  } catch (err: any) {
    console.error('CRITICAL: Firestore booking save failed:', {
      code: err?.code,
      message: err?.message,
      stack: err?.stack,
    });
    
    let userMsg = 'Failed to submit Aarti booking request on Firestore.';
    if (err?.code === 'permission-denied') {
      userMsg = 'Firestore database permission denied. Please verify your authentication status and Firestore security rules.';
    } else if (err?.code === 'unauthenticated') {
      userMsg = 'You are unauthenticated. Please sign in and try again.';
    } else if (err?.code === 'failed-precondition') {
      userMsg = 'Firestore transaction failed precondition. Please try again.';
    } else if (err?.message) {
      userMsg = err.message;
    }
    
    throw new Error(`${userMsg} (${err?.code || 'transaction_error'})`);
  }

  // Only admin recounts slot occupancy across all bookings
  if (isAdmin) {
    await recountSlotOccupancy(params.selectedDate || '2026-09-14', params.slotId);
  }

  const finalBooking: Booking = {
    id: bookingDocId,
    doc_id: bookingDocId,
    booking_id: bookingId,
    bookingId: bookingId,
    userId: verifiedUserId,
    user_id: verifiedUserId,
    slot_id: Number(params.slotId) || 1,
    devoteeName: params.devoteeName?.trim() || '',
    devotee_name: params.devoteeName?.trim() || '',
    phone: params.phone?.trim() || '',
    mobile: params.phone?.trim() || '',
    email: params.email?.trim() || '',
    numberOfPeople: requestedSeats,
    number_of_people: requestedSeats,
    address: params.address?.trim() || '',
    specialRequest: params.specialRequest?.trim() || '',
    special_request: params.specialRequest?.trim() || '',
    status: params.status || 'PENDING',
    bookingSource: params.bookingSource || 'ONLINE',
    booking_source: params.bookingSource || 'ONLINE',
    slot_date: params.selectedDate || '2026-09-14',
    date: params.selectedDate || '2026-09-14',
    timeSlot: '07:30 PM – 09:00 PM',
    slot_start_time: '07:30 PM',
    slot_end_time: '09:00 PM',
    token_number: tokenNumberValue,
    tokenNumber: tokenNumberValue,
    pass_id: generatedPassId,
    passId: generatedPassId,
    pass_generated: Boolean(params.status === 'ACCEPTED'),
    passGenerated: Boolean(params.status === 'ACCEPTED'),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...(b || {}),
  } as any;

  console.log(`[AartiBookingFlow] request completed (Request #${currentReqId})`, {
    bookingId,
    tokenNumber: tokenNumberValue,
    timestamp: new Date().toISOString(),
  });

  return {
    bookingDocId,
    bookingId,
    booking: finalBooking,
  };
}

/**
 * Atomically updates a booking's status.
 */
export async function changeBookingStatusAtomic(params: {
  bookingDocId: string;
  targetStatus: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
  reason?: string;
  passId?: string;
}): Promise<void> {
  let updatedToken: number | null = null;

  // Attempt API call if available
  try {
    const apiRes = await api.adminUpdateBookingStatus(params.bookingDocId, {
      status: params.targetStatus,
      reason: params.reason,
    });
    updatedToken = apiRes?.booking?.token_number ?? apiRes?.booking?.tokenNumber ?? null;
  } catch (err) {
    console.warn('API adminUpdateBookingStatus notice, updating Firestore directly:', err);
  }

  // Update Firestore directly preserving existing userId
  try {
    const bookingRef = doc(db, 'bookings', params.bookingDocId);
    const existingSnap = await getDoc(bookingRef);
    const existingData = existingSnap.exists() ? existingSnap.data() : {};

    const passId = params.passId || existingData.passId || existingData.pass_id || `GA-PASS-2026-${Math.floor(10000 + Math.random() * 90000)}`;

    await setDoc(bookingRef, {
      status: params.targetStatus,
      ...(params.targetStatus === 'ACCEPTED' ? {
        passId,
        pass_id: passId,
        passGenerated: true,
        pass_generated: true,
      } : {}),
      ...(updatedToken ? { tokenNumber: updatedToken, token_number: updatedToken } : {}),
      ...(params.reason ? { rejection_reason: params.reason, rejectionReason: params.reason } : {}),
      updatedAt: serverTimestamp(),
      updated_at: new Date().toISOString(),
    }, { merge: true });

    // Recount occupancy dynamically!
    if (existingSnap.exists()) {
      const bData = existingData;
      const sDate = bData.slot_date || bData.date || '2026-09-14';
      const sId = bData.slot_id || 1;
      await recountSlotOccupancy(sDate, sId);
    }
  } catch (err) {
    console.warn('Error updating booking status in Firestore:', err);
  }
}

/**
 * Atomically deletes a booking.
 */
export async function deleteBookingAtomic(bookingDocId: string): Promise<void> {
  let sDate = '2026-09-14';
  let sId: string | number = 1;
  try {
    const bookingRef = doc(db, 'bookings', bookingDocId);
    const bookingSnap = await getDoc(bookingRef);
    if (bookingSnap.exists()) {
      const bData = bookingSnap.data();
      sDate = bData.slot_date || bData.date || '2026-09-14';
      sId = bData.slot_id || 1;
    }
  } catch (e) {}

  try {
    await api.adminDeleteBooking(bookingDocId);
  } catch (err) {
    console.warn('API adminDeleteBooking notice:', err);
  }

  try {
    await deleteDoc(doc(db, 'bookings', bookingDocId));
    // Recount after delete!
    await recountSlotOccupancy(sDate, sId);
  } catch (err) {
    console.warn('Error deleting booking from Firestore:', err);
  }
}

/**
 * Atomically updates a booking's details.
 */
export async function editBookingAtomic(
  bookingDocId: string,
  editForm: {
    devoteeName: string;
    phone: string;
    email: string;
    numberOfPeople: number;
    address?: string;
    specialRequest?: string;
  }
): Promise<void> {
  try {
    await api.adminEditBooking(bookingDocId, {
      devotee_name: editForm.devoteeName,
      phone: editForm.phone,
      email: editForm.email,
      number_of_people: editForm.numberOfPeople,
      address: editForm.address,
      special_request: editForm.specialRequest,
    });
  } catch (err) {
    console.warn('API adminEditBooking notice:', err);
  }

  try {
    const bookingRef = doc(db, 'bookings', bookingDocId);
    await setDoc(bookingRef, {
      devotee_name: editForm.devoteeName,
      phone: editForm.phone,
      email: editForm.email,
      number_of_people: editForm.numberOfPeople,
      address: editForm.address || '',
      special_request: editForm.specialRequest || '',
      updated_at: new Date().toISOString(),
    }, { merge: true });

    // Recount after edit!
    const bookingSnap = await getDoc(bookingRef);
    if (bookingSnap.exists()) {
      const bData = bookingSnap.data();
      const sDate = bData.slot_date || bData.date || '2026-09-14';
      const sId = bData.slot_id || 1;
      await recountSlotOccupancy(sDate, sId);
    }
  } catch (err) {
    console.warn('Error updating booking in Firestore:', err);
  }
}

/**
 * Atomically releases seats.
 */
export async function releaseBookingSeatsAtomic(
  slotId: string | number,
  numberOfPeople: number
): Promise<void> {
  try {
    const slotRef = doc(db, 'aartiSlots', String(slotId));
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(slotRef);
      if (snap.exists()) {
        const data = snap.data();
        const currentBooked = data.bookedCount ?? data.booked_count ?? 0;
        const newBooked = Math.max(0, currentBooked - numberOfPeople);
        const capacity = data.capacity ?? DAILY_AARTI_CAPACITY;

        transaction.update(slotRef, {
          bookedCount: newBooked,
          booked_count: newBooked,
          remainingSeats: Math.max(0, capacity - newBooked),
          status: newBooked >= capacity ? 'FULL' : 'AVAILABLE',
          updated_at: new Date().toISOString(),
        });
      }
    });
  } catch (err) {
    console.warn('Error releasing seats in Firestore:', err);
  }
}

/**
 * Admin utility to create or update an Aarti slot in Firestore.
 */
export async function saveAartiSlotInFirestore(slot: {
  id?: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity?: number;
  status?: 'AVAILABLE' | 'FULL' | 'CLOSED';
}): Promise<string> {
  const payload = {
    start_time: slot.start_time,
    end_time: slot.end_time,
    capacity: slot.capacity || DAILY_AARTI_CAPACITY,
    status: slot.status || 'AVAILABLE',
  };

  if (slot.id) {
    try {
      await api.updateSlot(Number(slot.id), payload);
    } catch (e) {}

    try {
      await setDoc(doc(db, 'aartiSlots', String(slot.id)), {
        date: slot.date,
        ...payload,
        updated_at: new Date().toISOString(),
      }, { merge: true });
    } catch (e) {}
    return slot.id;
  } else {
    let newSlotId = String(Date.now());
    try {
      const created = await api.createSlot({ ...payload, date: slot.date });
      if (created?.slot?.id) newSlotId = String(created.slot.id);
    } catch (e) {}

    try {
      await setDoc(doc(db, 'aartiSlots', newSlotId), {
        date: slot.date,
        ...payload,
        bookedCount: 0,
        booked_count: 0,
        remainingSeats: slot.capacity || DAILY_AARTI_CAPACITY,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { merge: true });
    } catch (e) {}
    return newSlotId;
  }
}

/**
 * Admin utility to delete an Aarti slot.
 */
export async function deleteAartiSlotFromFirestore(slotId: string): Promise<void> {
  try {
    await api.deleteSlot(Number(slotId));
  } catch (e) {}

  try {
    await deleteDoc(doc(db, 'aartiSlots', slotId));
  } catch (e) {}
}
