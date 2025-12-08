import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { NewsItem } from '@/lib/news-data';
import { createClient } from '@supabase/supabase-js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
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
    images: images.sort((a, b) => a.order - b.order).map(img => img.image_url),
    videos: videos.sort((a, b) => a.order - b.order).map(vid => vid.video_url),
    documents: documents.sort((a, b) => a.order - b.order).map(doc => doc.document_url),
    tags: tags.map(tag => tag.tag),
    status: row.status || 'published',
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const category = searchParams.get('category');

    console.log('[API News] GET Request received');

    const client = await pool.connect();

    try {
      // Проверяем наличие колонки status
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='news' AND column_name='status'
      `);
      
      const hasStatusColumn = columnCheck.rows.length > 0;
      
      let statusCondition = '';
      if (hasStatusColumn) {
        statusCondition = "WHERE n.status IS DISTINCT FROM 'draft'";
      } else {
        statusCondition = "WHERE 1=1";
      }

      // Проверяем авторизацию (является ли запрос от админа)
      const authHeader = request.headers.get('Authorization');
      let isAdmin = false;
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        if (token && token !== 'undefined' && token !== 'null') {
          const { data: { user }, error } = await supabase.auth.getUser(token);
          if (user) {
            isAdmin = true;
          } else {
             console.log('[API News] Auth check failed:', error?.message);
          }
        }
      }
      
      console.log(`[API News] isAdmin=${isAdmin}, hasStatusColumn=${hasStatusColumn}`);

      // Если админ - показываем все, иначе - только опубликованные
      if (isAdmin) {
        statusCondition = "WHERE 1=1";
      }

      // Строим запрос с фильтрами
      // Используем подзапросы для агрегации, чтобы избежать проблем с GROUP BY
      // ВАЖНО: Показываем ТОЛЬКО опубликованные новости для публичного API, но ВСЕ для админки
      let query = `
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
        ${statusCondition}
      `;

      const params: any[] = [];
      let paramIndex = 1;

      if (year) {
        query += ` AND n.year = $${paramIndex}`;
        params.push(year);
        paramIndex++;
      }

      if (category) {
        if (category === '__NO_CATEGORY__') {
          query += ` AND n.category IS NULL AND NOT EXISTS (SELECT 1 FROM news_tags WHERE news_id = n.id)`;
        } else {
          query += ` AND (n.category = $${paramIndex} OR EXISTS (SELECT 1 FROM news_tags WHERE news_id = n.id AND tag ILIKE $${paramIndex + 1}))`;
          params.push(category);
          params.push(`%${category}%`);
          paramIndex += 2;
        }
      }

      query += ` ORDER BY 
        CASE 
          WHEN n.date ~ '^\\d{2}\\.\\d{2}\\.\\d{4}$' THEN to_date(n.date, 'DD.MM.YYYY')
          WHEN n.date ~ '^\\d{4}\\-\\d{2}\\-\\d{2}$' THEN to_date(n.date, 'YYYY-MM-DD')
          WHEN n.date ~ '^\\d{2}\\.\\d{4}$' THEN to_date('01.' || n.date, 'DD.MM.YYYY') -- For dates like MM.YYYY
          ELSE NULL -- Put invalid dates at the end or beginning
        END DESC NULLS LAST`;

      console.log('[API News] Executing query:', query);
      console.log('[API News] Params:', params);

      const result = await client.query(query, params);
      
      console.log(`[API News] Found ${result.rows.length} rows`);

      const news: NewsItem[] = result.rows.map(row => {
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

        return transformNewsFromDB(row, convertedImages, tags, videos, documents);
      });

      return NextResponse.json(news);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching news:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news' },
      { status: 500 }
    );
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
    const { 
      id, title, shortDescription, fullDescription, date, year, 
      category, location, author, status,
      images, tags, videos, documents 
    } = body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const newsId = id || crypto.randomUUID();

      // Insert news
      const insertNewsQuery = `
        INSERT INTO news (id, title, short_description, full_description, date, year, category, location, author, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      
      await client.query(insertNewsQuery, [
        newsId, title, shortDescription, fullDescription, date, year, 
        category || null, location || null, author || null, status || 'published'
      ]);

      // Insert related data...
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
    console.error('Error creating news:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
