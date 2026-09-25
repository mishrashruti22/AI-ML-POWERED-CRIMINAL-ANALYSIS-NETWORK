import postgres from '@prisma/orm-postgres/runtime';
import fs from 'fs';
import 'dotenv/config';

async function main() {
  const contractJson = JSON.parse(fs.readFileSync('./prisma/contract.json', 'utf-8'));
  const db = postgres({ url: process.env.DATABASE_URL, contractJson });
  const users = await db.sql`SELECT * FROM "User" LIMIT 1`;
  console.log('Users:', users);
  
  // also test db.orm
  console.log('User proto:', Object.getPrototypeOf(db.orm.public.User));
}
main();
