#!/usr/bin/env ts-node
/**
 * Скрипт для миграции изображений из /public/images/trainings/ в Supabase Storage
 * 
 * Использование:
 *   npm run migrate:images
 *   или
 *   ts-node scripts/migrate-images-to-storage.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';

// Загружаем переменные окружения
// Пробуем загрузить из .env.production, если нет - из .env.local или .env
try {
  require('dotenv').config({ path: '.env.production' });
} catch {
  try {
    require('dotenv').config({ path: '.env.local' });
  } catch {
    require('dotenv').config();
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'http://localhost:8000';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';
const TRAININGS_PATH = path.join(process.cwd(), 'public', 'images', 'trainings');

// Создаем клиент Supabase с service_role ключом для обхода RLS
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Подключение к БД
const pool = new Pool({
  connectionString: DATABASE_URL,
});

interface FileInfo {
  localPath: string;
  storagePath: string;
  publicUrl: string;
}

/**
 * Рекурсивно получает все файлы из папки
 */
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

/**
 * Загружает файл в Supabase Storage
 */
async function uploadFileToStorage(localPath: string, storagePath: string): Promise<string> {
  const fileBuffer = fs.readFileSync(localPath);
  const fileName = path.basename(localPath);
  
  // Определяем MIME тип
  const ext = path.extname(fileName).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.pdf': 'application/pdf',
  };
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  // Создаем Blob из Buffer
  const blob = new Blob([fileBuffer], { type: contentType });
  const file = new File([blob], fileName, { type: contentType });

  console.log(`  Загрузка: ${storagePath}...`);

  // Загружаем файл
  const { data, error } = await supabase.storage
    .from('public_files')
    .upload(storagePath, file, {
      contentType,
      upsert: true, // Перезаписываем если файл уже существует
    });

  if (error) {
    throw new Error(`Ошибка загрузки ${storagePath}: ${error.message}`);
  }

  // Получаем публичный URL
  const { data: { publicUrl } } = supabase.storage
    .from('public_files')
    .getPublicUrl(storagePath);

  return publicUrl;
}

/**
 * Обновляет пути в БД
 */
async function updatePathsInDatabase(oldPath: string, newUrl: string): Promise<void> {
  // Обновляем пути в news_images
  const updateNewsImages = `
    UPDATE news_images 
    SET image_url = $1 
    WHERE image_url = $2 OR image_url LIKE $3
  `;
  
  // Поддержка разных форматов путей
  const pathVariations = [
    oldPath,
    oldPath.replace(/\\/g, '/'), // Windows -> Unix
    oldPath.replace(/^\/images\//, '/images/'), // Убираем лишние слеши
  ];

  for (const pathVar of pathVariations) {
    await pool.query(updateNewsImages, [newUrl, pathVar, `${pathVar}%`]);
  }

  // Также обновляем в других таблицах если нужно
  // (например, если пути хранятся в JSON полях)
}

/**
 * Основная функция миграции
 */
async function migrateImages() {
  console.log('🚀 Начало миграции изображений в Supabase Storage...\n');

  // Проверяем существование папки
  if (!fs.existsSync(TRAININGS_PATH)) {
    console.error(`❌ Папка не найдена: ${TRAININGS_PATH}`);
    console.log('💡 Убедитесь, что вы запускаете скрипт из корня проекта');
    process.exit(1);
  }

  // Получаем все файлы
  console.log(`📁 Сканирование папки: ${TRAININGS_PATH}`);
  const allFiles = getAllFiles(TRAININGS_PATH);
  console.log(`✅ Найдено файлов: ${allFiles.length}\n`);

  if (allFiles.length === 0) {
    console.log('⚠️  Файлы не найдены. Миграция не требуется.');
    process.exit(0);
  }

  const uploadedFiles: FileInfo[] = [];
  const errors: Array<{ file: string; error: string }> = [];

  // Загружаем каждый файл
  for (let i = 0; i < allFiles.length; i++) {
    const localPath = allFiles[i];
    const relativePath = path.relative(TRAININGS_PATH, localPath);
    const storagePath = `trainings/${relativePath.replace(/\\/g, '/')}`; // Unix-style paths
    
    console.log(`[${i + 1}/${allFiles.length}] ${relativePath}`);

    try {
      const publicUrl = await uploadFileToStorage(localPath, storagePath);
      
      uploadedFiles.push({
        localPath,
        storagePath,
        publicUrl,
      });

      // Обновляем пути в БД
      const oldPath = `/images/trainings/${relativePath.replace(/\\/g, '/')}`;
      await updatePathsInDatabase(oldPath, publicUrl);

      console.log(`  ✅ Загружено: ${publicUrl}\n`);
    } catch (error: any) {
      console.error(`  ❌ Ошибка: ${error.message}\n`);
      errors.push({
        file: relativePath,
        error: error.message,
      });
    }
  }

  // Итоговая статистика
  console.log('\n' + '='.repeat(60));
  console.log('📊 Итоги миграции:');
  console.log('='.repeat(60));
  console.log(`✅ Успешно загружено: ${uploadedFiles.length}`);
  console.log(`❌ Ошибок: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\n⚠️  Файлы с ошибками:');
    errors.forEach(({ file, error }) => {
      console.log(`  - ${file}: ${error}`);
    });
  }

  // Сохраняем отчет
  const reportPath = path.join(process.cwd(), 'migration-report.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        total: allFiles.length,
        successful: uploadedFiles.length,
        errorCount: errors.length,
        uploadedFiles,
        errors,
      },
      null,
      2
    )
  );

  console.log(`\n📄 Отчет сохранен: ${reportPath}`);

  await pool.end();
  process.exit(errors.length > 0 ? 1 : 0);
}

// Запускаем миграцию
migrateImages().catch((error) => {
  console.error('❌ Критическая ошибка:', error);
  process.exit(1);
});

