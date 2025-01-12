import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@db/schema";
import ws from "ws";
import { sql } from "drizzle-orm";

const requiredEnvVars = ['DATABASE_URL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Missing required database environment variable DATABASE_URL');
  console.error('Please set DATABASE_URL in your Deployment secrets');
  process.exit(1);
}

// Verify database URL format
try {
  new URL(process.env.DATABASE_URL as string);
} catch (error) {
  console.error('Invalid DATABASE_URL format');
  process.exit(1);
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
export async function initializeDatabase(retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      await db.execute(sql`SELECT 1`);
      console.log("Database connection established successfully");
      return;
    } catch (error) {
      console.error(`Failed to initialize database (attempt ${i + 1}/${retries}):`, error);
      if (i === retries - 1) {
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
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retrying
    }
  }
}

export { sql };