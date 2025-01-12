import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Create the db client with schema
const client = neon(process.env.DATABASE_URL);
export const db = drizzle(client, { schema });

// Initialize function for testing the connection
export async function initializeDatabase(retries = 5, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await db.execute(sql`SELECT 1`);
      console.log("Database connection established successfully");
      return result;
    } catch (error) {
      console.error(`Failed to initialize database (attempt ${i + 1}/${retries}):`, error);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

export { sql };