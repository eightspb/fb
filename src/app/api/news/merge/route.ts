import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { checkApiAuth } from '@/lib/auth';

// Явно указываем Node.js runtime для работы с PostgreSQL
export const runtime = 'nodejs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

export async function POST(request: Request) {
  try {
    // Auth check
    const { isAuthenticated } = await checkApiAuth(request);
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { newsIds } = body;

    if (!Array.isArray(newsIds) || newsIds.length < 2) {
      return NextResponse.json({ error: 'Необходимо указать минимум 2 новости для объединения' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Проверяем наличие колонки image_data
      const imageDataCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name='news_images' AND column_name='image_data'
      `);
      const hasImageDataColumn = imageDataCheck.rows.length > 0;

      // Получаем все новости для объединения
      const placeholders = newsIds.map((_, i) => `$${i + 1}`).join(', ');
      const newsQuery = `SELECT * FROM news WHERE id IN (${placeholders})`;
      const newsResult = await client.query(newsQuery, newsIds);

      if (newsResult.rows.length !== newsIds.length) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Одна или несколько новостей не найдены' }, { status: 404 });
      }

      // Первая новость из массива newsIds - основная (будет сохранена)
      // Создаем Map для быстрого поиска по ID
      const newsMap = new Map(newsResult.rows.map(row => [row.id, row]));
      const mainNewsId = newsIds[0];
      const mainNews = newsMap.get(mainNewsId);
      
      if (!mainNews) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Основная новость не найдена' }, { status: 404 });
      }
      
      const otherNewsIds = newsIds.slice(1);

      // Получаем все изображения из всех новостей
      const allImagesQuery = hasImageDataColumn
        ? `SELECT id, news_id, image_url, "order", image_data, mime_type 
           FROM news_images 
           WHERE news_id IN (${placeholders}) 
           ORDER BY news_id, "order"`
        : `SELECT id, news_id, image_url, "order" 
           FROM news_images 
           WHERE news_id IN (${placeholders}) 
           ORDER BY news_id, "order"`;
      
      const imagesResult = await client.query(allImagesQuery, newsIds);
      
      // Получаем текущие изображения основной новости для определения максимального order
      const mainImagesResult = await client.query(
        'SELECT COALESCE(MAX("order"), -1) as max_order FROM news_images WHERE news_id = $1',
        [mainNewsId]
      );
      let currentMaxOrder = mainImagesResult.rows[0]?.max_order ?? -1;

      // Объединяем изображения: добавляем изображения из других новостей к основной
      for (const img of imagesResult.rows) {
        if (img.news_id !== mainNewsId) {
          currentMaxOrder++;
          if (hasImageDataColumn && img.image_data) {
            await client.query(
              'INSERT INTO news_images (news_id, image_url, "order", image_data, mime_type) VALUES ($1, $2, $3, $4, $5)',
              [mainNewsId, img.image_url, currentMaxOrder, img.image_data, img.mime_type || null]
            );
          } else {
            await client.query(
              'INSERT INTO news_images (news_id, image_url, "order") VALUES ($1, $2, $3)',
              [mainNewsId, img.image_url, currentMaxOrder]
            );
          }
        }
      }

      // Получаем все теги из всех новостей
      const tagsQuery = `SELECT DISTINCT tag FROM news_tags WHERE news_id IN (${placeholders})`;
      const tagsResult = await client.query(tagsQuery, newsIds);
      
      // Удаляем существующие теги основной новости и добавляем все уникальные теги
      await client.query('DELETE FROM news_tags WHERE news_id = $1', [mainNewsId]);
      for (const tagRow of tagsResult.rows) {
        // Проверяем, нет ли уже такого тега (на случай дубликатов)
        const existingTag = await client.query(
          'SELECT id FROM news_tags WHERE news_id = $1 AND tag = $2',
          [mainNewsId, tagRow.tag]
        );
        if (existingTag.rows.length === 0) {
          await client.query('INSERT INTO news_tags (news_id, tag) VALUES ($1, $2)', [mainNewsId, tagRow.tag]);
        }
      }

      // Получаем все видео из всех новостей
      const videosQuery = `SELECT news_id, video_url, "order" FROM news_videos WHERE news_id IN (${placeholders}) ORDER BY news_id, "order"`;
      const videosResult = await client.query(videosQuery, newsIds);
      
      // Получаем текущий максимальный order для видео основной новости
      const mainVideosResult = await client.query(
        'SELECT COALESCE(MAX("order"), -1) as max_order FROM news_videos WHERE news_id = $1',
        [mainNewsId]
      );
      let currentMaxVideoOrder = mainVideosResult.rows[0]?.max_order ?? -1;

      // Объединяем видео
      for (const video of videosResult.rows) {
        if (video.news_id !== mainNewsId) {
          currentMaxVideoOrder++;
          await client.query(
            'INSERT INTO news_videos (news_id, video_url, "order") VALUES ($1, $2, $3)',
            [mainNewsId, video.video_url, currentMaxVideoOrder]
          );
        }
      }

      // Получаем все документы из всех новостей
      const documentsQuery = `SELECT news_id, document_url, "order" FROM news_documents WHERE news_id IN (${placeholders}) ORDER BY news_id, "order"`;
      const documentsResult = await client.query(documentsQuery, newsIds);
      
      // Получаем текущий максимальный order для документов основной новости
      const mainDocumentsResult = await client.query(
        'SELECT COALESCE(MAX("order"), -1) as max_order FROM news_documents WHERE news_id = $1',
        [mainNewsId]
      );
      let currentMaxDocOrder = mainDocumentsResult.rows[0]?.max_order ?? -1;

      // Объединяем документы
      for (const doc of documentsResult.rows) {
        if (doc.news_id !== mainNewsId) {
          currentMaxDocOrder++;
          await client.query(
            'INSERT INTO news_documents (news_id, document_url, "order") VALUES ($1, $2, $3)',
            [mainNewsId, doc.document_url, currentMaxDocOrder]
          );
        }
      }

      // Объединяем описания: объединяем full_description из всех новостей
      const descriptions: string[] = [];
      
      // Добавляем описание основной новости
      if (mainNews.full_description) {
        descriptions.push(mainNews.full_description);
      }
      
      // Добавляем описания из других новостей в порядке их следования в массиве
      for (const otherNewsId of otherNewsIds) {
        const otherNews = newsMap.get(otherNewsId);
        if (otherNews && otherNews.full_description && otherNews.full_description.trim()) {
          descriptions.push(otherNews.full_description);
        }
      }

      // Объединяем описания через двойной перенос строки
      const mergedDescription = descriptions.join('\n\n');

      // Обновляем основную новость с объединенным описанием
      await client.query(
        `UPDATE news 
         SET full_description = $1, updated_at = NOW() 
         WHERE id = $2`,
        [mergedDescription, mainNewsId]
      );

      // Удаляем остальные новости (каскадное удаление удалит связанные записи)
      const deletePlaceholders = otherNewsIds.map((_, i) => `$${i + 1}`).join(', ');
      await client.query(`DELETE FROM news WHERE id IN (${deletePlaceholders})`, otherNewsIds);

      await client.query('COMMIT');

      return NextResponse.json({ 
        success: true, 
        mergedNewsId: mainNewsId,
        mergedCount: newsIds.length
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error merging news:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
