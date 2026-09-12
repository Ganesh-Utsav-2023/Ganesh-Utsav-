export type UserRole = 'user' | 'admin';

export interface User {
  id: number | string;
  uid?: string;
  full_name: string;
  displayName?: string;
  email: string;
  phone: string;
  role: UserRole;
  provider?: string;
  status?: string;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export interface RegisteredDevotee {
  id: string; // Document ID (Firestore UID)
  uid: string;
  displayName: string;
  full_name?: string;
  email: string;
  phone: string;
  role: UserRole;
  provider: 'google.com' | 'password' | string;
  status: 'Active' | 'Inactive' | string;
  createdAt?: string | any;
  updatedAt?: string | any;
  lastLoginAt?: string | any;
  total_bookings?: number;
  accepted_bookings?: number;
}

export type SlotStatus = 'AVAILABLE' | 'FULL' | 'CLOSED';

export interface AartiSlot {
  id: number | string;
  doc_id?: string;
  name?: string;
  date: string; // YYYY-MM-DD
  start_time: string; // e.g. "07:30 PM"
  end_time: string; // e.g. "09:00 PM"
  startTime?: string;
  endTime?: string;
  capacity: number;
  status: SlotStatus;
  created_at: string;
  updated_at: string;
  // Computed fields
  booked_count?: number;
  bookedCount?: number;
  remaining_capacity?: number;
  remainingSeats?: number;
}

export type BookingStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
export type BookingSource = 'ONLINE' | 'ADMIN';

export interface Booking {
  id: number | string;
  doc_id?: string;
  booking_id: string; // e.g. "GA-2026-0001"
  pass_code?: string;
  user_id: number | string;
  slot_id?: number;
  devotee_name: string;
  phone: string;
  email: string;
  number_of_people: number;
  address?: string;
  special_request?: string;
  status: BookingStatus;
  booking_source?: BookingSource;
  pass_id?: string;
  passId?: string;
  pass_generated?: boolean;
  passGenerated?: boolean;
  email_sent?: boolean;
  emailSent?: boolean;
  email_status?: 'NOT_SENT' | 'SENDING' | 'SENT' | 'FAILED';
  emailStatus?: 'NOT_SENT' | 'SENDING' | 'SENT' | 'FAILED';
  email_sent_at?: string;
  emailSentAt?: string;
  email_error?: string;
  emailError?: string;
  created_at: string;
  updated_at?: string;
  tokenNumber?: number;
  token_number?: number;
  // Joined fields
  slot_date?: string;
  slot_start_time?: string;
  slot_end_time?: string;
}

export interface AdminActivity {
  id: number;
  admin_id: number;
  admin_name?: string;
  action: string;
  booking_id?: string;
  description: string;
  created_at: string;
}

export interface DashboardStats {
  total_bookings: number;
  pending_bookings: number;
  accepted_bookings: number;
  rejected_bookings: number;
  cancelled_bookings: number;
  completed_bookings: number;
  today_bookings: number;
  upcoming_bookings: number;
  total_users: number;
  total_devotees: number;
}

export interface WhatsAppContactNumber {
  id: string;
  label: string; // e.g. "Aarti Pass", "Donation", "General Enquiry", "Mandal Office"
  phoneNumber: string; // e.g. "+91 7724095705" or "7724095705"
  active: boolean;
  isDefault: boolean;
}

export interface AdminWhatsAppSettings {
  whatsappNumbers: WhatsAppContactNumber[];
  updatedAt?: string;
  updatedBy?: string;
}

export type PaymentMode = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER';

export interface ChandaReceipt {
  id?: string;
  receiptId?: string;
  receiptNumber: string;
  donorName: string;
  mobileNumber?: string; // Permanently stored in Firestore for admin receipt management & WhatsApp sharing
  amount: number;
  amountInWords: string;
  paymentMode: PaymentMode;
  donationDate: string; // YYYY-MM-DD
  collectedBy: string;
  purpose: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  // Session fallback helper
  temporaryMobile?: string;
}

export interface ChandaStats {
  totalCollected: number;
  todayCollection: number;
  thisMonthCollection: number;
  totalDonations: number;
  cashCollection: number;
  upiCollection: number;
  bankTransferCollection: number;
  otherCollection: number;
}

export interface ExpenseRecord {
  id?: string;
  expenseId?: string;
  expenseNumber: string; // e.g. "NYGMM-EXP-0001"
  expenseDate: string; // YYYY-MM-DD
  amount: number;
  category: string;
  paymentMode: PaymentMode | 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'OTHER';
  paidTo: string;
  recordedBy: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface ExpenseStats {
  totalSpending: number;
  todaySpending: number;
  thisMonthSpending: number;
  totalExpenses: number;
  categorySpending: Record<string, number>;
  paymentModeSpending: Record<string, number>;
}

