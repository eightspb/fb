import { NextResponse, NextRequest } from 'next/server';
import { Pool } from 'pg';
import { NewsItem } from '@/lib/news-data';
import { checkApiAuth } from '@/lib/auth';
import { withApiLogging } from '@/lib/api-logger';

// Явно указываем Node.js runtime для работы с PostgreSQL
export const runtime = 'nodejs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
  connectionTimeoutMillis: 30000, // Increased to 30 seconds for large uploads
  idleTimeoutMillis: 30000,
  max: 20,
});

// Обработка ошибок пула подключений
pool.on('error', (err) => {
  const errorDetails = {
    message: err?.message,
    code: (err as any)?.code,
    name: err?.name,
    stack: err?.stack
  };
  console.error('[DB Pool] Unexpected error on idle client:', JSON.stringify(errorDetails, null, 2));
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/92421fa6-390c-44f6-b364-97de3045a7b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/app/api/news/route.ts:15',message:'DB Pool error event',data:errorDetails,timestamp:Date.now(),runId:'debug-connection',hypothesisId:'H4'})}).catch(()=>{});
  // #endregion
});

pool.on('connect', () => {
  console.log('[DB Pool] New client connected');
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/92421fa6-390c-44f6-b364-97de3045a7b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/app/api/news/route.ts:22',message:'DB Pool connect event',data:{},timestamp:Date.now(),runId:'debug-connection',hypothesisId:'H4'})}).catch(()=>{});
  // #endregion
});

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

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
    imageFocalPoint: row.image_focal_point || 'center 30%',
  };
}

