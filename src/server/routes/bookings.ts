import { Router } from 'express';
import { db } from '../db.ts';
import { authenticate, optionalAuthenticate, requireAdmin, AuthRequest, getSqliteUserId } from '../auth.ts';
import { broadcastEvent } from '../websocket.ts';


const router = Router();

// Helper to generate next unique Booking ID like GA-2026-0001
function generateNextBookingId(): string {
  const row = db.prepare(`
    SELECT booking_id FROM bookings 
    ORDER BY id DESC LIMIT 1
  `).get() as { booking_id: string } | undefined;

  let nextSeq = 1;
  if (row && row.booking_id) {
    const match = row.booking_id.match(/GA-2026-(\d+)/);
    if (match) {
      nextSeq = parseInt(match[1], 10) + 1;
    }
  }

  return `GA-2026-${String(nextSeq).padStart(4, '0')}`;
}

// Helper to find the lowest available token number for a specific slot date
function getNextAvailableTokenSql(slotId: number): number {
  try {
    const rows = db.prepare(`
      SELECT token_number
      FROM bookings
      WHERE slot_id = ? AND status IN ('PENDING', 'ACCEPTED') AND token_number IS NOT NULL
    `).all(slotId) as { token_number: number }[];

    const usedTokens = new Set<number>();
    for (const row of rows) {
      usedTokens.add(row.token_number);
    }
    let token = 1;
    while (usedTokens.has(token)) {
      token++;
    }
    return token;
  } catch (err) {
    console.error('Error getting next available token in SQL:', err);
    return 1;
  }
}

// -------------------------------------------------------------
// Devotee (Public & Guest) Endpoints
// -------------------------------------------------------------

// POST /api/bookings/lookup - Lookup booking by Booking ID AND Mobile Number
router.post('/lookup', (req, res) => {
  try {
    const { booking_id, phone } = req.body;
    if (!booking_id || !phone) {
      return res.status(400).json({ error: 'Please enter both Booking ID and Mobile Number.' });
    }

    const cleanBookingId = String(booking_id).trim();
    const cleanPhone = String(phone).trim().replace(/[\s\-\+\(\)]/g, '');

    const booking = db.prepare(`
      SELECT 
        b.*,
        s.date AS slot_date,
        s.start_time AS slot_start_time,
        s.end_time AS slot_end_time
      FROM bookings b
      LEFT JOIN aarti_slots s ON b.slot_id = s.id
      WHERE LOWER(b.booking_id) = LOWER(?) AND REPLACE(REPLACE(REPLACE(b.phone, ' ', ''), '-', ''), '+', '') LIKE ?
    `).get(cleanBookingId, `%${cleanPhone.slice(-10)}%`);

    if (!booking) {
      return res.status(404).json({ error: 'No booking found matching this Booking ID and Mobile Number combination.' });
    }

    return res.json({ booking });
  } catch (error: any) {
    console.error('Lookup booking error:', error);
    return res.status(500).json({ error: 'Failed to lookup booking.' });
  }
});

// GET /api/bookings/my - devotee's list of bookings
router.get('/my', optionalAuthenticate, (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.json({ bookings: [] });
    }
    const userId = req.user.id;
    const bookings = db.prepare(`
      SELECT 
        b.*,
        s.date AS slot_date,
        s.start_time AS slot_start_time,
        s.end_time AS slot_end_time
      FROM bookings b
      LEFT JOIN aarti_slots s ON b.slot_id = s.id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
    `).all(userId);

    return res.json({ bookings });
  } catch (error: any) {
    console.error('Fetch my bookings error:', error);
    return res.status(500).json({ error: 'Failed to fetch your bookings.' });
  }
});

