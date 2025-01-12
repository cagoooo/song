import { PrismaClient } from '@prisma/client';

// 初始化 PrismaClient
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

// 驗證資料庫連接
export async function validateDbConnection() {
  console.log('Starting database connection validation...');
  try {
    await prisma.$queryRaw`SELECT NOW()`;
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
    const tables = await prisma.$queryRaw`
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

// 處理應用關閉
process.on('beforeExit', async () => {
  console.log('Application is about to exit, closing Prisma Client...');
  await prisma.$disconnect();
});

process.on('SIGTERM', async () => {
  console.log('Application terminating...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Application interrupting...');
  await prisma.$disconnect();
  process.exit(0);
});

// 導出 prisma 客戶端
export { prisma };