import { Router } from 'express';
import { db } from '../db.ts';
import { requireAdmin, AuthRequest } from '../auth.ts';

const router = Router();

// GET /api/activity - list admin activity log
router.get('/', requireAdmin, (req: AuthRequest, res) => {
  try {
    const activities = db.prepare(`
      SELECT 
        a.*,
        u.full_name as admin_name,
        u.email as admin_email
      FROM admin_activity a
      LEFT JOIN users u ON a.admin_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 100
    `).all();

    return res.json({ activities });
  } catch (error: any) {
    console.error('Fetch activity log error:', error);
    return res.status(500).json({ error: 'Failed to fetch activity logs.' });
  }
});

export default router;