export const GET = withApiLogging('/api/news', async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const year = yearParam ? parseYear(yearParam) : null;
    if (yearParam && year === null) {
      return NextResponse.json({ error: 'Invalid year' }, { status: 400 });
    }
    const category = searchParams.get('category');
    // Параметр includeAll=true позволяет получить все новости (включая черновики)
    // Работает только для авторизованных админов
    const includeAll = searchParams.get('includeAll') === 'true';

    console.log('[API News] GET Request received');
    const dbUrl = process.env.DATABASE_URL;
    console.log('[API News] DATABASE_URL:', dbUrl ? 'SET' : 'NOT SET');
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92421fa6-390c-44f6-b364-97de3045a7b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/app/api/news/route.ts:62',message:'API News GET request started',data:{hasDbUrl:!!dbUrl,dbUrlLength:dbUrl?.length||0},timestamp:Date.now(),runId:'debug-connection',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion

    let client;
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/92421fa6-390c-44f6-b364-97de3045a7b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/app/api/news/route.ts:67',message:'Attempting database connection',data:{poolExists:!!pool},timestamp:Date.now(),runId:'debug-connection',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      client = await pool.connect();
      console.log('[API News] Database connection established');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/92421fa6-390c-44f6-b364-97de3045a7b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/app/api/news/route.ts:70',message:'Database connection successful',data:{clientExists:!!client},timestamp:Date.now(),runId:'debug-connection',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
    } catch (connectError: any) {
      const errorDetails = {
        message: connectError?.message,
        code: connectError?.code,
        errno: connectError?.errno,
        syscall: connectError?.syscall,
        address: connectError?.address,
        port: connectError?.port,
        name: connectError?.name,
        stack: connectError?.stack
      };
      console.error('[API News] Failed to connect to database:', JSON.stringify(errorDetails, null, 2));
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/92421fa6-390c-44f6-b364-97de3045a7b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/app/api/news/route.ts:78',message:'Database connection failed',data:errorDetails,timestamp:Date.now(),runId:'debug-connection',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      throw connectError;
    }

    try {
      // Проверяем наличие колонки status
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='news' AND column_name='status'
      `);
      
      const hasStatusColumn = columnCheck.rows.length > 0;
      
      // Проверяем наличие колонки image_data в news_images
      const imageDataCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name='news_images' AND column_name='image_data'
      `);
      
      const hasImageDataColumn = imageDataCheck.rows.length > 0;
      
      let statusCondition = '';
      if (hasStatusColumn) {
        // По умолчанию показываем только опубликованные новости и новости без статуса (NULL) для обратной совместимости
        statusCondition = "WHERE (n.status = 'published' OR n.status IS NULL)";
      } else {
        statusCondition = "WHERE 1=1";
      }

      // Проверяем авторизацию (является ли запрос от админа)
      const { isAuthenticated: isAdmin } = await checkApiAuth(request);
      
      console.log(`[API News] isAdmin=${isAdmin}, includeAll=${includeAll}, hasStatusColumn=${hasStatusColumn}, hasImageDataColumn=${hasImageDataColumn}`);

      // Показываем ВСЕ новости только если админ ЯВНО запросил includeAll=true
      // Это гарантирует что публичная страница /news всегда показывает только опубликованные
      if (isAdmin && includeAll) {
        statusCondition = "WHERE 1=1";
      }

      // Строим запрос с фильтрами
      // Используем подзапросы для агрегации, чтобы избежать проблем с GROUP BY
      // ВАЖНО: Показываем ТОЛЬКО опубликованные новости для публичного API, но ВСЕ для админки
      // Строим запрос для изображений с учетом наличия колонки image_data
      const imagesSubquery = hasImageDataColumn
        ? `(SELECT json_agg(jsonb_build_object(
              'id', id,
              'image_url', image_url, 
              'order', "order",
              'has_data', (image_data IS NOT NULL)
            )) 
             FROM news_images WHERE news_id = n.id)`
        : `(SELECT json_agg(jsonb_build_object(
              'id', id,
              'image_url', image_url, 
              'order', "order",
              'has_data', false
            )) 
             FROM news_images WHERE news_id = n.id)`;
      
      let query = `
        SELECT 
          n.*,
          COALESCE(
            ${imagesSubquery},
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

      if (year !== null) {
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
      if (result.rows.length === 0) {
        // Проверяем, есть ли вообще новости в базе
        const totalCheckQuery = hasStatusColumn
          ? 'SELECT COUNT(*) as total, COUNT(CASE WHEN status IS DISTINCT FROM \'draft\' THEN 1 END) as published FROM news'
          : 'SELECT COUNT(*) as total, COUNT(*) as published FROM news';
        const totalCheck = await client.query(totalCheckQuery);
        console.log('[API News] Total news in DB:', totalCheck.rows[0]);
      }

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

        // Используем только изображения из БД
        // Если изображение есть в БД (has_data = true), используем API endpoint
        // Если нет - пропускаем (изображение должно быть загружено в БД через миграцию)
        const convertedImages = images
          .filter((img: any) => img.has_data) // Только изображения из БД
          .map((img: any) => ({
            ...img,
            image_url: `/api/images/${img.id}`
          }));

        return transformNewsFromDB(row, convertedImages, tags, videos, documents);
      });

      return NextResponse.json(news);
    } finally {
      if (client) {
        client.release();
      }
    }
  } catch (error: any) {
    const errorDetails = {
      message: error?.message,
      code: error?.code,
      errno: error?.errno,
      syscall: error?.syscall,
      address: error?.address,
      port: error?.port,
      name: error?.name,
      stack: error?.stack
    };
    console.error('[API News] Error fetching news:', JSON.stringify(errorDetails, null, 2));
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92421fa6-390c-44f6-b364-97de3045a7b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/app/api/news/route.ts:247',message:'API News error caught',data:errorDetails,timestamp:Date.now(),runId:'debug-connection',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    
    // Более понятные сообщения об ошибках
    let errorMessage = 'Failed to fetch news';
    let statusCode = 500;
    
    if (error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT' || error?.message?.includes('connect')) {
      errorMessage = 'Не удалось подключиться к базе данных. Проверьте доступность сервера БД.';
      statusCode = 503; // Service Unavailable
    } else if (error?.code === 'ENOTFOUND' || error?.code === 'EAI_AGAIN') {
      errorMessage = 'Не удалось найти сервер базы данных. Проверьте правильность адреса в DATABASE_URL.';
      statusCode = 503;
    } else if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      errorMessage = 'Таблицы не найдены. Выполните bun run setup для создания схемы базы данных.';
      statusCode = 500;
    } else if (error?.code === '28P01' || error?.message?.includes('password authentication failed')) {
      errorMessage = 'Ошибка аутентификации в базе данных. Проверьте учетные данные в DATABASE_URL.';
      statusCode = 500;
    } else if (error?.code === '3D000' || error?.message?.includes('database') && error?.message?.includes('does not exist')) {
      errorMessage = 'База данных не найдена. Проверьте имя базы данных в DATABASE_URL.';
      statusCode = 500;
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? {
          message: error?.message,
          code: error?.code,
          errno: error?.errno,
          syscall: error?.syscall,
          address: error?.address,
          port: error?.port,
        } : undefined,
        code: error?.code
      },
      { status: statusCode }
    );
  }
});

export const POST = withApiLogging('/api/news', async (request: NextRequest) => {
  try {
    // Auth check
    const { isAuthenticated } = await checkApiAuth(request);
    
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      id, title, shortDescription, fullDescription, date, year, 
      category, location, author, status, imageFocalPoint,
      images, tags, videos, documents 
    } = body;

    const parsedYear = parseYear(year);
    if (year !== undefined && year !== null && parsedYear === null) {
      return NextResponse.json({ error: 'Invalid year' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const newsId = id || crypto.randomUUID();

      // Insert news
      const insertNewsQuery = `
        INSERT INTO news (id, title, short_description, full_description, date, year, category, location, author, status, image_focal_point)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      
      await client.query(insertNewsQuery, [
        newsId, title, shortDescription, fullDescription, date, parsedYear, 
        category || null, location || null, author || null, status || 'published',
        imageFocalPoint || 'center 30%'
      ]);

      // Insert related data...
      // Images
      if (images && images.length > 0) {
        const urlImages: Array<{ url: string; order: number }> = [];
        for (let i = 0; i < images.length; i++) {
          const imageStr = images[i];
          if (imageStr.startsWith('data:')) {
            // Process base64
            try {
              // Extract mime type and base64 data
              // Format: data:image/png;base64,.....
              const matches = imageStr.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
              
              if (matches && matches.length === 3) {
                const mimeType = matches[1];
                const base64Data = matches[2];
                const buffer = Buffer.from(base64Data, 'base64');
                validateImageMime(mimeType);
                validateImageSize(buffer.length);
                
                await client.query(
                  'INSERT INTO news_images (news_id, image_url, "order", image_data, mime_type) VALUES ($1, $2, $3, $4, $5)',
                  [newsId, 'stored_in_db', i, buffer, mimeType]
                );
              } else {
                throw new Error('VALIDATION_ERROR: Invalid base64 image format');
              }
            } catch (err) {
              throw err;
            }
          } else {
            // Regular URL
            // If URL is external (http/https), try to fetch it and store as data
            if (imageStr.startsWith('http://') || imageStr.startsWith('https://')) {
              try {
                const imgRes = await fetch(imageStr);
                if (imgRes.ok) {
                  const contentType = imgRes.headers.get('content-type') || '';
                  const contentLength = imgRes.headers.get('content-length');
                  validateImageMime(contentType);
                  if (contentLength && Number(contentLength) > MAX_IMAGE_BYTES) {
                    throw new Error('VALIDATION_ERROR: Image exceeds max size');
                  }
                  const arrayBuffer = await imgRes.arrayBuffer();
                  const buffer = Buffer.from(arrayBuffer);
                  validateImageSize(buffer.length);
                  const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';
                  
                  await client.query(
                    'INSERT INTO news_images (news_id, image_url, "order", image_data, mime_type) VALUES ($1, $2, $3, $4, $5)',
                    [newsId, imageStr, i, buffer, mimeType]
                  );
                  continue; // Successfully stored as data
                }
              } catch (e: any) {
                if (e?.message?.startsWith('VALIDATION_ERROR:')) {
                  throw e;
                }
                console.error('Failed to fetch image from URL:', imageStr, e);
                // Fallback to storing just URL
              }
            }

            urlImages.push({ url: imageStr, order: i });
          }
        }

        if (urlImages.length > 0) {
          const urls = urlImages.map(image => image.url);
          const orders = urlImages.map(image => image.order);
          await client.query(
            'INSERT INTO news_images (news_id, image_url, "order") SELECT $1, url, ord FROM unnest($2::text[], $3::int[]) AS t(url, ord)',
            [newsId, urls, orders]
          );
        }
      }
      
      // Tags
      if (tags && tags.length > 0) {
        await client.query(
          'INSERT INTO news_tags (news_id, tag) SELECT $1, unnest($2::text[])',
          [newsId, tags]
        );
      }

      // Videos
      if (videos && videos.length > 0) {
        const videoOrders = videos.map((_: string, index: number) => index);
        await client.query(
          'INSERT INTO news_videos (news_id, video_url, "order") SELECT $1, v, o FROM unnest($2::text[], $3::int[]) AS t(v, o)',
          [newsId, videos, videoOrders]
        );
      }

      // Documents
      if (documents && documents.length > 0) {
        const documentOrders = documents.map((_: string, index: number) => index);
        await client.query(
          'INSERT INTO news_documents (news_id, document_url, "order") SELECT $1, d, o FROM unnest($2::text[], $3::int[]) AS t(d, o)',
          [newsId, documents, documentOrders]
        );
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
    if (error?.message?.startsWith('VALIDATION_ERROR:')) {
      return NextResponse.json(
        { error: error.message.replace('VALIDATION_ERROR:', '').trim() },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
});

function parseYear(value: unknown): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const year = typeof value === 'string' ? Number(value) : Number(value);
  if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
    return null;
  }
  return year;
}

function validateImageMime(mimeType: string): void {
  if (!mimeType || !mimeType.startsWith('image/')) {
    throw new Error('VALIDATION_ERROR: Invalid image mime type');
  }
}

function validateImageSize(sizeBytes: number): void {
  if (sizeBytes > MAX_IMAGE_BYTES) {
    throw new Error('VALIDATION_ERROR: Image exceeds max size');
  }
}
