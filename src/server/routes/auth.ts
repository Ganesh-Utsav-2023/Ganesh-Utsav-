import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { db } from '../db.ts';
import { generateToken, authenticate, AuthRequest } from '../auth.ts';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { full_name, email, phone, password, confirm_password } = req.body;

    if (!full_name || !email || !phone || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    if (confirm_password && password !== confirm_password) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if email already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();

    const result = db.prepare(`
      INSERT INTO users (full_name, email, phone, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'user', ?, ?)
    `).run(full_name.trim(), normalizedEmail, phone.trim(), password_hash, now, now);

    const user = {
      id: Number(result.lastInsertRowid),
      full_name: full_name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      role: 'user' as const,
      created_at: now,
      updated_at: now
    };

    const token = generateToken(user);

    return res.status(201).json({
      message: 'Account registered successfully. Jai Shree Ganesh!',
      token,
      user
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const userRow = db.prepare(`
      SELECT id, full_name, email, phone, password_hash, role, created_at, updated_at
      FROM users WHERE email = ?
    `).get(normalizedEmail) as any;

    if (!userRow) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, userRow.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = {
      id: userRow.id,
      full_name: userRow.full_name,
      email: userRow.email,
      phone: userRow.phone,
      role: userRow.role as 'user' | 'admin',
      created_at: userRow.created_at,
      updated_at: userRow.updated_at
    };

    const token = generateToken(user);

    return res.json({
      message: 'Welcome back!',
      token,
      user
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req: AuthRequest, res) => {
  try {
    const userRow = db.prepare(`
      SELECT id, full_name, email, phone, role, created_at, updated_at
      FROM users WHERE id = ?
    `).get(req.user!.id) as any;

    if (!userRow) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json({ user: userRow });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticate, async (req: AuthRequest, res) => {
  try {
    const { full_name, phone, current_password, new_password } = req.body;
    const userId = req.user!.id;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    let passwordHash = user.password_hash;
    if (new_password) {
      if (!current_password) {
        return res.status(400).json({ error: 'Current password is required to set a new password.' });
      }
      const match = await bcrypt.compare(current_password, user.password_hash);
      if (!match) {
        return res.status(400).json({ error: 'Incorrect current password.' });
      }
      if (new_password.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters.' });
      }
      passwordHash = await bcrypt.hash(new_password, 10);
    }

    const updatedName = full_name?.trim() || user.full_name;
    const updatedPhone = phone?.trim() || user.phone;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE users
      SET full_name = ?, phone = ?, password_hash = ?, updated_at = ?
      WHERE id = ?
    `).run(updatedName, updatedPhone, passwordHash, now, userId);

    const updatedUser = {
      id: user.id,
      full_name: updatedName,
      email: user.email,
      phone: updatedPhone,
      role: user.role,
      created_at: user.created_at,
      updated_at: now
    };

    return res.json({
      message: 'Profile updated successfully.',
      user: updatedUser
    });
  } catch (error: any) {
    console.error('Profile update error:', error);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail) as any;

    if (!user) {
      // Return success message even if email does not exist for security
      return res.json({
        message: 'If an account exists with this email, password reset instructions have been generated.',
        reset_token: null
      });
    }

    const resetToken = crypto.randomBytes(24).toString('hex');
    const expires = new Date(Date.now() + 3600000).toISOString(); // 1 hour

    db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?').run(
      resetToken,
      expires,
      user.id
    );

    return res.json({
      message: 'Password reset code generated.',
      reset_token: resetToken
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to process request.' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { reset_token, new_password, email } = req.body;

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    let user: any = null;

    if (reset_token) {
      user = db.prepare(`
        SELECT id, reset_token_expires
        FROM users
        WHERE reset_token = ?
      `).get(reset_token);
    } else if (email) {
      user = db.prepare(`
        SELECT id, reset_token_expires
        FROM users
        WHERE email = ?
      `).get(email.trim().toLowerCase());
    }

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired password reset request.' });
    }

    const newHash = await bcrypt.hash(new_password, 10);
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE users
      SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL, updated_at = ?
      WHERE id = ?
    `).run(newHash, now, user.id);

    return res.json({ message: 'Password has been reset successfully. Please log in with your new password.' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to reset password.' });
  }
});

export default router;
