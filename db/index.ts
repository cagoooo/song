import { drizzle } from "drizzle-orm/node-postgres";
import * as pg from 'pg';
import * as schema from "@db/schema";

// 驗證環境變數
const requiredEnvVars = ['PGUSER', 'PGHOST', 'PGPASSWORD', 'PGDATABASE', 'PGPORT'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// 建立資料庫連接池配置
const pool = new pg.Pool({
  user: process.env.PGUSER as string,
  host: process.env.PGHOST as string,
  database: process.env.PGDATABASE as string,
  password: process.env.PGPASSWORD as string,
  port: parseInt(process.env.PGPORT || '5432'),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: {
    rejectUnauthorized: false // 允許自簽名證書，如果需要的話
  }
});

// 監聽連接池事件
pool.on('connect', () => {
  console.log('New database connection established');
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

// 建立 drizzle 實例
export const db = drizzle(pool, { schema });

// 驗證資料庫連接
export async function validateDbConnection() {
  let retries = 5;
  let lastError = null;
  const retryDelay = 2000; // 2 seconds delay between retries

  while (retries > 0) {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query('SELECT NOW()');
        console.log('Database connection validated successfully at:', result.rows[0].now);
        return true;
      } finally {
        client.release();
      }
    } catch (error: any) {
      lastError = error;
      console.error('Database connection attempt failed:', {
        message: error.message,
        code: error.code,
        retryCount: 6 - retries,
        details: error.detail || 'No additional details'
      });

      retries--;
      if (retries > 0) {
        console.log(`Retrying connection in ${retryDelay/1000} seconds... (${retries} attempts remaining)`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  const errorMessage = `Failed to connect to database after 5 attempts. Last error: ${lastError?.message}`;
  console.error(errorMessage);
  throw new Error(errorMessage);
}

// 檢查資料庫健康狀態
export async function checkDatabaseHealth() {
  console.log('Starting database health check...');
  const client = await pool.connect();
  try {
    const tables = await client.query(`
      SELECT table_name, pg_size_pretty(pg_relation_size(quote_ident(table_name)::text)) as size
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    console.log('Database health check passed. Available tables:', 
      tables.rows.map(row => `${row.table_name} (${row.size})`));

    // 檢查連接池狀態
    const poolStatus = {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
    };
    console.log('Connection pool status:', poolStatus);

    return true;
  } catch (error: any) {
    console.error('Database health check failed:', {
      message: error.message,
      code: error.code,
      detail: error.detail || 'No additional details'
    });
    throw error;
  } finally {
    client.release();
  }
}

// 重置投票資料
export async function resetVotes() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE TABLE votes CASCADE');
    await client.query('COMMIT');
    console.log('Votes reset successfully');
    return true;
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error resetting votes:', {
      message: error.message,
      code: error.code,
      detail: error.detail || 'No additional details'
    });
    throw error;
  } finally {
    client.release();
  }
}

// 應用關閉時清理連接池
process.on('SIGTERM', async () => {
  console.log('Closing database pool...');
  await pool.end();
  console.log('Database pool closed');
});

process.on('SIGINT', async () => {
  console.log('Closing database pool...');
  await pool.end();
  console.log('Database pool closed');
});

export { sql } from "drizzle-orm";