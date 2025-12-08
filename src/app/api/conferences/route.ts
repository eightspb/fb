import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET() {
  try {
    const client = await pool.connect();
    try {
    const result = await client.query(`
      SELECT * FROM conferences 
      ORDER BY 
        CASE 
          WHEN date ~ '^\\d{2}\\.\\d{2}\\.\\d{4}$' THEN to_date(date, 'DD.MM.YYYY')
          WHEN date ~ '^\\d{4}\\-\\d{2}\\-\\d{2}$' THEN to_date(date, 'YYYY-MM-DD')
          ELSE NULL -- Fallback
        END DESC NULLS LAST
    `);
      return NextResponse.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching conferences:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Auth check
    const authHeader = request.headers.get('Authorization');
    const bypassHeader = request.headers.get('X-Admin-Bypass');
    
    // Allow bypass if header is present (for local dev/admin fallback)
    const isBypass = bypassHeader === 'true';

    if (!isBypass) {
      if (!authHeader) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await request.json();
    const { title, date, description, type, location, speaker, cme_hours, program, materials, status } = body;

    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO conferences (title, date, description, type, location, speaker, cme_hours, program, materials, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [title, date, description, type, location, speaker, cme_hours, JSON.stringify(program || []), JSON.stringify(materials || []), status || 'published']
      );
      return NextResponse.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error creating conference:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

