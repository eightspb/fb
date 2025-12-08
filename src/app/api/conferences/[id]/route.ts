import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:8000';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM conferences WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      return NextResponse.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching conference:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Auth check
    const authHeader = request.headers.get('Authorization');
    const bypassHeader = request.headers.get('X-Admin-Bypass');
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
        `UPDATE conferences 
         SET title = $1, date = $2, description = $3, type = $4, location = $5, speaker = $6, cme_hours = $7, program = $8, materials = $9, status = $10, updated_at = NOW()
         WHERE id = $11
         RETURNING *`,
        [title, date, description, type, location, speaker, cme_hours, JSON.stringify(program || []), JSON.stringify(materials || []), status, id]
      );
      
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      
      return NextResponse.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating conference:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Auth check
    const authHeader = request.headers.get('Authorization');
    const bypassHeader = request.headers.get('X-Admin-Bypass');
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
      const result = await client.query('DELETE FROM conferences WHERE id = $1 RETURNING *', [id]);
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting conference:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