// POST /api/bookings - create booking online without requiring login
router.post('/', optionalAuthenticate, (req: AuthRequest, res) => {
  try {
    const userId = req.user ? req.user.id : (req.body.userId || req.body.user_id || 'guest');
    const slot_id = req.body.slot_id || req.body.slotId;
    const devotee_name = req.body.devotee_name || req.body.devoteeName;
    const phone = req.body.phone || req.body.mobile;
    const email = req.body.email;
    const number_of_people = req.body.number_of_people ?? req.body.numberOfPeople ?? 1;
    const address = req.body.address;
    const special_request = req.body.special_request || req.body.specialRequest;
    const reqStatus = req.body.status;
    const reqBookingSource = req.body.booking_source || req.body.bookingSource;

    if (!slot_id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid booking data',
          field: 'slot_id',
          details: 'Slot ID is required'
        }
      });
    }

    if (!devotee_name || typeof devotee_name !== 'string' || !devotee_name.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid booking data',
          field: 'devotee_name',
          details: 'Devotee name is required'
        }
      });
    }

    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid booking data',
          field: 'phone',
          details: 'Mobile number is required'
        }
      });
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid booking data',
          field: 'email',
          details: 'Valid email address is required'
        }
      });
    }

    const people = Number(number_of_people);
    if (isNaN(people) || people < 1 || !Number.isInteger(people)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid booking data',
          field: 'number_of_people',
          details: 'Expected a positive integer for numberOfPeople'
        }
      });
    }

    if (people > 15) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid booking data',
          field: 'number_of_people',
          details: 'Maximum 15 devotees permitted per booking'
        }
      });
    }

    // Check slot availability
    const slot = db.prepare('SELECT * FROM aarti_slots WHERE id = ?').get(slot_id) as any;
    if (!slot) {
      return res.status(404).json({ error: 'Selected Aarti slot does not exist.' });
    }

    if (slot.status === 'CLOSED') {
      return res.status(400).json({ error: 'This Aarti slot is currently closed for bookings.' });
    }

    // Check current capacity
    const currentBooked = db.prepare(`
      SELECT COALESCE(SUM(number_of_people), 0) as total
      FROM bookings
      WHERE slot_id = ? AND status IN ('PENDING', 'ACCEPTED')
    `).get(slot_id) as { total: number };

    const remaining = slot.capacity - currentBooked.total;
    if (people > remaining) {
      return res.status(400).json({
        error: `Only ${Math.max(0, remaining)} seats remain in this Aarti slot. Cannot book for ${people} people.`
      });
    }

    const bookingId = generateNextBookingId();
    const now = new Date().toISOString();
    const calculatedToken = getNextAvailableTokenSql(slot_id);

    const bookingStatus = (reqStatus === 'ACCEPTED' || reqStatus === 'PENDING') ? reqStatus : 'PENDING';
    const isRoleAdmin = req.user?.role === 'admin' || (req.user?.role as any) === 'ADMIN';
    const bookingSource = reqBookingSource || req.body.bookingSource || (isRoleAdmin ? 'ADMIN' : 'ONLINE');

    const insertResult = db.prepare(`
      INSERT INTO bookings (
        booking_id, user_id, slot_id, devotee_name, phone, email,
        number_of_people, address, special_request, status, booking_source,
        token_number, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      bookingId,
      userId,
      slot_id,
      devotee_name.trim(),
      phone.trim(),
      email.trim().toLowerCase(),
      people,
      address?.trim() || '',
      special_request?.trim() || '',
      bookingStatus,
      bookingSource,
      calculatedToken,
      now,
      now
    );

    const newBooking = db.prepare(`
      SELECT 
        b.*,
        s.date AS slot_date,
        s.start_time AS slot_start_time,
        s.end_time AS slot_end_time
      FROM bookings b
      LEFT JOIN aarti_slots s ON b.slot_id = s.id
      WHERE b.id = ?
    `).get(insertResult.lastInsertRowid);

    // Broadcast to admins & active clients
    broadcastEvent('NEW_BOOKING', newBooking);

    return res.status(201).json({
      message: 'Your Aarti booking request has been successfully submitted.',
      booking: newBooking
    });
  } catch (error: any) {
    console.error('Create booking error:', error);
    return res.status(500).json({ error: String(error) });
  }
});

// PUT /api/bookings/my/:id/cancel - devotee cancels booking
router.put('/my/:id/cancel', authenticate, (req: AuthRequest, res) => {
  try {
    const bookingId = req.params.id;
    const userEmail = (req.user?.email || '').trim().toLowerCase();
    const userIdStr = String(req.user?.id || '');

    const booking = db.prepare(`
      SELECT * FROM bookings 
      WHERE (id = ? OR booking_id = ?) 
        AND (user_id = ? OR user_id = ? OR (LOWER(email) = ? AND ? != ''))
    `).get(bookingId, bookingId, req.user!.id, userIdStr, userEmail, userEmail) as any;

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found or you do not have permission to cancel this booking.' });
    }

    if (booking.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Booking is already cancelled.' });
    }

    if (booking.status === 'REJECTED') {
      return res.status(400).json({ error: 'This booking was rejected.' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE bookings
      SET status = 'CANCELLED', token_number = NULL, updated_at = ?
      WHERE id = ?
    `).run(now, booking.id);

    const updatedBooking = db.prepare(`
      SELECT 
        b.*,
        s.date AS slot_date,
        s.start_time AS slot_start_time,
        s.end_time AS slot_end_time
      FROM bookings b
      LEFT JOIN aarti_slots s ON b.slot_id = s.id
      WHERE b.id = ?
    `).get(booking.id);

    broadcastEvent('BOOKING_UPDATED', updatedBooking);

    return res.json({
      message: 'Your Aarti booking has been cancelled.',
      booking: updatedBooking
    });
  } catch (error: any) {
    console.error('Cancel booking error:', error);
    return res.status(500).json({ error: 'Failed to cancel booking.' });
  }
});

