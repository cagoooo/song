import pkg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@db/schema";

const { Client } = pkg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

let db: ReturnType<typeof drizzle>;

// Connect to the database
console.log('Connecting to database...');
async function initializeDatabase() {
  try {
    await client.connect();
    console.log('Connected to database successfully');

    db = drizzle(client, { schema });

    // Test the connection
    const result = await client.query('SELECT NOW()');
    console.log('Database connection verified:', result.rows[0]);

    return db;
  } catch (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
}

export const dbPromise = initializeDatabase();

// Export the database instance
export { db };