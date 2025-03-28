import * as schema from "@db/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { sql } from "drizzle-orm";
import Database from "better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as fs from 'fs';
import * as path from 'path';

console.log("Setting up SQLite database for the application");

// Create the database directory if it doesn't exist
const dbDir = path.join(process.cwd(), 'db-data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Define the database file path
const dbPath = path.join(dbDir, 'guitar.db');
console.log(`Using SQLite database at: ${dbPath}`);

// Create and configure the SQLite database
const sqlite = new Database(dbPath);

// Create a Drizzle ORM instance with our schema
export const db = drizzle(sqlite, { schema });

// Initialize the database - create tables and seed with sample data
export async function initializeDatabase() {
  try {
    console.log("Initializing SQLite database...");
    
    // Create tables 
    db.run(sql`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        is_admin INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    db.run(sql`
      CREATE TABLE IF NOT EXISTS songs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        key TEXT,
        notes TEXT,
        lyrics TEXT,
        audio_url TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES users(id),
        is_active INTEGER DEFAULT 1
      )
    `);
    
    db.run(sql`
      CREATE TABLE IF NOT EXISTS votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        song_id INTEGER REFERENCES songs(id),
        session_id TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    db.run(sql`
      CREATE TABLE IF NOT EXISTS song_suggestions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        suggested_by TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        notes TEXT
      )
    `);
    
    db.run(sql`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    db.run(sql`
      CREATE TABLE IF NOT EXISTS song_tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        song_id INTEGER REFERENCES songs(id),
        tag_id INTEGER REFERENCES tags(id),
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    db.run(sql`
      CREATE TABLE IF NOT EXISTS qr_code_scans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        song_id INTEGER REFERENCES songs(id),
        session_id TEXT NOT NULL,
        user_agent TEXT,
        referrer TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Check if users table is empty
    const userCount = db.get<{ count: number }>(sql`SELECT COUNT(*) as count FROM users`);
    
    // Only insert sample data if the users table is empty
    if (userCount?.count === 0) {
      console.log("Inserting sample data...");
      
      // Insert sample users
      db.run(sql`
        INSERT INTO users (username, password, is_admin) 
        VALUES 
          ('cagoo', '$2b$10$gsypgex3yfikc9FZilmbtOTwTU3gZuhuUbt3kFS.9TD2Zx7YTKI/q', 1),
          ('user', '$2b$10$aW5uZXJfcGFzc3dvcmRfaO5FnJ3BMJkCJQxdlgYeGT4bOWOZwJZWS', 0)
      `);
      
      // Insert sample songs
      db.run(sql`
        INSERT INTO songs (title, artist, key, notes, lyrics, created_by) 
        VALUES 
          ('Wonderwall', 'Oasis', 'G', 'Beginner friendly', 'Today is gonna be the day...', 1),
          ('Hotel California', 'Eagles', 'Bm', 'Classic solo', 'On a dark desert highway...', 1),
          ('Yellow', 'Coldplay', 'B', 'Use capo on 4th fret', 'Look at the stars...', 2)
      `);
      
      // Insert sample tags
      db.run(sql`
        INSERT INTO tags (name) 
        VALUES ('rock'), ('acoustic'), ('pop'), ('beginner'), ('advanced')
      `);
      
      // Insert sample song tags
      db.run(sql`
        INSERT INTO song_tags (song_id, tag_id) 
        VALUES (1, 1), (1, 2), (1, 4), (2, 1), (2, 5), (3, 2), (3, 3), (3, 4)
      `);
      
      console.log("Sample data inserted successfully");
    }
    
    // Verify all is working by checking the number of songs
    const songCount = db.get<{ count: number }>(sql`SELECT COUNT(*) as count FROM songs`);
    console.log(`Database initialized with ${songCount?.count} songs`);
    
    return true;
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }
}

// Export sql for use in other modules
export { sql };