// -------------------------------------------------------------
// Admin Endpoints
// -------------------------------------------------------------

// GET /api/bookings/admin/all - all bookings with search, filter, sort
router.get('/admin/all', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { search, status, date, booking_source, sort } = req.query;

    let query = `
      SELECT 
        b.*,
        s.date AS slot_date,
        s.start_time AS slot_start_time,
        s.end_time AS slot_end_time
      FROM bookings b
      LEFT JOIN aarti_slots s ON b.slot_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      query += ` AND (
        b.booking_id LIKE ? OR 
        b.devotee_name LIKE ? OR 
        b.phone LIKE ? OR 
        b.email LIKE ?
      )`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (status && status !== 'ALL') {
      query += ` AND b.status = ?`;
      params.push(status);
    }

    if (date) {
      query += ` AND s.date = ?`;
      params.push(date);
    }

    if (booking_source && booking_source !== 'ALL') {
      query += ` AND b.booking_source = ?`;
      params.push(booking_source);
    }

    // Sort
    if (sort === 'oldest') {
      query += ` ORDER BY b.created_at ASC`;
    } else if (sort === 'date') {
      query += ` ORDER BY s.date ASC, s.start_time ASC`;
    } else if (sort === 'status') {
      query += ` ORDER BY b.status ASC, b.created_at DESC`;
    } else {
      // Default: newest
      query += ` ORDER BY b.created_at DESC`;
    }

    const bookings = db.prepare(query).all(...params);

    return res.json({ bookings });
  } catch (error: any) {
    console.error('Admin fetch bookings error:', error);
    return res.status(500).json({ error: 'Failed to fetch bookings.' });
  }
});

// POST /api/bookings/admin/create - manual booking by admin
router.post('/admin/create', requireAdmin, (req: AuthRequest, res) => {
  try {
    const adminId = getSqliteUserId(req.user);
    const {
      name,
      phone,
      email,
      slot_id,
      number_of_people,
      address,
      notes,
      status
    } = req.body;

    if (!name || !phone || !slot_id) {
      return res.status(400).json({ error: 'Devotee name, phone, and slot are required.' });
    }

    const people = Math.max(1, Number(number_of_people) || 1);
    const slot = db.prepare('SELECT * FROM aarti_slots WHERE id = ?').get(slot_id) as any;
    if (!slot) {
      return res.status(404).json({ error: 'Aarti slot not found.' });
    }

    // Check capacity
    const currentBooked = db.prepare(`
      SELECT COALESCE(SUM(number_of_people), 0) as total
      FROM bookings
      WHERE slot_id = ? AND status IN ('PENDING', 'ACCEPTED')
    `).get(slot_id) as { total: number };

    const remaining = slot.capacity - currentBooked.total;
    if (people > remaining) {
      return res.status(400).json({
        error: `Only ${Math.max(0, remaining)} seats remain in this slot. Cannot book for ${people} people.`
      });
    }

    // Associate or create a user account for offline devotee
    const devoteeEmail = email?.trim().toLowerCase() || `offline_${Date.now()}@mandal.local`;
    let user = db.prepare('SELECT id FROM users WHERE email = ?').get(devoteeEmail) as { id: number } | undefined;

    const now = new Date().toISOString();
    if (!user) {
      // Create guest user
      const insertUser = db.prepare(`
        INSERT INTO users (full_name, email, phone, password_hash, role, created_at, updated_at)
        VALUES (?, ?, ?, 'OFFLINE_NO_PASSWORD', 'user', ?, ?)
      `).run(name.trim(), devoteeEmail, phone.trim(), now, now);
      user = { id: Number(insertUser.lastInsertRowid) };
    }

    const bookingId = generateNextBookingId();
    const initialStatus = status === 'ACCEPTED' ? 'ACCEPTED' : 'PENDING';
    const calculatedToken = getNextAvailableTokenSql(slot_id);

    const insertResult = db.prepare(`
      INSERT INTO bookings (
        booking_id, user_id, slot_id, devotee_name, phone, email,
        number_of_people, address, special_request, status, booking_source,
        token_number, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ADMIN', ?, ?, ?)
    `).run(
      bookingId,
      user.id,
      slot_id,
      name.trim(),
      phone.trim(),
      devoteeEmail,
      people,
      address?.trim() || 'Offline / Walk-in Registration',
      notes?.trim() || '',
      initialStatus,
      calculatedToken,
      now,
      now
    );

    // Record activity
    try {
      db.prepare(`
        INSERT INTO admin_activity (admin_id, action, booking_id, description, created_at)
        VALUES (?, 'ADMIN_MANUAL_BOOKING', ?, ?, ?)
      `).run(
        adminId,
        bookingId,
        `Manually booked Aarti for ${name.trim()} (${people} devotees) in slot #${slot_id} [Status: ${initialStatus}]`,
        now
      );
    } catch (actErr) {
      console.warn('Admin activity logging notice:', actErr);
    }

    const newBooking = db.prepare(`
      SELECT 
        b.*,
        s.date AS slot_date,
        s.start_time AS slot_start_time,
        s.end_time AS slot_end_time
      FROM bookings b
      LEFT JOIN aarti_slots s ON b.slot_id = s.id
      WHERE b.id = ?
    `).get(insertResult.lastInsertRowid);

    broadcastEvent('NEW_BOOKING', newBooking);

    return res.status(201).json({
      message: `Aarti booking ${bookingId} created successfully.`,
      booking: newBooking
    });
  } catch (error: any) {
    console.error('Admin manual booking error:', error);
    return res.status(500).json({ error: 'Failed to create manual booking.' });
  }
});



