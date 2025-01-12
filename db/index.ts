import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@db/schema";
import ws from "ws";
import { sql } from "drizzle-orm";

const requiredEnvVars = ['DATABASE_URL', 'PGDATABASE', 'PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`Missing environment variables: ${missingVars.join(', ')}`);
  console.error('Please set these variables in the Deployment settings');
  throw new Error('Database configuration incomplete');
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
    console.error("Failed to initialize database. Please check your environment variables:", error);
    console.error("Required environment variables:", {
      DATABASE_URL: process.env.DATABASE_URL ? "Set" : "Missing",
      PGDATABASE: process.env.PGDATABASE ? "Set" : "Missing",
      PGHOST: process.env.PGHOST ? "Set" : "Missing",
      PGPORT: process.env.PGPORT ? "Set" : "Missing",
      PGUSER: process.env.PGUSER ? "Set" : "Missing",
      PGPASSWORD: process.env.PGPASSWORD ? "Set" : "Missing"
    });
    throw error;
  }
}

export { sql };