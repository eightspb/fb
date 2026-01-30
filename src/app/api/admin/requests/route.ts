import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { supabase } from '@/lib/supabase';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

export async function GET(request: Request) {
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

    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM form_submissions 
        ORDER BY created_at DESC
      `);
      
      return NextResponse.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error fetching requests:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
