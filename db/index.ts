import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@db/schema";
import ws from "ws";
import { sql } from "drizzle-orm";

// Configure neon with WebSocket settings
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Create the db client with schema
const sql_connection = neon(process.env.DATABASE_URL);
export const db = drizzle(sql_connection, { schema });

// Initialize function for testing the connection
export async function initializeDatabase() {
  try {
    // Test the connection
    const result = await db.execute(sql`SELECT NOW()`);
    console.log("資料庫連接成功", result);
    return true;
  } catch (error) {
    console.error("資料庫連接失敗:", error);
    return false;
  }
}

// Export sql for query building
export { sql };