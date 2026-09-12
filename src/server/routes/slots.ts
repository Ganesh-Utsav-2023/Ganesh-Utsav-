import { Router } from 'express';
import { db } from '../db.ts';
import { requireAdmin, AuthRequest, getSqliteUserId } from '../auth.ts';
import { broadcastEvent } from '../websocket.ts';

const router = Router();

// GET /api/slots - list slots with live capacity
router.get('/', (req, res) => {
  try {
    const { date } = req.query;

    let query = `
      SELECT 
        s.*,
        COALESCE(
          (SELECT SUM(b.number_of_people) 
           FROM bookings b 
           WHERE b.slot_id = s.id AND b.status IN ('PENDING', 'ACCEPTED')),
          0
        ) AS booked_count
      FROM aarti_slots s
    `;

    const params: any[] = [];
    if (date) {
      query += ` WHERE s.date = ?`;
      params.push(date);
    }

    query += ` ORDER BY s.date ASC, s.start_time ASC`;

    const slots = db.prepare(query).all(...params) as any[];

    // Calculate remaining capacity and dynamic status
    const formatted = slots.map(slot => {
      const booked = Number(slot.booked_count) || 0;
      const capacity = Number(slot.capacity) || 50;
      const remaining = Math.max(0, capacity - booked);
      
      let dynamicStatus = slot.status;
      if (slot.status === 'AVAILABLE' && remaining <= 0) {
        dynamicStatus = 'FULL';
      }

      return {
        ...slot,
        booked_count: booked,
        remaining_capacity: remaining,
        status: dynamicStatus
      };
    });

    return res.json({ slots: formatted });
  } catch (error: any) {
    console.error('Fetch slots error:', error);
    return res.status(500).json({ error: 'Failed to fetch Aarti slots.' });
  }
});

