import { NextResponse, NextRequest } from 'next/server';
import { Pool } from 'pg';
import { checkApiAuth } from '@/lib/auth';
import { generateSlug, isValidSlug } from '@/lib/slug';
import { withApiLogging } from '@/lib/api-logger';

// Явно указываем Node.js runtime для работы с PostgreSQL
export const runtime = 'nodejs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

export const GET = withApiLogging('/api/conferences', async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92421fa6-390c-44f6-b364-97de3045a7b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/app/api/conferences/route.ts:19',message:'Conferences GET - before connect',data:{dbUrl:process.env.DATABASE_URL||'NOT_SET',status:status},timestamp:Date.now(),runId:'debug-remote-db',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    const client = await pool.connect();
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/92421fa6-390c-44f6-b364-97de3045a7b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/app/api/conferences/route.ts:25',message:'Conferences - connected',data:{connected:true},timestamp:Date.now(),runId:'debug-remote-db',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
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
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/92421fa6-390c-44f6-b364-97de3045a7b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/app/api/conferences/route.ts:42',message:'Conferences - query result',data:{rowsFound:result.rows.length},timestamp:Date.now(),runId:'debug-remote-db',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
        
      return NextResponse.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching conferences:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});

export const POST = withApiLogging('/api/conferences', async (request: NextRequest) => {
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
});
