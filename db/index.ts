import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";
import * as schema from "@db/schema";

const dbUrl = process.env.DATABASE_URL || process.env.REPL_DB_URL;
if (!dbUrl) {
  throw new Error(
    "DATABASE_URL or REPL_DB_URL must be set. Did you forget to provision a database?",
  );
}

export const db = drizzle({
  connection: dbUrl,
  schema,
  ws: ws,
});

export { sql };