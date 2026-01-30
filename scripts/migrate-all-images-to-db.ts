import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

const getMimeType = (filePath: string): string => {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
    case '.JPG':
    case '.JPEG':
      return 'image/jpeg';
    case '.png':
    case '.PNG':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.svg':
      return 'image/svg+xml';
    default:
      return 'image/jpeg'; // Default fallback
  }
};

/**
 * Преобразует путь из формата DD.MM.YYYY в YYYY.MM.DD для поиска файлов
 */
function convertImagePath(imagePath: string): string {
  return imagePath.replace(
    /(\/images\/trainings\/)(\d{2})\.(\d{2})\.(\d{4})(\/)/g,
    (match, prefix, day, month, year, suffix) => {
      return `${prefix}${year}.${month}.${day}${suffix}`;
    }
  );
}

/**
 * Нормализует путь для файловой системы
 * Обрабатывает Windows/Unix пути, URL-кодирование, пробелы и специальные символы
 */
function normalizeFilePath(filePath: string): string {
  // Убираем ведущий слеш для относительных путей
  let normalized = filePath.startsWith('/') ? filePath.substring(1) : filePath;
  
  // Заменяем обратные слеши на прямые (Windows -> Unix)
  normalized = normalized.replace(/\\/g, '/');
  
  // Нормализуем множественные слеши
  normalized = normalized.replace(/\/+/g, '/');
  
  return normalized;
}

/**
 * Пробует найти файл, используя различные варианты декодирования и нормализации
 */
function tryFindFile(basePath: string): string | null {
  const fullPath = path.join(process.cwd(), 'public', basePath);
  
  // Проверяем существование файла
  if (fs.existsSync(fullPath)) {
    try {
      // Проверяем, что это файл, а не директория
      const stats = fs.statSync(fullPath);
      if (stats.isFile()) {
        return fullPath;
      }
    } catch (e) {
      // Игнорируем ошибки доступа
    }
  }
  
  return null;
}

/**
 * Находит файл по пути, пробуя разные варианты декодирования и нормализации
 * Обрабатывает:
 * - Кириллицу и специальные символы (URL-кодирование)
 * - Пробелы (обычные и закодированные как %20 или +)
 * - Разные форматы путей (Windows/Unix)
 * - Преобразование дат (DD.MM.YYYY -> YYYY.MM.DD)
 */
function findImageFile(imageUrl: string): string | null {
  // Варианты для проверки
  const variants: string[] = [];
  
  // 1. Оригинальный путь
  variants.push(imageUrl);
  
  // 2. Преобразованный путь (DD.MM.YYYY -> YYYY.MM.DD)
  variants.push(convertImagePath(imageUrl));
  
  // 3. Различные варианты декодирования URL
  try {
    // Стандартное декодирование
    variants.push(decodeURIComponent(imageUrl));
    
    // Декодирование с заменой + на пробелы (формат application/x-www-form-urlencoded)
    variants.push(decodeURIComponent(imageUrl.replace(/\+/g, '%20')));
    
    // Более мягкое декодирование (decodeURI вместо decodeURIComponent)
    try {
      variants.push(decodeURI(imageUrl));
    } catch (e) {
      // Игнорируем ошибки
    }
    
    // Декодирование преобразованного пути
    const converted = convertImagePath(imageUrl);
    variants.push(decodeURIComponent(converted));
    variants.push(decodeURIComponent(converted.replace(/\+/g, '%20')));
  } catch (e) {
    // Игнорируем ошибки декодирования
  }
  
  // Пробуем каждый вариант
  for (const variant of variants) {
    // Нормализуем путь
    const normalized = normalizeFilePath(variant);
    const found = tryFindFile(normalized);
    
    if (found) {
      return found;
    }
    
    // Также пробуем с нормализацией через path (может помочь на Windows)
    try {
      const pathNormalized = path.normalize(normalized);
      const foundNormalized = tryFindFile(pathNormalized);
      if (foundNormalized) {
        return foundNormalized;
      }
    } catch (e) {
      // Игнорируем ошибки
    }
  }
  
  // Если ничего не найдено, пробуем найти файл по имени (только имя файла)
  // Это может помочь, если путь в БД неправильный, но файл существует
  try {
    const fileName = path.basename(imageUrl);
    
    // Пробуем разные варианты имени файла
    const fileNameVariants: string[] = [fileName];
    
    try {
      fileNameVariants.push(decodeURIComponent(fileName));
    } catch (e) {
      // Если не удалось декодировать, пробуем как есть
    }
    
    // Также пробуем вариант с заменой + на пробелы
    try {
      fileNameVariants.push(decodeURIComponent(fileName.replace(/\+/g, '%20')));
    } catch (e) {
      // Игнорируем ошибки
    }
    
    // Ищем файл рекурсивно в папке trainings для каждого варианта
    const trainingsPath = path.join(process.cwd(), 'public', 'images', 'trainings');
    if (fs.existsSync(trainingsPath)) {
      for (const variant of fileNameVariants) {
        const found = findFileRecursively(trainingsPath, variant);
        if (found) {
          return found;
        }
      }
    }
  } catch (e) {
    // Игнорируем ошибки поиска по имени
  }
  
  return null;
}

