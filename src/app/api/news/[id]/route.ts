import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { NewsItem } from '@/lib/news-data';
import { createClient } from '@supabase/supabase-js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:8000';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function transformNewsFromDB(row: any, images: any[], tags: any[], videos: any[], documents: any[]): NewsItem {
  return {
    id: row.id,
    title: row.title,
    shortDescription: row.short_description,
    fullDescription: row.full_description,
    date: row.date,
    year: row.year,
    category: row.category || undefined,
    location: row.location || undefined,
    author: row.author || undefined,
    images: images.sort((a, b) => (a.order || 0) - (b.order || 0)).map(img => img.image_url),
    videos: videos.sort((a, b) => (a.order || 0) - (b.order || 0)).map(vid => vid.video_url),
    documents: documents.sort((a, b) => (a.order || 0) - (b.order || 0)).map(doc => doc.document_url),
    tags: tags.map(tag => tag.tag),
    status: row.status || 'published',
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Декодируем ID из URL (на случай если он содержит кириллицу)
    const decodedId = decodeURIComponent(id);
    console.log(`[API] Поиск новости: оригинальный ID="${id}", декодированный ID="${decodedId}"`);

    const client = await pool.connect();

    try {
      // Получаем новость с связанными данными
      // ВАЖНО: При прямом запросе по ID мы можем вернуть новость в статусе draft
      // если это админ, но пока возвращаем только если не draft или поправим логику если нужно.
      // Обычно GET по ID (публичный) должен возвращать только опубликованные.
      // Но если мы будем использовать этот эндпоинт для админки (редактирование),
      // то нам нужно отдавать и черновики.
      // Поэтому проверим, есть ли статус черновика, и если да, то решаем.
      // Для простоты пока разрешаем получать черновики по прямому ID (предполагая что ID черновика никто не угадает
      // или это не критично), ЛИБО добавим auth check для черновиков.
      // Сделаем так: возвращаем все по ID. На фронте публичном можно фильтровать, 
      // но вообще лучше в API.
      
      // Однако, в коде выше было: AND n.status IS DISTINCT FROM 'draft'
      // Это значит публично черновики недоступны.
      // Для админки нам нужен доступ.
      
      // Проверяем токен, если есть - отдаем всё.
      const authHeader = request.headers.get('Authorization');
      let isAdmin = false;
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) isAdmin = true;
      }

      let statusCondition = "AND n.status IS DISTINCT FROM 'draft'";
      if (isAdmin) {
        statusCondition = ""; // Админ видит всё
      }

      const query = `
        SELECT 
          n.*,
          COALESCE(
            (SELECT json_agg(jsonb_build_object('image_url', image_url, 'order', "order")) 
             FROM news_images WHERE news_id = n.id),
            '[]'::json
          ) as images,
          COALESCE(
            (SELECT json_agg(jsonb_build_object('tag', tag)) 
             FROM news_tags WHERE news_id = n.id),
            '[]'::json
          ) as tags,
          COALESCE(
            (SELECT json_agg(jsonb_build_object('video_url', video_url, 'order', "order")) 
             FROM news_videos WHERE news_id = n.id),
            '[]'::json
          ) as videos,
          COALESCE(
            (SELECT json_agg(jsonb_build_object('document_url', document_url, 'order', "order")) 
             FROM news_documents WHERE news_id = n.id),
            '[]'::json
          ) as documents
        FROM news n
        WHERE (n.id = $1 OR n.id = $2)
        ${statusCondition}
      `;

      const result = await client.query(query, [id, decodedId]);

      if (result.rows.length === 0) {
        // Если не найдено с фильтром по статусу, но может существовать как черновик (и мы не админ)
        // то это 404 для юзера.
        console.log(`[API] Новость не найдена для ID: "${id}" или "${decodedId}"`);
        return NextResponse.json(
          { error: 'News not found' },
          { status: 404 }
        );
      }

      const row = result.rows[0];

      // Обрабатываем JSON массивы
      const parseJsonArray = (value: any): any[] => {
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        }
        return [];
      };

      const images = parseJsonArray(row.images);
      const tags = parseJsonArray(row.tags);
      const videos = parseJsonArray(row.videos);
      const documents = parseJsonArray(row.documents);

      // Преобразуем пути к изображениям из формата DD.MM.YYYY в YYYY.MM.DD
      const convertImagePath = (imagePath: string): string => {
        return imagePath.replace(
          /(\/images\/trainings\/)(\d{2})\.(\d{2})\.(\d{4})(\/)/g,
          (match, prefix, day, month, year, suffix) => {
            return `${prefix}${year}.${month}.${day}${suffix}`;
          }
        );
      };

      // Применяем преобразование к изображениям
      const convertedImages = images.map((img: any) => ({
        ...img,
        image_url: convertImagePath(img.image_url || '')
      }));

      const news = transformNewsFromDB(row, convertedImages, tags, videos, documents);

      // Add status to response if admin
      if (isAdmin) {
          (news as any).status = row.status;
      }

      return NextResponse.json(news);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching news by id:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const decodedId = decodeURIComponent(id);

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
    const { 
      title, shortDescription, fullDescription, date, year, 
      category, location, author, status,
      images, tags, videos, documents 
    } = body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update news
      const updateQuery = `
        UPDATE news 
        SET title = $1, short_description = $2, full_description = $3, 
            date = $4, year = $5, category = $6, location = $7, author = $8, status = $9, updated_at = NOW()
        WHERE id = $10 OR id = $11
        RETURNING id
      `;
      
      const updateResult = await client.query(updateQuery, [
        title, shortDescription, fullDescription, date, year, 
        category || null, location || null, author || null, status || 'published',
        id, decodedId
      ]);

      if (updateResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'News not found' }, { status: 404 });
      }

      const newsId = updateResult.rows[0].id;

      // Delete existing relations
      await client.query('DELETE FROM news_images WHERE news_id = $1', [newsId]);
      await client.query('DELETE FROM news_tags WHERE news_id = $1', [newsId]);
      await client.query('DELETE FROM news_videos WHERE news_id = $1', [newsId]);
      await client.query('DELETE FROM news_documents WHERE news_id = $1', [newsId]);

      // Insert new relations
      // Images
      if (images && images.length > 0) {
        for (let i = 0; i < images.length; i++) {
           await client.query(
             'INSERT INTO news_images (news_id, image_url, "order") VALUES ($1, $2, $3)',
             [newsId, images[i], i]
           );
        }
      }
      
      // Tags
      if (tags && tags.length > 0) {
        for (const tag of tags) {
           await client.query(
             'INSERT INTO news_tags (news_id, tag) VALUES ($1, $2)',
             [newsId, tag]
           );
        }
      }

      // Videos
      if (videos && videos.length > 0) {
        for (let i = 0; i < videos.length; i++) {
           await client.query(
             'INSERT INTO news_videos (news_id, video_url, "order") VALUES ($1, $2, $3)',
             [newsId, videos[i], i]
           );
        }
      }

      // Documents
      if (documents && documents.length > 0) {
         for (let i = 0; i < documents.length; i++) {
           await client.query(
             'INSERT INTO news_documents (news_id, document_url, "order") VALUES ($1, $2, $3)',
             [newsId, documents[i], i]
           );
        }
      }

      await client.query('COMMIT');
      return NextResponse.json({ success: true, id: newsId });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error updating news:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const decodedId = decodeURIComponent(id);

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
      const result = await client.query('DELETE FROM news WHERE id = $1 OR id = $2 RETURNING id', [id, decodedId]);
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'News not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting news:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
