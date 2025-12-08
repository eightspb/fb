/**
 * Скрипт для миграции данных новостей из news-data.ts в Supabase
 * 
 * Использование:
 * npx tsx scripts/migrate-news-to-supabase.ts
 * 
 * Требования:
 * - Установлен пакет tsx: npm install -D tsx
 * - Настроены переменные окружения в .env.local
 */

import { createClient } from '@supabase/supabase-js';
import { newsData } from '../src/lib/news-data';
import dotenv from 'dotenv';
import path from 'path';

// Загружаем переменные окружения
dotenv.config({ path: path.join(process.cwd(), '.env.production') });
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'http://localhost:8000';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Ошибка: Не найдены переменные окружения SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY');
  console.error('Убедитесь, что .env файл существует и содержит ключи.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateNews() {
  console.log('🚀 Начало миграции данных новостей в Supabase...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const news of newsData) {
    try {
      console.log(`📰 Миграция: ${news.title}`);

      // 1. Создаем основную запись новости
      const { data: _newsRecord, error: newsError } = await supabase
        .from('news')
        .upsert({
          id: news.id,
          title: news.title,
          short_description: news.shortDescription,
          full_description: news.fullDescription,
          date: news.date,
          year: news.year,
          category: news.category || null,
          location: news.location || null,
          author: news.author || null,
        }, {
          onConflict: 'id'
        })
        .select()
        .single();

      if (newsError) {
        console.error(`  ❌ Ошибка при создании новости: ${newsError.message}`);
        errorCount++;
        continue;
      }

      // 2. Добавляем изображения
      if (news.images && news.images.length > 0) {
        const images = news.images.map((url, index) => ({
          news_id: news.id,
          image_url: url,
          order: index,
        }));

        const { error: imagesError } = await supabase
          .from('news_images')
          .upsert(images, {
            onConflict: 'news_id,image_url'
          });

        if (imagesError) {
          console.error(`  ⚠️  Ошибка при добавлении изображений: ${imagesError.message}`);
        } else {
          console.log(`  ✅ Добавлено ${images.length} изображений`);
        }
      }

      // 3. Добавляем теги
      if (news.tags && news.tags.length > 0) {
        const tags = news.tags.map(tag => ({
          news_id: news.id,
          tag: tag,
        }));

        const { error: tagsError } = await supabase
          .from('news_tags')
          .upsert(tags, {
            onConflict: 'news_id,tag'
          });

        if (tagsError) {
          console.error(`  ⚠️  Ошибка при добавлении тегов: ${tagsError.message}`);
        } else {
          console.log(`  ✅ Добавлено ${tags.length} тегов`);
        }
      }

      // 4. Добавляем видео
      if (news.videos && news.videos.length > 0) {
        const videos = news.videos.map((url, index) => ({
          news_id: news.id,
          video_url: url,
          order: index,
        }));

        const { error: videosError } = await supabase
          .from('news_videos')
          .upsert(videos, {
            onConflict: 'news_id,video_url'
          });

        if (videosError) {
          console.error(`  ⚠️  Ошибка при добавлении видео: ${videosError.message}`);
        } else {
          console.log(`  ✅ Добавлено ${videos.length} видео`);
        }
      }

      // 5. Добавляем документы
      if (news.documents && news.documents.length > 0) {
        const documents = news.documents.map((url, index) => ({
          news_id: news.id,
          document_url: url,
          order: index,
        }));

        const { error: documentsError } = await supabase
          .from('news_documents')
          .upsert(documents, {
            onConflict: 'news_id,document_url'
          });

        if (documentsError) {
          console.error(`  ⚠️  Ошибка при добавлении документов: ${documentsError.message}`);
        } else {
          console.log(`  ✅ Добавлено ${documents.length} документов`);
        }
      }

      successCount++;
      console.log(`  ✅ Новость успешно мигрирована\n`);

    } catch (error: any) {
      console.error(`  ❌ Ошибка при миграции новости "${news.title}":`, error.message);
      errorCount++;
    }
  }

  console.log('\n📊 Итоги миграции:');
  console.log(`  ✅ Успешно: ${successCount}`);
  console.log(`  ❌ Ошибок: ${errorCount}`);
  console.log(`  📰 Всего новостей: ${newsData.length}`);

  if (errorCount === 0) {
    console.log('\n🎉 Миграция завершена успешно!');
  } else {
    console.log('\n⚠️  Миграция завершена с ошибками. Проверьте логи выше.');
  }
}

// Запускаем миграцию
migrateNews().catch(console.error);