/**
 * Рекурсивно ищет файл по имени в директории
 * Используется как последняя попытка найти файл
 */
function findFileRecursively(dir: string, fileName: string): string | null {
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        const found = findFileRecursively(fullPath, fileName);
        if (found) {
          return found;
        }
      } else if (item.isFile()) {
        // Сравниваем имена файлов с учетом различных вариантов кодирования
        const itemName = item.name; // Имя файла из файловой системы (уже декодировано)
        
        // Пробуем разные варианты сравнения
        const comparisons = [
          itemName === fileName, // Прямое сравнение
          itemName === decodeURIComponent(fileName), // Если fileName был закодирован
          encodeURIComponent(itemName) === fileName, // Если fileName в БД закодирован, а в ФС - нет
          encodeURIComponent(itemName) === encodeURIComponent(fileName), // Оба закодированы
        ];
        
        // Также пробуем сравнение без учета регистра расширения
        const itemNameLower = itemName.toLowerCase();
        const fileNameLower = fileName.toLowerCase();
        comparisons.push(
          itemNameLower === fileNameLower,
          itemNameLower === decodeURIComponent(fileNameLower),
        );
        
        if (comparisons.some(c => c === true)) {
          return fullPath;
        }
      }
    }
  } catch (e) {
    // Игнорируем ошибки доступа
  }
  
  return null;
}

