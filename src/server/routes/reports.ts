import { Router } from 'express';
import { db } from '../db.ts';
import { requireAdmin, AuthRequest } from '../auth.ts';

const router = Router();

// GET /api/reports/stats - high-level summary cards
router.get('/stats', requireAdmin, (req: AuthRequest, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const totalRow = db.prepare('SELECT COUNT(*) as count FROM bookings').get() as { count: number };
    const pendingRow = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'PENDING'").get() as { count: number };
    const acceptedRow = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'ACCEPTED'").get() as { count: number };
    const rejectedRow = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'REJECTED'").get() as { count: number };
    const cancelledRow = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'CANCELLED'").get() as { count: number };
    const completedRow = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'COMPLETED'").get() as { count: number };

    // Today's bookings
    const todayRow = db.prepare(`
      SELECT COUNT(*) as count 
      FROM bookings b
      JOIN aarti_slots s ON b.slot_id = s.id
      WHERE s.date = ?
    `).get(today) as { count: number };

    // Upcoming bookings (>= today)
    const upcomingRow = db.prepare(`
      SELECT COUNT(*) as count 
      FROM bookings b
      JOIN aarti_slots s ON b.slot_id = s.id
      WHERE s.date >= ? AND b.status IN ('PENDING', 'ACCEPTED')
    `).get(today) as { count: number };

    const totalUsersRow = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'user' AND lower(email) != 'navyuvakganeshmitramandal14@gmail.com'").get() as { count: number };
    const totalDevoteesRow = db.prepare("SELECT COALESCE(SUM(number_of_people), 0) as total FROM bookings WHERE status IN ('PENDING', 'ACCEPTED', 'COMPLETED')").get() as { total: number };

    return res.json({
      stats: {
        total_bookings: totalRow.count,
        pending_bookings: pendingRow.count,
        accepted_bookings: acceptedRow.count,
        rejected_bookings: rejectedRow.count,
        cancelled_bookings: cancelledRow.count,
        completed_bookings: completedRow.count,
        today_bookings: todayRow.count,
        upcoming_bookings: upcomingRow.count,
        total_users: totalUsersRow.count,
        total_devotees: totalDevoteesRow.total
      }
    });
  } catch (error: any) {
    console.error('Stats error:', error);
    return res.status(500).json({ error: 'Failed to generate statistics.' });
  }
});

// GET /api/reports/analytics - detailed breakdown with date filters
router.get('/analytics', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { start_date, end_date } = req.query;

    let dateFilter = '';
    const params: any[] = [];
    if (start_date && end_date) {
      dateFilter = ' WHERE s.date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    } else if (start_date) {
      dateFilter = ' WHERE s.date >= ?';
      params.push(start_date);
    } else if (end_date) {
      dateFilter = ' WHERE s.date <= ?';
      params.push(end_date);
    }

    // Bookings per date
    const dateQuery = `
      SELECT 
        s.date,
        COUNT(b.id) as total_bookings,
        COALESCE(SUM(b.number_of_people), 0) as total_people,
        SUM(CASE WHEN b.status = 'ACCEPTED' THEN 1 ELSE 0 END) as accepted,
        SUM(CASE WHEN b.status = 'PENDING' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN b.status = 'REJECTED' THEN 1 ELSE 0 END) as rejected
      FROM aarti_slots s
      LEFT JOIN bookings b ON b.slot_id = s.id
      ${dateFilter}
      GROUP BY s.date
      ORDER BY s.date ASC
    `;
    const bookingsByDate = db.prepare(dateQuery).all(...params);

    // Bookings per slot timing
    const slotQuery = `
      SELECT 
        s.start_time || ' - ' || s.end_time as slot_time,
        COUNT(b.id) as total_bookings,
        COALESCE(SUM(b.number_of_people), 0) as total_devotees
      FROM aarti_slots s
      LEFT JOIN bookings b ON b.slot_id = s.id
      ${dateFilter}
      GROUP BY slot_time
      ORDER BY total_bookings DESC
    `;
    const bookingsBySlot = db.prepare(slotQuery).all(...params);

    // Status breakdown
    const statusQuery = `
      SELECT 
        b.status,
        COUNT(*) as count
      FROM bookings b
      JOIN aarti_slots s ON b.slot_id = s.id
      ${dateFilter}
      GROUP BY b.status
    `;
    const statusBreakdown = db.prepare(statusQuery).all(...params);

    // Source breakdown
    const sourceQuery = `
      SELECT 
        b.booking_source,
        COUNT(*) as count
      FROM bookings b
      JOIN aarti_slots s ON b.slot_id = s.id
      ${dateFilter}
      GROUP BY b.booking_source
    `;
    const sourceBreakdown = db.prepare(sourceQuery).all(...params);

    return res.json({
      bookingsByDate,
      bookingsBySlot,
      statusBreakdown,
      sourceBreakdown
    });
  } catch (error: any) {
    console.error('Analytics error:', error);
    return res.status(500).json({ error: 'Failed to fetch analytics report.' });
  }
});

export default router;
