import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { supabase } from '@/lib/supabase';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { status } = body;
    const { id } = await params;

    const client = await pool.connect();
    try {
      const result = await client.query(`
        UPDATE form_submissions 
        SET status = $1 
        WHERE id = $2 
        RETURNING *
      `, [status, id]);
      
      if (result.rows.length === 0) {
         return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }

      return NextResponse.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error updating request:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