async function migrateAllImages() {
  console.log('🚀 Начинаем миграцию всех изображений в базу данных...\n');
  const client = await pool.connect();
  
  try {
    // Проверяем наличие колонки image_data
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name='news_images' AND column_name='image_data'
    `);
    
    if (columnCheck.rows.length === 0) {
      console.log('❌ Колонка image_data не найдена. Выполните миграцию add_image_data_column.sql сначала.');
      return;
    }

    // Выбираем все изображения, которые еще не загружены в БД
    const res = await client.query(`
      SELECT id, image_url, news_id, "order"
      FROM news_images 
      WHERE image_data IS NULL 
      ORDER BY news_id, "order"
    `);
    
    const images = res.rows;
    console.log(`📊 Найдено ${images.length} изображений для обработки.\n`);

    if (images.length === 0) {
      console.log('✅ Все изображения уже загружены в базу данных!');
      return;
    }

    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;
    const errors: Array<{ id: string; url: string; error: string }> = [];

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const progress = `[${i + 1}/${images.length}]`;
      
      // Пропускаем внешние URL (http/https)
      if (img.image_url.startsWith('http://') || img.image_url.startsWith('https://')) {
        console.log(`${progress} ⏭️  Пропущен внешний URL: ${img.image_url}`);
        skippedCount++;
        continue;
      }

      // Пропускаем уже загруженные в БД (stored_in_db)
      if (img.image_url === 'stored_in_db') {
        console.log(`${progress} ⏭️  Пропущен (уже в БД): ID ${img.id}`);
        skippedCount++;
        continue;
      }

      const filePath = findImageFile(img.image_url);

      if (!filePath) {
        const errorMsg = `Файл не найден: ${img.image_url}`;
        console.warn(`${progress} ⚠️  ${errorMsg}`);
        // Логируем варианты для отладки (только первые несколько символов, чтобы не засорять вывод)
        try {
          const decoded = decodeURIComponent(img.image_url);
          if (decoded !== img.image_url) {
            console.warn(`  Декодированный вариант: ${decoded.substring(0, 100)}${decoded.length > 100 ? '...' : ''}`);
          }
        } catch (e) {
          // Игнорируем ошибки декодирования
        }
        errors.push({ id: img.id, url: img.image_url, error: errorMsg });
        failCount++;
        continue;
      }

      try {
        const stats = fs.statSync(filePath);
        
        // Пропускаем файлы больше 50MB (слишком большие для BYTEA)
        if (stats.size > 50 * 1024 * 1024) {
          const errorMsg = `Файл слишком большой (>50MB): ${(stats.size / 1024 / 1024).toFixed(2)} MB`;
          console.warn(`${progress} ⚠️  ${errorMsg} - ${img.image_url}`);
          errors.push({ id: img.id, url: img.image_url, error: errorMsg });
          skippedCount++;
          continue;
        }

        // Пропускаем не изображения (например, видео)
        const ext = path.extname(filePath).toLowerCase();
        if (['.mov', '.mp4', '.avi', '.mkv'].includes(ext)) {
          console.log(`${progress} ⏭️  Пропущен видеофайл: ${img.image_url}`);
          skippedCount++;
          continue;
        }

        const buffer = fs.readFileSync(filePath);
        const mimeType = getMimeType(filePath);
        
        await client.query(
          'UPDATE news_images SET image_data = $1, mime_type = $2 WHERE id = $3',
          [buffer, mimeType, img.id]
        );
        
        console.log(`${progress} ✅ Загружено: ${img.image_url} (${(stats.size / 1024).toFixed(2)} KB)`);
        successCount++;
      } catch (e: any) {
        const errorMsg = e.message || 'Неизвестная ошибка';
        console.error(`${progress} ❌ Ошибка при обработке ${img.image_url}:`, errorMsg);
        errors.push({ id: img.id, url: img.image_url, error: errorMsg });
        failCount++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Результаты миграции:');
    console.log('='.repeat(60));
    console.log(`✅ Успешно загружено: ${successCount}`);
    console.log(`⏭️  Пропущено: ${skippedCount}`);
    console.log(`❌ Ошибок: ${failCount}`);
    console.log('='.repeat(60));

    if (errors.length > 0) {
      console.log('\n⚠️  Ошибки при обработке:');
      errors.slice(0, 10).forEach(err => {
        console.log(`  - ${err.url}: ${err.error}`);
      });
      if (errors.length > 10) {
        console.log(`  ... и еще ${errors.length - 10} ошибок`);
      }
    }

    // Проверяем, остались ли еще изображения без данных
    const remainingCheck = await client.query(`
      SELECT COUNT(*) as count 
      FROM news_images 
      WHERE image_data IS NULL 
      AND image_url NOT LIKE 'http%'
      AND image_url != 'stored_in_db'
    `);
    
    const remaining = parseInt(remainingCheck.rows[0].count);
    if (remaining > 0) {
      console.log(`\n⚠️  Осталось ${remaining} изображений без данных в БД.`);
    } else {
      console.log('\n🎉 Все изображения успешно загружены в базу данных!');
    }
    
  } catch (err: any) {
    console.error('\n❌ Критическая ошибка миграции:', err.message);
    console.error(err.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

// Запускаем миграцию
migrateAllImages().catch(console.error);