// PUT /api/bookings/admin/:id/status - accept, reject, complete, or cancel
router.put('/admin/:id/status', requireAdmin, (req: AuthRequest, res) => {
  try {
    const adminId = getSqliteUserId(req.user);
    const bookingId = req.params.id;
    const { status, reason } = req.body;

    const validStatuses = ['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'COMPLETED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid booking status.' });
    }

    const booking = db.prepare(`
      SELECT * FROM bookings WHERE id = ? OR booking_id = ?
    `).get(bookingId, bookingId) as any;

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    let reqToken = booking.token_number;
    if (status === 'PENDING' || status === 'ACCEPTED') {
      if (!reqToken) {
        reqToken = getNextAvailableTokenSql(booking.slot_id);
      }
    } else {
      reqToken = null;
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE bookings
      SET status = ?, token_number = ?, updated_at = ?
      WHERE id = ?
    `).run(status, reqToken, now, booking.id);

    // Record admin activity
    try {
      const actionName = `${status}_BOOKING`;
      const desc = reason 
        ? `Changed status of ${booking.booking_id} to ${status}. Reason: ${reason}`
        : `Changed status of ${booking.booking_id} to ${status}`;

      db.prepare(`
        INSERT INTO admin_activity (admin_id, action, booking_id, description, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(adminId, actionName, booking.booking_id, desc, now);
    } catch (actErr) {
      console.warn('Admin activity logging notice:', actErr);
    }

    const updatedBooking = db.prepare(`
      SELECT 
        b.*,
        s.date AS slot_date,
        s.start_time AS slot_start_time,
        s.end_time AS slot_end_time
      FROM bookings b
      LEFT JOIN aarti_slots s ON b.slot_id = s.id
      WHERE b.id = ?
    `).get(booking.id);

    broadcastEvent('BOOKING_UPDATED', updatedBooking);

    return res.json({
      message: `Booking ${booking.booking_id} status updated to ${status}.`,
      booking: updatedBooking
    });
  } catch (error: any) {
    console.error('Update status error:', error);
    return res.status(500).json({ error: 'Failed to update booking status.' });
  }
});

// PUT /api/bookings/admin/:id - edit booking details
router.put('/admin/:id', requireAdmin, (req: AuthRequest, res) => {
  try {
    const adminId = getSqliteUserId(req.user);
    const bookingId = req.params.id;
    const {
      devotee_name,
      phone,
      email,
      number_of_people,
      address,
      special_request,
      slot_id
    } = req.body;

    const booking = db.prepare(`
      SELECT * FROM bookings WHERE id = ? OR booking_id = ?
    `).get(bookingId, bookingId) as any;

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    const updatedName = devotee_name?.trim() || booking.devotee_name;
    const updatedPhone = phone?.trim() || booking.phone;
    const updatedEmail = email?.trim() || booking.email;
    const updatedPeople = number_of_people ? Number(number_of_people) : booking.number_of_people;
    const updatedAddress = address !== undefined ? address.trim() : booking.address;
    const updatedRequest = special_request !== undefined ? special_request.trim() : booking.special_request;
    const updatedSlotId = slot_id ? Number(slot_id) : booking.slot_id;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE bookings
      SET devotee_name = ?, phone = ?, email = ?, number_of_people = ?,
          address = ?, special_request = ?, slot_id = ?, updated_at = ?
      WHERE id = ?
    `).run(
      updatedName,
      updatedPhone,
      updatedEmail,
      updatedPeople,
      updatedAddress,
      updatedRequest,
      updatedSlotId,
      now,
      booking.id
    );

    // Record activity
    try {
      db.prepare(`
        INSERT INTO admin_activity (admin_id, action, booking_id, description, created_at)
        VALUES (?, 'EDIT_BOOKING', ?, ?, ?)
      `).run(
        adminId,
        booking.booking_id,
        `Edited details for booking ${booking.booking_id} (${updatedName})`,
        now
      );
    } catch (actErr) {
      console.warn('Admin activity logging notice:', actErr);
    }

    const updatedBooking = db.prepare(`
      SELECT 
        b.*,
        s.date AS slot_date,
        s.start_time AS slot_start_time,
        s.end_time AS slot_end_time
      FROM bookings b
      LEFT JOIN aarti_slots s ON b.slot_id = s.id
      WHERE b.id = ?
    `).get(booking.id);

    broadcastEvent('BOOKING_UPDATED', updatedBooking);

    return res.json({
      message: `Booking ${booking.booking_id} updated successfully.`,
      booking: updatedBooking
    });
  } catch (error: any) {
    console.error('Edit booking error:', error);
    return res.status(500).json({ error: 'Failed to update booking.' });
  }
});

// DELETE /api/bookings/admin/:id - delete booking
router.delete('/admin/:id', requireAdmin, (req: AuthRequest, res) => {
  try {
    const adminId = getSqliteUserId(req.user);
    const bookingId = req.params.id;

    const booking = db.prepare(`
      SELECT * FROM bookings WHERE id = ? OR booking_id = ?
    `).get(bookingId, bookingId) as any;

    if (!booking) {
      // Return success gracefully so client sync continues without error
      return res.json({ message: `Booking record ${bookingId} processed successfully.` });
    }

    db.prepare('DELETE FROM bookings WHERE id = ?').run(booking.id);

    const now = new Date().toISOString();
    try {
      db.prepare(`
        INSERT INTO admin_activity (admin_id, action, booking_id, description, created_at)
        VALUES (?, 'DELETE_BOOKING', ?, ?, ?)
      `).run(
        adminId,
        booking.booking_id,
        `Deleted booking record ${booking.booking_id} (${booking.devotee_name})`,
        now
      );
    } catch (actErr) {
      console.warn('Admin activity logging notice:', actErr);
    }

    broadcastEvent('BOOKING_DELETED', { bookingId: booking.booking_id, id: booking.id });

    return res.json({ message: `Booking ${booking.booking_id} deleted successfully.` });
  } catch (error: any) {
    console.error('Delete booking error:', {
      bookingId: req.params.id,
      error: error?.message || error,
      code: error?.code
    });
    return res.status(500).json({ error: `Failed to delete booking: ${error?.message || 'Database error'}` });
  }
});

export default router;
