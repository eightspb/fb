import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { checkApiAuth } from '@/lib/auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

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
    const { isAuthenticated } = await checkApiAuth(request);
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      title, 
      date, 
      date_end,
      description, 
      type, 
      location, 
      speaker, 
      cme_hours, 
      program, 
      materials, 
      status,
      cover_image,
      speakers,
      organizer_contacts,
      additional_info
    } = body;

    const client = await pool.connect();
    try {
      const result = await client.query(
        `UPDATE conferences 
         SET title = $1, date = $2, date_end = $3, description = $4, type = $5, 
             location = $6, speaker = $7, cme_hours = $8, program = $9, materials = $10, 
             status = $11, cover_image = $12, speakers = $13, organizer_contacts = $14, 
             additional_info = $15, updated_at = NOW()
         WHERE id = $16
         RETURNING *`,
        [
          title, 
          date, 
          date_end || null,
          description, 
          type, 
          location, 
          speaker, 
          cme_hours, 
          JSON.stringify(program || []), 
          JSON.stringify(materials || []), 
          status,
          cover_image || null,
          JSON.stringify(speakers || []),
          JSON.stringify(organizer_contacts || {}),
          additional_info || null,
          id
        ]
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
    const { isAuthenticated } = await checkApiAuth(request);
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
