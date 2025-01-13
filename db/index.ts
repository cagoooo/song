import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@db/schema";
import ws from "ws";
import { sql } from "drizzle-orm";

// Configure neon with WebSocket settings
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = "password";

if (!process.env.DATABASE_URL) {
  console.error('Missing required database environment variable DATABASE_URL');
  process.exit(1);
}

// Create the db client with schema
const sql_connection = neon(process.env.DATABASE_URL);
export const db = drizzle(sql_connection, { schema });

// Initialize function for testing the connection
export async function initializeDatabase(retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      await db.execute(sql`SELECT 1`);
      console.log("Database connection established successfully");
      return;
    } catch (error) {
      console.error(`Failed to initialize database (attempt ${i + 1}/${retries}):`, error);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

export { sql };