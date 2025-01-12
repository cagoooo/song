import pkg from 'pg';
const { Pool } = pkg;

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

// 建立連接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// 監聽連接池事件
pool.on('connect', () => {
  console.log('New client connected to database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// 驗證資料庫連接
export async function validateDbConnection() {
  console.log('Starting database connection validation...');
  let client;
  try {
    client = await pool.connect();
    await client.query('SELECT NOW()');
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
  } finally {
    if (client) client.release();
  }
}

// 檢查資料庫健康狀態
export async function checkDatabaseHealth() {
  console.log('Starting database health check...');
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(`
      SELECT table_name, pg_size_pretty(pg_relation_size(quote_ident(table_name)::text)) as size
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Database health check passed. Available tables:', result.rows);
    return true;
  } catch (error: any) {
    console.error('Database health check failed:', {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack
    });
    throw error;
  } finally {
    if (client) client.release();
  }
}

// 應用關閉時的清理處理
process.on('SIGTERM', async () => {
  console.log('Application terminating...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Application interrupting...');
  await pool.end();
  process.exit(0);
});

// 導出數據庫連接池
export { pool };