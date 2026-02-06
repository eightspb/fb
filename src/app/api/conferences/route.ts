import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { checkApiAuth } from '@/lib/auth';
import { generateSlug, isValidSlug } from '@/lib/slug';

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
      additional_info,
      videos
    } = body;

    // Генерируем slug из названия, если не предоставлен
    let slug = providedSlug?.trim() || generateSlug(title);
    
    // Валидация slug
    if (slug && !isValidSlug(slug)) {
      return NextResponse.json({ 
        error: 'Некорректный slug. Используйте только латинские буквы, цифры и дефисы.' 
      }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      // Проверяем уникальность slug
      if (slug) {
        const existingSlug = await client.query(
          'SELECT id FROM conferences WHERE slug = $1',
          [slug]
        );
        if (existingSlug.rows.length > 0) {
          // Добавляем суффикс для уникальности
          const timestamp = Date.now().toString(36);
          slug = `${slug}-${timestamp}`;
        }
      }

      const result = await client.query(
        `INSERT INTO conferences (
          slug, title, date, date_end, description, type, location, speaker, cme_hours, 
          program, materials, status, cover_image, speakers, organizer_contacts, additional_info, videos
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         RETURNING *`,
        [
          slug || null,
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
          additional_info || null,
          JSON.stringify(videos || [])
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
