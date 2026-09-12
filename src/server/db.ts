import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import bcrypt from 'bcryptjs';

// Ensure data directory exists
const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'ganesh_aarti.db');
export const db = new DatabaseSync(dbPath);

// Enable foreign key constraints and WAL journal mode for performance and reliability
db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    reset_token TEXT,
    reset_token_expires TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS aarti_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 50,
    status TEXT NOT NULL DEFAULT 'AVAILABLE',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    slot_id INTEGER NOT NULL REFERENCES aarti_slots(id) ON DELETE CASCADE,
    devotee_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    number_of_people INTEGER NOT NULL DEFAULT 1,
    address TEXT NOT NULL,
    special_request TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    booking_source TEXT NOT NULL DEFAULT 'ONLINE',
    token_number INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admin_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    booking_id TEXT,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_slots_date ON aarti_slots(date);
  CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
  CREATE INDEX IF NOT EXISTS idx_bookings_slot_id ON bookings(slot_id);
  CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
  CREATE INDEX IF NOT EXISTS idx_bookings_booking_id ON bookings(booking_id);
`);

// Migration: Change bookings.user_id type to TEXT to support Firebase string UIDs
try {
  const tableInfo = db.prepare("PRAGMA table_info(bookings)").all() as { name: string; type: string }[];
  const userIdCol = tableInfo.find(c => c.name === 'user_id');
  if (userIdCol && userIdCol.type.toUpperCase() === 'INTEGER') {
    console.log("Migrating bookings table to support TEXT user_id...");
    db.exec(`
      PRAGMA foreign_keys = OFF;
      
      -- Create a new temporary table with TEXT type for user_id
      CREATE TABLE bookings_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id TEXT UNIQUE NOT NULL,
        user_id TEXT NOT NULL,
        slot_id INTEGER NOT NULL REFERENCES aarti_slots(id) ON DELETE CASCADE,
        devotee_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        number_of_people INTEGER NOT NULL DEFAULT 1,
        address TEXT NOT NULL,
        special_request TEXT,
        status TEXT NOT NULL DEFAULT 'PENDING',
        booking_source TEXT NOT NULL DEFAULT 'ONLINE',
        token_number INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      
      -- Copy data from old table to new table if they exist
      INSERT INTO bookings_new (
        id, booking_id, user_id, slot_id, devotee_name, phone, email,
        number_of_people, address, special_request, status, booking_source,
        token_number, created_at, updated_at
      )
      SELECT 
        id, booking_id, CAST(user_id AS TEXT), slot_id, devotee_name, phone, email,
        number_of_people, address, special_request, status, booking_source,
        token_number, created_at, updated_at
      FROM bookings;
      
      -- Drop old table and rename new table
      DROP TABLE bookings;
      ALTER TABLE bookings_new RENAME TO bookings;
      
      PRAGMA foreign_keys = ON;
    `);
    console.log("bookings table migrated successfully to support TEXT user_id.");
  }
} catch (err) {
  console.error("Failed to migrate bookings table:", err);
}

// Try to add token_number column to bookings table if not exists
try {
  db.exec("ALTER TABLE bookings ADD COLUMN token_number INTEGER;");
  console.log("Database updated: Added token_number column to bookings table.");
} catch (e) {
  // Column might already exist
}

// Seed initial data if tables are empty
export async function seedInitialData() {
  const userCountStmt = db.prepare('SELECT COUNT(*) as count FROM users');
  const userCount = (userCountStmt.get() as { count: number }).count;

  if (userCount === 0) {
    console.log('Seeding initial administrator and sample devotee accounts...');
    const now = new Date().toISOString();
    const adminPasswordHash = bcrypt.hashSync('AdminGanesh@2026', 10);
    const devoteePasswordHash = bcrypt.hashSync('Devotee@2026', 10);

    const insertUser = db.prepare(`
      INSERT INTO users (full_name, email, phone, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    // Insert Authorized Admin Account
    insertUser.run(
      'Navyuvak Ganesh Mitra Mandal',
      'navyuvakganeshmitramandal14@gmail.com',
      '+91 7724095705',
      adminPasswordHash,
      'admin',
      now,
      now
    );

    console.log('Initial users seeded successfully.');
  }

  // Seed Aarti slots if empty
  const slotCountStmt = db.prepare('SELECT COUNT(*) as count FROM aarti_slots');
  const slotCount = (slotCountStmt.get() as { count: number }).count;

  if (slotCount === 0) {
    console.log('Seeding festival Aarti slots...');
    const now = new Date().toISOString();
    const insertSlot = db.prepare(`
      INSERT INTO aarti_slots (date, start_time, end_time, capacity, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    // Dates for Shri Ganesh Utsav festival (September 14 – 25, 2026)
    const festivalDates = [
      '2026-09-14',
      '2026-09-15',
      '2026-09-16',
      '2026-09-17',
      '2026-09-18',
      '2026-09-19',
      '2026-09-20',
      '2026-09-21',
      '2026-09-22',
      '2026-09-23',
      '2026-09-24',
      '2026-09-25'
    ];

    const standardTimeSlots = [
      { start: '07:30 PM', end: '09:00 PM', capacity: 11 }, // Maha Sandhya Aarti
    ];

    for (const date of festivalDates) {
      for (const slot of standardTimeSlots) {
        insertSlot.run(date, slot.start, slot.end, slot.capacity, 'AVAILABLE', now, now);
      }
    }

    console.log('Seeded festival Aarti slots successfully.');
  }
}

