import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@db/schema";
import { sql } from "drizzle-orm";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Create the db client with schema
const sql_connection = neon(process.env.DATABASE_URL);
export const db = drizzle(sql_connection, { schema });

// Initialize function for testing the connection
export async function initializeDatabase() {
  try {
    await db.execute(sql`SELECT 1`);
    console.log("Database connection established successfully");
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}

export { sql };