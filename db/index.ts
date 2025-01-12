import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const sql = neon(process.env.DATABASE_URL);

// 驗證資料庫連接
export async function validateDbConnection() {
  console.log('Starting database connection validation...');
  try {
    const result = await sql`SELECT NOW()`;
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
    const tables = await sql`
      SELECT table_name, pg_size_pretty(pg_relation_size(quote_ident(table_name)::text)) as size
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('Database health check passed. Available tables:', tables);
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

// 匯出 sql 客戶端
export { sql };