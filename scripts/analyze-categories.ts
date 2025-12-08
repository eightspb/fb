
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Fallback to local default if env var is missing or not a connection string
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';

console.log('Using connection string:', connectionString.replace(/:[^:@]*@/, ':****@')); // Hide password

const client = new Client({
  connectionString,
});

async function analyzeCategories() {
  try {
    await client.connect();
    console.log('Connected to database');

    const res = await client.query(`
      SELECT category, COUNT(*) as count
      FROM news
      GROUP BY category
      ORDER BY count DESC
    `);

    console.log('\nTotal categories found:', res.rows.length);
    console.log('---------------------------');
    
    let totalNews = 0;
    res.rows.forEach(row => {
      const category = row.category === null ? 'NULL (No Category)' : row.category;
      const count = parseInt(row.count);
      console.log(`${category}: ${count}`);
      totalNews += count;
    });
    
    console.log('---------------------------');
    console.log('Total news items:', totalNews);

  } catch (err) {
    console.error('Database error:', err);
  } finally {
    await client.end();
  }
}

analyzeCategories();
