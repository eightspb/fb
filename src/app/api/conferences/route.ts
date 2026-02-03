import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { checkApiAuth } from '@/lib/auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    const client = await pool.connect();
    try {
      const query = `
        SELECT * FROM conferences 
        ${status ? 'WHERE status = $1' : ''}
        ORDER BY 
          CASE 
            WHEN date ~ '^\\d{2}\\.\\d{2}\\.\\d{4}$' THEN to_date(date, 'DD.MM.YYYY')
            WHEN date ~ '^\\d{4}\\-\\d{2}\\-\\d{2}$' THEN to_date(date, 'YYYY-MM-DD')
            ELSE NULL
          END DESC NULLS LAST
      `;
      
      const result = status 
        ? await client.query(query, [status])
        : await client.query(query);
        
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
        `INSERT INTO conferences (
          title, date, date_end, description, type, location, speaker, cme_hours, 
          program, materials, status, cover_image, speakers, organizer_contacts, additional_info
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
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
          status || 'published',
          cover_image || null,
          JSON.stringify(speakers || []),
          JSON.stringify(organizer_contacts || {}),
          additional_info || null
        ]
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
