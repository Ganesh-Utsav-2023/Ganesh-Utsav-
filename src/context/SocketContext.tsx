import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { collection, onSnapshot, query, where, limit } from 'firebase/firestore';
import { db } from '../firebaseConfig.ts';
import { useAuth } from './AuthContext.tsx';

interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

interface SocketContextType {
  connected: boolean;
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  lastEvent: { type: string; data: any; timestamp: string } | null;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [connected, setConnected] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [lastEvent, setLastEvent] = useState<{ type: string; data: any; timestamp: string } | null>(null);
  const initialMountRef = useRef<boolean>(true);
  const previousStatusMap = useRef<Map<string, string>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);

    setTimeout(() => {
      removeToast(id);
    }, 6000);
  }, [removeToast]);

  // Serverless Real-time updates via Firebase Firestore onSnapshot
  useEffect(() => {
    if (!user) return;

    let unsub: (() => void) | null = null;
    try {
      const bookingsCol = collection(db, 'bookings');
      const q = user.role === 'admin'
        ? query(bookingsCol, limit(50))
        : query(bookingsCol, where('userId', '==', user.id || user.uid));

      unsub = onSnapshot(q, (snapshot) => {
        setConnected(true);

        if (initialMountRef.current) {
          snapshot.docs.forEach((doc) => {
            const data = doc.data();
            previousStatusMap.current.set(doc.id, data.status);
          });
          initialMountRef.current = false;
          return;
        }

        snapshot.docChanges().forEach((change) => {
          const data = change.doc.data() as any;
          const bookingId = data.booking_id || data.bookingId || change.doc.id;

          if (change.type === 'added') {
            if (user.role === 'admin') {
              setLastEvent({
                type: 'NEW_BOOKING',
                data,
                timestamp: new Date().toISOString(),
              });
              showToast({
                type: 'info',
                title: 'New Devotee Booking! 🪔',
                message: `New booking ${bookingId} by ${data.devotee_name || 'Devotee'} (${data.number_of_people || 1} devotees).`,
              });
            }
            previousStatusMap.current.set(change.doc.id, data.status);
          } else if (change.type === 'modified') {
            const prevStatus = previousStatusMap.current.get(change.doc.id);
            const newStatus = data.status;

            if (prevStatus && prevStatus !== newStatus) {
              setLastEvent({
                type: 'BOOKING_UPDATED',
                data,
                timestamp: new Date().toISOString(),
              });

              if (newStatus === 'ACCEPTED') {
                showToast({
                  type: 'success',
                  title: 'Aarti Booking Accepted! 🙏',
                  message: `Jai Shree Ganesh! Your booking ${bookingId} for ${data.slot_date || ''} (${data.slot_start_time || '07:30 PM'}) is officially ACCEPTED!`,
                });
              } else if (newStatus === 'REJECTED') {
                showToast({
                  type: 'warning',
                  title: 'Booking Status Update',
                  message: `Your booking ${bookingId} was not confirmed. Please check details or choose another slot.`,
                });
              } else if (newStatus === 'CANCELLED') {
                showToast({
                  type: 'info',
                  title: 'Booking Cancelled',
                  message: `Booking ${bookingId} has been marked as cancelled.`,
                });
              }
            }
            previousStatusMap.current.set(change.doc.id, newStatus);
          }
        });
      }, (err) => {
        console.warn('Realtime listener note:', err);
      });
    } catch (e) {
      console.warn('Realtime setup notice:', e);
    }

    return () => {
      if (unsub) unsub();
    };
  }, [user?.id, user?.uid, user?.role, showToast]);

  return (
    <SocketContext.Provider value={{ connected, toasts, removeToast, showToast, lastEvent }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
