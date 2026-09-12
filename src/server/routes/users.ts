import { Router } from 'express';
import { db } from '../db.ts';
import { requireAdmin, AuthRequest, getSqliteUserId } from '../auth.ts';

const router = Router();

// GET /api/users - list users with booking statistics (Admin)
router.get('/', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { search } = req.query;

    let query = `
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.phone,
        u.role,
        u.created_at,
        u.updated_at,
        COUNT(b.id) as total_bookings,
        SUM(CASE WHEN b.status = 'ACCEPTED' THEN 1 ELSE 0 END) as accepted_bookings
      FROM users u
      LEFT JOIN bookings b ON b.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      query += ` AND (u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    query += ` GROUP BY u.id ORDER BY u.created_at DESC`;

    const users = db.prepare(query).all(...params);

    return res.json({ users });
  } catch (error: any) {
    console.error('Fetch users error:', error);
    return res.status(500).json({ error: 'Failed to fetch users list.' });
  }
});

// PUT /api/users/:id/role - promote or demote role (Admin)
router.put('/:id/role', requireAdmin, (req: AuthRequest, res) => {
  try {
    const targetUserId = Number(req.params.id);
    const { role } = req.body;

    if (role !== 'user' && role !== 'admin') {
      return res.status(400).json({ error: 'Role must be user or admin.' });
    }

    if (targetUserId === req.user!.id && role !== 'admin') {
      return res.status(400).json({ error: 'You cannot remove admin privileges from yourself.' });
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?').run(role, now, targetUserId);

    // Record activity
    try {
      const adminId = getSqliteUserId(req.user);
      db.prepare(`
        INSERT INTO admin_activity (admin_id, action, description, created_at)
        VALUES (?, 'CHANGE_USER_ROLE', ?, ?)
      `).run(
        adminId,
        `Changed user #${targetUserId} role to ${role}`,
        now
      );
    } catch (actErr) {
      console.warn('Admin activity logging notice:', actErr);
    }

    return res.json({ message: `User role successfully updated to ${role}.` });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update user role.' });
  }
});

export default router;
