import * as schema from "@db/schema";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";

console.log("Setting up PostgreSQL database connection");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

export async function initializeDatabase() {
  try {
    console.log("Initializing PostgreSQL database...");
    
    const existingUsers = await db.select().from(schema.users).limit(1);
    
    if (existingUsers.length === 0) {
      console.log("Inserting sample data...");
      
      await db.insert(schema.users).values([
        { username: 'cagoo', password: '$2b$10$gsypgex3yfikc9FZilmbtOTwTU3gZuhuUbt3kFS.9TD2Zx7YTKI/q', isAdmin: true },
        { username: 'user', password: '$2b$10$aW5uZXJfcGFzc3dvcmRfaO5FnJ3BMJkCJQxdlgYeGT4bOWOZwJZWS', isAdmin: false }
      ]);
      
      await db.insert(schema.songs).values([
        { title: 'Wonderwall', artist: 'Oasis', key: 'G', notes: 'Beginner friendly', lyrics: 'Today is gonna be the day...', createdBy: 1 },
        { title: 'Hotel California', artist: 'Eagles', key: 'Bm', notes: 'Classic solo', lyrics: 'On a dark desert highway...', createdBy: 1 },
        { title: 'Yellow', artist: 'Coldplay', key: 'B', notes: 'Use capo on 4th fret', lyrics: 'Look at the stars...', createdBy: 2 }
      ]);
      
      await db.insert(schema.tags).values([
        { name: 'rock' },
        { name: 'acoustic' },
        { name: 'pop' },
        { name: 'beginner' },
        { name: 'advanced' }
      ]);
      
      await db.insert(schema.songTags).values([
        { songId: 1, tagId: 1 },
        { songId: 1, tagId: 2 },
        { songId: 1, tagId: 4 },
        { songId: 2, tagId: 1 },
        { songId: 2, tagId: 5 },
        { songId: 3, tagId: 2 },
        { songId: 3, tagId: 3 },
        { songId: 3, tagId: 4 }
      ]);
      
      console.log("Sample data inserted successfully");
    }
    
    const songCount = await db.select().from(schema.songs);
    console.log(`Database initialized with ${songCount.length} songs`);
    
    return true;
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }
}

export { sql };
