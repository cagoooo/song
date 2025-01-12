import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@db/schema";
import ws from "ws";
import { sql } from "drizzle-orm";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure neon with WebSocket settings
neonConfig.webSocketConstructor = ws;
// Required for Replit environment
neonConfig.useSecureWebSocket = false;
neonConfig.pipelineTLS = false;
neonConfig.pipelineConnect = false;

// Create the connection pool with explicit configuration
const sql_connection = neon(process.env.DATABASE_URL);

// Create the db client with schema
export const db = drizzle(sql_connection, { schema });

// Initialize function for testing the connection
export async function initializeDatabase() {
  try {
    await db.execute(sql`SELECT 1`);
    console.log("Database connection established successfully");
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }
}

export { sql };