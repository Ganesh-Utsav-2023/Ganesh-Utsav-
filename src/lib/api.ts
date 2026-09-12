import { User, AartiSlot, Booking, AdminActivity, DashboardStats } from '../types/index.ts';

const TOKEN_KEY = 'ganesh_aarti_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(data.error || 'Too many requests. Please wait a moment and try again.');
    }
    throw new Error(data.error || `HTTP error ${response.status}`);
  }

  return data;
}

export const api = {
  // Auth
  register: (body: { full_name: string; email: string; phone: string; password: string; confirm_password?: string }) =>
    request<{ message: string; token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    request<{ message: string; token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getMe: () => request<{ user: User }>('/api/auth/me'),

  updateProfile: (body: { full_name?: string; phone?: string; current_password?: string; new_password?: string }) =>
    request<{ message: string; user: User }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  forgotPassword: (email: string) =>
    request<{ message: string; reset_token?: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (body: { email?: string; reset_token?: string; new_password: string }) =>
    request<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // Slots
  getSlots: (date?: string) =>
    request<{ slots: AartiSlot[] }>(`/api/slots${date ? `?date=${encodeURIComponent(date)}` : ''}`),

  getSlotDates: () => request<{ dates: string[] }>('/api/slots/dates'),

  createSlot: (body: { date: string; start_time: string; end_time: string; capacity: number }) =>
    request<{ message: string; slot: AartiSlot }>('/api/slots', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  batchCreateSlots: (body: { date: string; default_capacity?: number; slots: { start_time: string; end_time: string; capacity?: number }[] }) =>
    request<{ message: string }>('/api/slots/batch', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateSlot: (id: number, body: { start_time?: string; end_time?: string; capacity?: number; status?: string }) =>
    request<{ message: string; slot: AartiSlot }>(`/api/slots/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  deleteSlot: (id: number) =>
    request<{ message: string }>(`/api/slots/${id}`, {
      method: 'DELETE',
    }),

  // Bookings - Devotee / Public Lookup
  lookupBooking: (body: { booking_id: string; phone: string }) =>
    request<{ booking: Booking }>('/api/bookings/lookup', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getMyBookings: () => request<{ bookings: Booking[] }>('/api/bookings/my'),

  getMyBooking: (id: string | number) => request<{ booking: Booking }>(`/api/bookings/my/${id}`),

  createBooking: (body: {
    slot_id: number;
    devotee_name: string;
    phone: string;
    email: string;
    number_of_people: number;
    address: string;
    special_request?: string;
    userId?: string;
    user_id?: string;
    status?: string;
    bookingSource?: string;
  }) =>
    request<{ message: string; booking: Booking }>('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  cancelMyBooking: (id: string | number) =>
    request<{ message: string; booking: Booking }>(`/api/bookings/my/${id}/cancel`, {
      method: 'PUT',
    }),

  // Bookings - Admin
  getAdminBookings: (params: { search?: string; status?: string; date?: string; booking_source?: string; sort?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.status) query.append('status', params.status);
    if (params.date) query.append('date', params.date);
    if (params.booking_source) query.append('booking_source', params.booking_source);
    if (params.sort) query.append('sort', params.sort);
    return request<{ bookings: Booking[] }>(`/api/bookings/admin/all?${query.toString()}`);
  },

  adminCreateBooking: (body: {
    name: string;
    phone: string;
    email?: string;
    slot_id: number;
    number_of_people: number;
    address?: string;
    notes?: string;
    status?: 'PENDING' | 'ACCEPTED';
  }) =>
    request<{ message: string; booking: Booking }>('/api/bookings/admin/create', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  adminUpdateBookingStatus: (id: string | number, body: { status: string; reason?: string }) =>
    request<{ message: string; booking: Booking }>(`/api/bookings/admin/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  adminEditBooking: (id: string | number, body: Partial<Booking>) =>
    request<{ message: string; booking: Booking }>(`/api/bookings/admin/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  adminDeleteBooking: (id: string | number) =>
    request<{ message: string }>(`/api/bookings/admin/${id}`, {
      method: 'DELETE',
    }),



  // Reports
  getStats: () => request<{ stats: DashboardStats }>('/api/reports/stats'),

  getAnalytics: (startDate?: string, endDate?: string) => {
    const query = new URLSearchParams();
    if (startDate) query.append('start_date', startDate);
    if (endDate) query.append('end_date', endDate);
    return request<{
      bookingsByDate: any[];
      bookingsBySlot: any[];
      statusBreakdown: any[];
      sourceBreakdown: any[];
    }>(`/api/reports/analytics?${query.toString()}`);
  },

  // Users
  getUsers: (search?: string) =>
    request<{ users: (User & { total_bookings: number; accepted_bookings: number })[] }>(
      `/api/users${search ? `?search=${encodeURIComponent(search)}` : ''}`
    ),

  updateUserRole: (id: number, role: 'user' | 'admin') =>
    request<{ message: string }>(`/api/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),

  // Activity Log
  getActivity: () => request<{ activities: AdminActivity[] }>('/api/activity'),
};