// GET /api/slots/dates - distinct dates with slots
router.get('/dates', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT DISTINCT date 
      FROM aarti_slots 
      ORDER BY date ASC
    `).all() as { date: string }[];

    return res.json({ dates: rows.map(r => r.date) });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch dates.' });
  }
});

// POST /api/slots - create single slot (admin)
router.post('/', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { date, start_time, end_time, capacity } = req.body;

    if (!date || !start_time || !end_time) {
      return res.status(400).json({ error: 'Date, start time, and end time are required.' });
    }

    const slotCapacity = Number(capacity) || 50;
    const now = new Date().toISOString();

    const result = db.prepare(`
      INSERT INTO aarti_slots (date, start_time, end_time, capacity, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'AVAILABLE', ?, ?)
    `).run(date, start_time, end_time, slotCapacity, now, now);

    const newSlotId = Number(result.lastInsertRowid);

    // Record admin activity
    try {
      const adminId = getSqliteUserId(req.user);
      db.prepare(`
        INSERT INTO admin_activity (admin_id, action, description, created_at)
        VALUES (?, 'CREATE_SLOT', ?, ?)
      `).run(
        adminId,
        `Created Aarti slot for ${date} (${start_time} - ${end_time}) with capacity ${slotCapacity}`,
        now
      );
    } catch (actErr) {
      console.warn('Admin activity logging notice:', actErr);
    }

    const slot = db.prepare('SELECT * FROM aarti_slots WHERE id = ?').get(newSlotId) as any;
    slot.booked_count = 0;
    slot.remaining_capacity = slotCapacity;

    broadcastEvent('SLOT_CREATED', slot);

    return res.status(201).json({ message: 'Aarti slot created successfully.', slot });
  } catch (error: any) {
    console.error('Create slot error:', error);
    return res.status(500).json({ error: 'Failed to create slot.' });
  }
});

// POST /api/slots/batch - batch generate slots for a date (admin)
router.post('/batch', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { date, default_capacity, slots } = req.body;

    if (!date || !Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({ error: 'Date and an array of slots are required.' });
    }

    const capacity = Number(default_capacity) || 50;
    const now = new Date().toISOString();
    const insertStmt = db.prepare(`
      INSERT INTO aarti_slots (date, start_time, end_time, capacity, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'AVAILABLE', ?, ?)
    `);

    let createdCount = 0;
    for (const s of slots) {
      if (s.start_time && s.end_time) {
        insertStmt.run(date, s.start_time, s.end_time, s.capacity || capacity, now, now);
        createdCount++;
      }
    }

    // Record activity
    try {
      const adminId = getSqliteUserId(req.user);
      db.prepare(`
        INSERT INTO admin_activity (admin_id, action, description, created_at)
        VALUES (?, 'BATCH_CREATE_SLOTS', ?, ?)
      `).run(
        adminId,
        `Generated ${createdCount} Aarti slots for date ${date}`,
        now
      );
    } catch (actErr) {
      console.warn('Admin activity logging notice:', actErr);
    }

    broadcastEvent('SLOTS_BATCH_CREATED', { date, count: createdCount });

    return res.status(201).json({ message: `Successfully created ${createdCount} Aarti slots for ${date}.` });
  } catch (error: any) {
    console.error('Batch create slots error:', error);
    return res.status(500).json({ error: 'Failed to batch create slots.' });
  }
});

// PUT /api/slots/:id - update slot (admin)
router.put('/:id', requireAdmin, (req: AuthRequest, res) => {
  try {
    const slotId = Number(req.params.id);
    const { start_time, end_time, capacity, status } = req.body;

    const existing = db.prepare('SELECT * FROM aarti_slots WHERE id = ?').get(slotId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Aarti slot not found.' });
    }

    const updatedStartTime = start_time || existing.start_time;
    const updatedEndTime = end_time || existing.end_time;
    const updatedCapacity = capacity !== undefined ? Number(capacity) : existing.capacity;
    const updatedStatus = status || existing.status;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE aarti_slots
      SET start_time = ?, end_time = ?, capacity = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).run(updatedStartTime, updatedEndTime, updatedCapacity, updatedStatus, now, slotId);

    // Record admin activity
    try {
      const adminId = getSqliteUserId(req.user);
      db.prepare(`
        INSERT INTO admin_activity (admin_id, action, description, created_at)
        VALUES (?, 'UPDATE_SLOT', ?, ?)
      `).run(
        adminId,
        `Updated slot #${slotId} (${existing.date}): status ${updatedStatus}, capacity ${updatedCapacity}`,
        now
      );
    } catch (actErr) {
      console.warn('Admin activity logging notice:', actErr);
    }

    const updated = db.prepare('SELECT * FROM aarti_slots WHERE id = ?').get(slotId);
    broadcastEvent('SLOT_UPDATED', updated);

    return res.json({ message: 'Slot updated successfully.', slot: updated });
  } catch (error: any) {
    console.error('Update slot error:', error);
    return res.status(500).json({ error: 'Failed to update slot.' });
  }
});

// DELETE /api/slots/:id - delete slot (admin)
router.delete('/:id', requireAdmin, (req: AuthRequest, res) => {
  try {
    const slotId = Number(req.params.id);

    const existing = db.prepare('SELECT * FROM aarti_slots WHERE id = ?').get(slotId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Slot not found.' });
    }

    // Check if there are active bookings
    const activeBookings = db.prepare(`
      SELECT COUNT(*) as count 
      FROM bookings 
      WHERE slot_id = ? AND status IN ('PENDING', 'ACCEPTED')
    `).get(slotId) as { count: number };

    if (activeBookings.count > 0) {
      return res.status(400).json({
        error: `Cannot delete this slot because it has ${activeBookings.count} active booking(s). Please cancel or reassign them first.`
      });
    }

    db.prepare('DELETE FROM aarti_slots WHERE id = ?').run(slotId);

    const now = new Date().toISOString();
    try {
      const adminId = getSqliteUserId(req.user);
      db.prepare(`
        INSERT INTO admin_activity (admin_id, action, description, created_at)
        VALUES (?, 'DELETE_SLOT', ?, ?)
      `).run(
        adminId,
        `Deleted slot #${slotId} (${existing.date} ${existing.start_time})`,
        now
      );
    } catch (actErr) {
      console.warn('Admin activity logging notice:', actErr);
    }

    broadcastEvent('SLOT_DELETED', { slotId });

    return res.json({ message: 'Aarti slot deleted successfully.' });
  } catch (error: any) {
    console.error('Delete slot error:', error);
    return res.status(500).json({ error: 'Failed to delete slot.' });
  }
});

export default router;
