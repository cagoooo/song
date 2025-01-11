import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log('Initializing database connection...');

const db = drizzle({
  connection: process.env.DATABASE_URL,
  schema,
  ws: ws,
});

console.log('Database connection initialized successfully');

export { db, sql };