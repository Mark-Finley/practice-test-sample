import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is not defined!');
    process.exit(1);
  }

  console.log('Initializing database connection pool...');
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  console.log('Instantiating PrismaClient with driver adapter...');
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('Connection successful!');
    
    console.log('Testing database query (user count)...');
    const count = await prisma.user.count();
    console.log(`Successfully completed query. Current User Count: ${count}`);
  } catch (error) {
    console.error('Database query test failed:');
    console.error(error);
    process.exit(1);
  } finally {
    console.log('Closing database connections...');
    await prisma.$disconnect();
    await pool.end();
    console.log('Database connections closed.');
  }
}

main();
