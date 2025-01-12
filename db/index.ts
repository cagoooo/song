import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@db/schema";
import ws from "ws";
import { sql } from "drizzle-orm";

const requiredEnvVars = ['DATABASE_URL', 'PGDATABASE', 'PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingVars.join(', ')}. Please check your deployment configuration.`
  );
}

// Configure neon with WebSocket settings
neonConfig.webSocketConstructor = ws;
// Enable secure connections for deployment
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineTLS = true;
neonConfig.pipelineConnect = true;

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