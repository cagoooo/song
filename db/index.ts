import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";
import * as schema from "@db/schema";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

try {
  console.log('Initializing database connection...');

  export const db = drizzle({
    connection: dbUrl,
    schema,
    ws: ws,
  });

  console.log('Database connection initialized successfully');
} catch (error) {
  console.error('Failed to initialize database:', error);
  throw error;
}

export { sql };