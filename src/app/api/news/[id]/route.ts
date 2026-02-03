import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { NewsItem } from '@/lib/news-data';
import { checkApiAuth } from '@/lib/auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

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
      // Проверяем наличие колонки image_data в news_images
      const imageDataCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name='news_images' AND column_name='image_data'
      `);
      
      const hasImageDataColumn = imageDataCheck.rows.length > 0;
      
      // Проверяем токен, если есть - отдаем всё.
      const { isAuthenticated: isAdmin } = await checkApiAuth(request);

      // Показываем опубликованные новости и новости без статуса (NULL) для обратной совместимости
      let statusCondition = "AND (n.status = 'published' OR n.status IS NULL)";
      if (isAdmin) {
        statusCondition = ""; // Админ видит всё
      }

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

      const query = `
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

      // Используем только изображения из БД
      // Если изображение есть в БД (has_data = true), используем API endpoint
      // Если нет - пропускаем (изображение должно быть загружено в БД через миграцию)
      const convertedImages = images
        .filter((img: any) => img.has_data) // Только изображения из БД
        .map((img: any) => ({
          ...img,
          image_url: `/api/images/${img.id}`
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
    const { isAuthenticated } = await checkApiAuth(request);
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

      // Delete existing relations (EXCEPT images which we handle smartly to preserve binary data)
      // await client.query('DELETE FROM news_images WHERE news_id = $1', [newsId]); // Don't delete all images!
      await client.query('DELETE FROM news_tags WHERE news_id = $1', [newsId]);
      await client.query('DELETE FROM news_videos WHERE news_id = $1', [newsId]);
      await client.query('DELETE FROM news_documents WHERE news_id = $1', [newsId]);

      // Handle Images (Smart Update)
      // 1. Get current images
      const existingImagesResult = await client.query('SELECT id, image_url FROM news_images WHERE news_id = $1', [newsId]);
      const existingIds = new Set(existingImagesResult.rows.map(row => row.id));
      const keptIds = new Set<string>();

      if (images && images.length > 0) {
        for (let i = 0; i < images.length; i++) {
           const imageStr = images[i];
           
           // Check if it's an existing image served via API
           const idMatch = imageStr.match(/\/api\/images\/([0-9a-fA-F-]{36})/); // UUID regex
           
           if (idMatch && existingIds.has(idMatch[1])) {
             // It's an existing DB image, update order
             const imgId = idMatch[1];
             await client.query('UPDATE news_images SET "order" = $1 WHERE id = $2', [i, imgId]);
             keptIds.add(imgId);
           } else if (imageStr.startsWith('data:')) {
             // New Base64 image
             try {
               const matches = imageStr.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
               if (matches && matches.length === 3) {
                   const mimeType = matches[1];
                   const buffer = Buffer.from(matches[2], 'base64');
                   await client.query(
                     'INSERT INTO news_images (news_id, image_url, "order", image_data, mime_type) VALUES ($1, $2, $3, $4, $5)',
                     [newsId, 'stored_in_db', i, buffer, mimeType]
                   );
               }
             } catch (e) {
               console.error('Error processing base64 image:', e);
             }
           } else {
             // It's a URL (external or legacy local file)
             // Check if we already have this URL in DB to preserve ID (and potential relations if any)
             // But since we don't have unique constraint on image_url per news_id (technically), 
             // we'll try to find one that is NOT already in keptIds to reuse it.
             
             // Simple approach: find one matching URL that is in existingIds and not in keptIds
             const existingRow = existingImagesResult.rows.find(
               row => row.image_url === imageStr && existingIds.has(row.id) && !keptIds.has(row.id)
             );

             if (existingRow) {
                await client.query('UPDATE news_images SET "order" = $1 WHERE id = $2', [i, existingRow.id]);
                keptIds.add(existingRow.id);
             } else {
                // New URL (not in DB or not kept)
                let storedAsData = false;
                if (imageStr.startsWith('http://') || imageStr.startsWith('https://')) {
                    try {
                        const imgRes = await fetch(imageStr);
                        if (imgRes.ok) {
                            const arrayBuffer = await imgRes.arrayBuffer();
                            const buffer = Buffer.from(arrayBuffer);
                            const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';
                            
                            await client.query(
                                'INSERT INTO news_images (news_id, image_url, "order", image_data, mime_type) VALUES ($1, $2, $3, $4, $5)',
                                [newsId, imageStr, i, buffer, mimeType]
                            );
                            storedAsData = true;
                        }
                    } catch (e) {
                        console.error('Failed to fetch image from URL:', imageStr, e);
                    }
                }

                if (!storedAsData) {
                    await client.query(
                        'INSERT INTO news_images (news_id, image_url, "order") VALUES ($1, $2, $3)',
                        [newsId, imageStr, i]
                    );
                }
             }
           }
        }
      }

      // Delete images that were not kept
      const idsToDelete = [...existingIds].filter(id => !keptIds.has(id));
      if (idsToDelete.length > 0) {
         await client.query('DELETE FROM news_images WHERE id = ANY($1)', [idsToDelete]);
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
    const { isAuthenticated } = await checkApiAuth(request);
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get news ID first to clean up related tables manually (if cascade is missing)
      const newsResult = await client.query('SELECT id FROM news WHERE id = $1 OR id = $2', [id, decodedId]);
      
      if (newsResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'News not found' }, { status: 404 });
      }

      const newsId = newsResult.rows[0].id;

      // Manually delete related records to prevent FK violations if CASCADE is missing
      await client.query('DELETE FROM news_images WHERE news_id = $1', [newsId]);
      await client.query('DELETE FROM news_tags WHERE news_id = $1', [newsId]);
      await client.query('DELETE FROM news_videos WHERE news_id = $1', [newsId]);
      await client.query('DELETE FROM news_documents WHERE news_id = $1', [newsId]);

      // Delete the news item
      const result = await client.query('DELETE FROM news WHERE id = $1 RETURNING id', [newsId]);
      
      await client.query('COMMIT');
      
      if (result.rows.length === 0) {
        // Should not happen as we checked existence, but for safety
        return NextResponse.json({ error: 'News not found during delete' }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting news:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
