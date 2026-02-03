import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { checkApiAuth } from '@/lib/auth';
import { isUUID, isValidSlug } from '@/lib/slug';

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
      // Поиск по UUID или slug
      let result;
      if (isUUID(id)) {
        // Если это UUID - ищем по id
        result = await client.query('SELECT * FROM conferences WHERE id = $1', [id]);
      } else {
        // Иначе ищем по slug
        result = await client.query('SELECT * FROM conferences WHERE slug = $1', [id]);
      }
      
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
      slug: providedSlug,
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

    // Обработка slug
    const slug = providedSlug?.trim() || null;
    
    // Если slug предоставлен, валидируем его
    if (slug && !isValidSlug(slug)) {
      return NextResponse.json({ 
        error: 'Некорректный slug. Используйте только латинские буквы, цифры и дефисы.' 
      }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      // Определяем реальный UUID конференции (если запрос по slug)
      let conferenceId = id;
      if (!isUUID(id)) {
        const findResult = await client.query('SELECT id FROM conferences WHERE slug = $1', [id]);
        if (findResult.rows.length === 0) {
          return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
        conferenceId = findResult.rows[0].id;
      }

      // Проверяем уникальность slug (если он изменился)
      if (slug) {
        const existingSlug = await client.query(
          'SELECT id FROM conferences WHERE slug = $1 AND id != $2',
          [slug, conferenceId]
        );
        if (existingSlug.rows.length > 0) {
          return NextResponse.json({ 
            error: 'Этот slug уже используется другой конференцией.' 
          }, { status: 400 });
        }
      }

      const result = await client.query(
        `UPDATE conferences 
         SET slug = $1, title = $2, date = $3, date_end = $4, description = $5, type = $6, 
             location = $7, speaker = $8, cme_hours = $9, program = $10, materials = $11, 
             status = $12, cover_image = $13, speakers = $14, organizer_contacts = $15, 
             additional_info = $16, updated_at = NOW()
         WHERE id = $17
         RETURNING *`,
        [
          slug,
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
          conferenceId
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
      // Удаление по UUID или slug
      let result;
      if (isUUID(id)) {
        result = await client.query('DELETE FROM conferences WHERE id = $1 RETURNING *', [id]);
      } else {
        result = await client.query('DELETE FROM conferences WHERE slug = $1 RETURNING *', [id]);
      }
      
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
