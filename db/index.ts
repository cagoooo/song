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

// 建立資料庫連接
export const db = drizzle({
  connection: dbUrl,
  schema,
  ws: ws,
});

// 驗證資料庫連接
export async function validateDbConnection() {
  try {
    const result = await db.execute(sql`SELECT 1`);
    return result !== null;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

export { sql };