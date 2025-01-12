import { drizzle } from "drizzle-orm/neon-http";
import { Pool } from "@neondatabase/serverless";
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// 使用 HTTP 連接配置
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 8000,    // 增加連接超時時間
  idleTimeoutMillis: 30000,         // 空閒連接超時
  max: 10                           // 最大連接數
});

// 添加連接池錯誤處理
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// 創建 drizzle 實例，使用 HTTP
export const db = drizzle(pool, {
  schema,
  logger: true
});