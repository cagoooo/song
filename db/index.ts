import * as schema from "@db/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import pkg from 'pg';
const { Client } = pkg;

// Helper function to create a fresh client for each retry
function createClient() {
  // Override any Neon database connection with the Replit database
  const pgConnectionString = `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`;
  
  console.log("Using Replit PostgreSQL for database connection");
  console.log("Database URL:", 
    pgConnectionString.replace(/postgresql:\/\/[^:]+:([^@]+)@/, 'postgresql://[USER]:[PASSWORD]@'));
  
  // Create a PostgreSQL client with the Replit PostgreSQL connection
  return new Client({
    connectionString: pgConnectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });
}

// Initial client
let client: ReturnType<typeof createClient> = createClient();

// Create a Drizzle ORM instance with our schema
const db = drizzle(client, { schema });

// Export the Drizzle instance for use in other modules
export { db };

// Initialize the database
export async function initializeDatabase() {
  try {
    console.log("Initializing database connection...");
    
    // Create a fresh client for initialization 
    const initClient = createClient();
    
    // Update the exported client
    client = initClient;
    
    // Update the drizzle ORM instance with the new client
    Object.assign(db, drizzle(initClient, { schema }));
    
    // Connect to the database
    await initClient.connect();
    
    // Test connection
    console.log("Testing database connection...");
    const result = await initClient.query('SELECT 1 as test');
    console.log("Database connection successful");
    
    // Create tables if they don't exist using raw SQL
    // This is a workaround for potential schema issues with Drizzle
    await initClient.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        is_admin BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await initClient.query(`
      CREATE TABLE IF NOT EXISTS songs (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        key TEXT,
        notes TEXT,
        lyrics TEXT,
        audio_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES users(id),
        is_active BOOLEAN DEFAULT true
      );
    `);
    
    await initClient.query(`
      CREATE TABLE IF NOT EXISTS votes (
        id SERIAL PRIMARY KEY,
        song_id INTEGER REFERENCES songs(id),
        session_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await initClient.query(`
      CREATE TABLE IF NOT EXISTS song_suggestions (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        suggested_by TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT
      );
    `);
    
    await initClient.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await initClient.query(`
      CREATE TABLE IF NOT EXISTS song_tags (
        id SERIAL PRIMARY KEY,
        song_id INTEGER REFERENCES songs(id),
        tag_id INTEGER REFERENCES tags(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await initClient.query(`
      CREATE TABLE IF NOT EXISTS qr_code_scans (
        id SERIAL PRIMARY KEY,
        song_id INTEGER REFERENCES songs(id),
        session_id TEXT NOT NULL,
        user_agent TEXT,
        referrer TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Check if users table is empty
    const userCount = await initClient.query('SELECT COUNT(*) FROM users');
    
    // Only insert sample data if the users table is empty
    if (parseInt(userCount.rows[0].count) === 0) {
      console.log("Inserting sample data...");
      
      // Insert sample users
      await initClient.query(`
        INSERT INTO users (username, password, is_admin) 
        VALUES 
          ('admin', '$2b$10$aW5uZXJfcGFzc3dvcmRfaO5FnJ3BMJkCJQxdlgYeGT4bOWOZwJZWS', true),
          ('user', '$2b$10$aW5uZXJfcGFzc3dvcmRfaO5FnJ3BMJkCJQxdlgYeGT4bOWOZwJZWS', false);
      `);
      
      // Insert sample songs
      await initClient.query(`
        INSERT INTO songs (title, artist, key, notes, lyrics, created_by) 
        VALUES 
          ('Wonderwall', 'Oasis', 'G', 'Beginner friendly', 'Today is gonna be the day...', 1),
          ('Hotel California', 'Eagles', 'Bm', 'Classic solo', 'On a dark desert highway...', 1),
          ('Yellow', 'Coldplay', 'B', 'Use capo on 4th fret', 'Look at the stars...', 2);
      `);
      
      // Insert sample tags
      await initClient.query(`
        INSERT INTO tags (name) 
        VALUES ('rock'), ('acoustic'), ('pop'), ('beginner'), ('advanced');
      `);
      
      // Insert sample song tags
      await initClient.query(`
        INSERT INTO song_tags (song_id, tag_id) 
        VALUES (1, 1), (1, 2), (1, 4), (2, 1), (2, 5), (3, 2), (3, 3), (3, 4);
      `);
      
      console.log("Sample data inserted successfully");
    }
    
    // Verify all is working by checking the number of songs
    const songCount = await initClient.query('SELECT COUNT(*) FROM songs');
    console.log(`Database initialized with ${songCount.rows[0].count} songs`);
    
    return true;
  } catch (error: any) {
    console.error("Failed to initialize database:", error);
    
    // Provide a friendly error message for common database issues
    if (error.message?.includes("endpoint is disabled")) {
      console.error("Database endpoint is disabled. Please check your database connection settings.");
    } else if (error.message?.includes("auth")) {
      console.error("Database authentication failed. Please check your database credentials.");
    } else if (error.message?.includes("timeout")) {
      console.error("Database connection timed out. The database server might be unavailable.");
    }
    
    throw error;
  }
}

// Export sql for use in other modules
export { sql };