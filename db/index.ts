import { neon } from '@neondatabase/serverless';
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import * as schema from "@db/schema";

// 檢查必要的環境變數
console.log('Checking database environment variables...');
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// 移除可能的敏感信息
const sanitizedUrl = process.env.DATABASE_URL.replace(
  /(postgres:\/\/[^:]+:)[^@]+(@.+)/,
  '$1[HIDDEN]$2'
);
console.log('Using database URL:', sanitizedUrl);

// 建立數據庫實例
let dbInstance;
try {
  console.log('Initializing database connection...');
  const sql = neon(process.env.DATABASE_URL!);
  dbInstance = drizzle(sql, { schema });
  console.log('Database instance created successfully');
} catch (error) {
  console.error('Failed to create database instance:', error);
  throw error;
}

export const db = dbInstance;

// 驗證資料庫連接
export async function validateDbConnection() {
  console.log('Starting database connection validation...');
  try {
    // 嘗試執行一個簡單的查詢來驗證連接
    console.log('Executing test query...');
    const result = await db.execute(sql`SELECT current_timestamp`);
    console.log('Test query executed successfully:', result);
    console.log('Database connection validated successfully');
    return true;
  } catch (error: any) {
    console.error('Database connection validation failed:', {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack
    });
    throw error;
  }
}

// 檢查資料庫健康狀態
export async function checkDatabaseHealth() {
  console.log('Starting database health check...');
  try {
    const tables = await db.execute(sql`
      SELECT table_name, pg_size_pretty(pg_relation_size(quote_ident(table_name)::text)) as size
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    console.log('Database health check passed. Available tables:', tables.rows);
    return true;
  } catch (error: any) {
    console.error('Database health check failed:', {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack
    });
    throw error;
  }
}

// 重置投票資料
export async function resetVotes() {
  try {
    // 使用 drizzle-orm 的事務和 sql 標籤來執行
    await db.transaction(async (tx) => {
      await tx.execute(sql`TRUNCATE TABLE votes CASCADE`);
    });
    console.log('Votes reset successfully');
    return true;
  } catch (error: any) {
    console.error('Error resetting votes:', {
      message: error.message,
      code: error.code,
      detail: error.detail || 'No additional details'
    });
    throw error;
  }
}

// 應用關閉時的清理處理
process.on('SIGTERM', () => {
  console.log('Application terminating...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Application interrupting...');
  process.exit(0);
});

export { sql };