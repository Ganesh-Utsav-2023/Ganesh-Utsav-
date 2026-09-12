import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from './db.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'ganesh_chaturthi_secret_key_2026_blessings';

export interface AuthenticatedUser {
  id: number | string;
  email: string;
  full_name: string;
  role: 'user' | 'admin';
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export function generateToken(user: AuthenticatedUser): string {
  return jwt.sign(
    {
      id: Number(user.id) || user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    
    // Verify user still exists in database (only for local number IDs)
    if (typeof decoded.id === 'number') {
      const user = db.prepare('SELECT id, email, full_name, role FROM users WHERE id = ?').get(decoded.id) as unknown as AuthenticatedUser | undefined;
      if (!user) {
        return res.status(401).json({ error: 'User account no longer exists.' });
      }
      req.user = user;
    } else {
      req.user = decoded;
    }
    next();
  } catch (err) {
    // Fallback: try decoding as Firebase ID token (JWT format) without signature verification
    try {
      const decodedFirebase = jwt.decode(token) as any;
      if (decodedFirebase && decodedFirebase.sub) {
        const email = (decodedFirebase.email || '').trim().toLowerCase();
        const role = email === 'navyuvakganeshmitramandal14@gmail.com' ? 'admin' : 'user';
        req.user = {
          id: decodedFirebase.sub, // string Firebase UID
          email: email,
          full_name: decodedFirebase.name || email.split('@')[0] || 'Devotee',
          role: role
        };
        return next();
      }
    } catch (decodeErr) {
      // ignore
    }
    return res.status(401).json({ error: 'Invalid or expired session token. Please log in again.' });
  }
}

export function optionalAuthenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
      if (typeof decoded.id === 'number') {
        const user = db.prepare('SELECT id, email, full_name, role FROM users WHERE id = ?').get(decoded.id) as unknown as AuthenticatedUser | undefined;
        if (user) {
          req.user = user;
        }
      } else {
        req.user = decoded;
      }
    } catch (err) {
      // Fallback: try decoding as Firebase ID token (JWT format) without signature verification
      try {
        const decodedFirebase = jwt.decode(token) as any;
        if (decodedFirebase && decodedFirebase.sub) {
          const email = (decodedFirebase.email || '').trim().toLowerCase();
          const role = email === 'navyuvakganeshmitramandal14@gmail.com' ? 'admin' : 'user';
          req.user = {
            id: decodedFirebase.sub, // string Firebase UID
            email: email,
            full_name: decodedFirebase.name || email.split('@')[0] || 'Devotee',
            role: role
          };
        }
      } catch (decodeErr) {
        // ignore
      }
    }
  }
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  authenticate(req, res, () => {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Administrator privileges required.' });
    }
    next();
  });
}

/**
 * Resolves a valid INTEGER user ID in the SQLite database for a given authenticated user (e.g. Firebase Auth user).
 * This ensures relational integrity for foreign keys referencing users(id) without violating constraints.
 */
export function getSqliteUserId(user?: AuthenticatedUser): number {
  if (!user) return 1;
  if (typeof user.id === 'number' && !isNaN(user.id)) {
    return user.id;
  }
  try {
    const userEmail = (user.email || '').trim().toLowerCase();
    if (userEmail) {
      const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(userEmail) as { id: number } | undefined;
      if (existing && existing.id) {
        return existing.id;
      }
    }
    // If not found in SQLite users, insert a synchronized user record
    const now = new Date().toISOString();
    const insertResult = db.prepare(`
      INSERT INTO users (full_name, email, phone, password_hash, role, created_at, updated_at)
      VALUES (?, ?, '+91 0000000000', 'FIREBASE_AUTH_SYNC', ?, ?, ?)
    `).run(user.full_name || 'Admin', userEmail || `user_${Date.now()}@mandal.local`, user.role || 'admin', now, now);
    return Number(insertResult.lastInsertRowid);
  } catch (err) {
    const defaultAdmin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get() as { id: number } | undefined;
    if (defaultAdmin && defaultAdmin.id) {
      return defaultAdmin.id;
    }
    const firstUser = db.prepare("SELECT id FROM users LIMIT 1").get() as { id: number } | undefined;
    return firstUser ? firstUser.id : 1;
  }
}

