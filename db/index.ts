import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as schema from "@db/schema";

// 確保環境變數存在
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// 建立資料庫連接池
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 建立資料庫實例
export const db = drizzle(pool, { schema });

// 驗證資料庫連接
export async function validateDbConnection() {
  let retries = 3;
  while (retries > 0) {
    try {
      // 嘗試執行一個簡單的查詢來驗證連接
      const result = await db.execute(sql`SELECT 1`);
      if (!result) {
        throw new Error('Database connection validation failed');
      }
      console.log('Database connection validated successfully');
      return true;
    } catch (error: any) {
      console.error('Database connection error:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
        retryCount: 4 - retries
      });
      retries--;
      if (retries === 0) {
        throw new Error(`Failed to connect to database after 3 attempts: ${error.message}`);
      }
      // 等待1秒後重試
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return false;
}

// 重置投票資料
export async function resetVotes() {
  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`TRUNCATE TABLE votes CASCADE`);
      return true;
    });
    console.log('Votes reset successfully');
    return result;
  } catch (error: any) {
    console.error('Error resetting votes:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    throw new Error(`Failed to reset votes: ${error.message}`);
  }
}

// 檢查資料庫健康狀態
export async function checkDatabaseHealth() {
  try {
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Available tables:', tables);
    return true;
  } catch (error: any) {
    console.error('Database health check failed:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    throw new Error(`Database health check failed: ${error.message}`);
  }
}

export { sql } from "drizzle-orm";