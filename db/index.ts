import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// 建立資料庫連接池
const client = postgres(process.env.DATABASE_URL, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: true,
});

// 建立 drizzle 實例
export const db = drizzle(client, { schema });

// 測試資料庫連接
export async function testConnection() {
  try {
    const result = await db.execute(sql`SELECT 1`);
    console.log('Database connection test successful:', result);
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

export { sql };