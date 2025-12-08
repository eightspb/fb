/**
 * Скрипт для организации изображений по датам съемки из EXIF данных
 * 
 * Использование:
 * npm run organize:images
 * или
 * npx tsx scripts/organize-images-by-date.ts
 * 
 * Скрипт:
 * 1. Читает все изображения в папке public/images/trainings
 * 2. Извлекает дату съемки из EXIF данных
 * 3. Форматирует дату в формат YYYY.MM.DD
 * 4. Создает папку с датой, если её нет
 * 5. Перемещает файл в соответствующую папку
 */

import * as fs from 'fs';
import * as path from 'path';
import exifr from 'exifr';

const TRAININGS_DIR = path.join(process.cwd(), 'public', 'images', 'trainings');

// Расширения изображений для обработки (case-insensitive проверка)
const IMAGE_EXTENSIONS = [
  '.jpg', '.jpeg', 
  '.png', 
  '.gif', 
  '.bmp', 
  '.tiff', '.tif',
  '.webp',
  '.heic', '.heif',  // Apple форматы
  '.raw', '.cr2', '.nef', '.arw',  // RAW форматы камер
  '.dng'  // Adobe DNG
];

/**
 * Форматирует дату в формат YYYY.MM.DD
 */
function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${year}.${month}.${day}`;
}

/**
 * Извлекает дату съемки из EXIF данных или использует дату изменения файла
 */
async function getImageDate(filePath: string): Promise<Date | null> {
  try {
    // Пытаемся получить EXIF данные - используем полный парсинг БЕЗ pick для получения всех полей
    // exifr автоматически возвращает Date объекты для полей даты
    const exifData = await exifr.parse(filePath);

    if (!exifData) {
      return null;
    }

    // Функция для безопасного преобразования значения в Date
    const parseDateValue = (value: any): Date | null => {
      if (!value) return null;
      
      // Если это уже Date объект (exifr возвращает даты как Date объекты)
      if (value instanceof Date) {
        return value;
      }
      
      // Если это строка
      if (typeof value === 'string') {
        // Формат EXIF "YYYY:MM:DD" или "YYYY:MM:DD HH:mm:ss"
        if (value.includes(':') && value.match(/^\d{4}:\d{2}:\d{2}/)) {
          const parts = value.split(/[\s:]/);
          if (parts.length >= 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const day = parseInt(parts[2], 10);
            const date = new Date(year, month - 1, day);
            if (!isNaN(date.getTime()) && date.getTime() > 0) {
              return date;
            }
          }
        }
        
        // ISO формат (например, "2025-10-14T07:48:47.000Z")
        const date = new Date(value);
        if (!isNaN(date.getTime()) && date.getTime() > 0) {
          return date;
        }
      }
      
      // Если это число (timestamp)
      if (typeof value === 'number') {
        const date = new Date(value);
        if (!isNaN(date.getTime()) && date.getTime() > 0) {
          return date;
        }
      }
      
      return null;
    };

    // Приоритет полей для даты съемки (в порядке важности)
    // DateTimeOriginal - это основное поле с датой съемки в EXIF стандарте
    const dateFields = [
      'DateTimeOriginal',      // Самое важное - оригинальная дата съемки (EXIF Tag 36867)
      'CreateDate',            // Дата создания (EXIF Tag 36868)
      'DateTimeDigitized',     // Дата оцифровки (EXIF Tag 36872)
      'DateTime',              // Общая дата (EXIF Tag 306)
      'GPSDateStamp',          // Дата GPS (может быть в формате "YYYY:MM:DD")
      'MediaCreateDate',       // Дата создания медиа (QuickTime)
      'TrackCreateDate',       // Дата создания трека (QuickTime)
      'ModifyDate',            // Дата изменения (менее приоритетна, т.к. может быть изменена)
      'MediaModifyDate',       // Дата изменения медиа
      'TrackModifyDate'        // Дата изменения трека
    ];

    // Пробуем найти дату в порядке приоритета
    for (const field of dateFields) {
      const dateValue = exifData[field];
      if (dateValue) {
        const parsedDate = parseDateValue(dateValue);
        if (parsedDate) {
          // Проверяем, что дата разумная (не в будущем и не слишком старая)
          const now = new Date();
          const futureBuffer = new Date(now.getTime() + 86400000); // +1 день для погрешности
          const minDate = new Date(1990, 0, 1); // Минимальная дата - 1990 год
          
          if (parsedDate <= futureBuffer && parsedDate >= minDate) {
            return parsedDate;
          }
        }
      }
    }

    // Если ничего не найдено в EXIF, вернем null
    return null;

  } catch (_error) {
    // Если не удалось прочитать EXIF, возвращаем null
    return null;
  }
}

/**
 * Проверяет, является ли файл изображением
 */
function isImageFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

/**
 * Проверяет, является ли путь папкой
 */
function isDirectory(dirPath: string): boolean {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Основная функция организации изображений
 */
async function organizeImages() {
  console.log('🚀 Начало организации изображений по датам съемки...\n');
  console.log(`📁 Папка: ${TRAININGS_DIR}\n`);

  if (!fs.existsSync(TRAININGS_DIR)) {
    console.error(`❌ Ошибка: Папка ${TRAININGS_DIR} не существует!`);
    process.exit(1);
  }

  // Читаем все файлы и папки в директории
  const items = fs.readdirSync(TRAININGS_DIR);
  
  let processedCount = 0;
  let movedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const skippedFiles: string[] = [];

  for (const item of items) {
    const itemPath = path.join(TRAININGS_DIR, item);
    
    // Пропускаем папки (они уже организованы)
    if (isDirectory(itemPath)) {
      continue;
    }
    
    // Пропускаем скрытые файлы и системные файлы
    if (item.startsWith('.') || item === 'Thumbs.db' || item === 'desktop.ini') {
      continue;
    }

    // Пропускаем файлы, которые не являются изображениями
    if (!isImageFile(item)) {
      console.log(`⏭️  Пропущен (не изображение): ${item}`);
      skippedCount++;
      continue;
    }

    processedCount++;
    console.log(`\n📷 Обработка: ${item}`);

    try {
      // Получаем дату съемки
      const imageDate = await getImageDate(itemPath);
      
      if (!imageDate) {
        console.log(`  ⚠️  Не удалось определить дату из EXIF, пропускаем (файл останется на месте)`);
        skippedFiles.push(item);
        skippedCount++;
        continue;
      }

      // Форматируем дату
      const dateFolder = formatDate(imageDate);
      console.log(`  📅 Дата съемки: ${dateFolder}`);

      // Путь к папке назначения
      const targetDir = path.join(TRAININGS_DIR, dateFolder);
      const targetPath = path.join(targetDir, item);

      // Проверяем, не находится ли файл уже в правильной папке
      // Нормализуем пути для корректного сравнения
      const normalizedItemPath = path.normalize(itemPath);
      const normalizedTargetPath = path.normalize(targetPath);
      
      if (normalizedItemPath === normalizedTargetPath) {
        console.log(`  ✅ Файл уже в правильной папке`);
        continue;
      }
      
      // Дополнительная проверка: если файл уже находится в папке с датой
      const currentDir = path.dirname(normalizedItemPath);
      const parentDirName = path.basename(currentDir);
      if (parentDirName === dateFolder && currentDir !== TRAININGS_DIR) {
        console.log(`  ✅ Файл уже находится в папке с правильной датой: ${parentDirName}`);
        continue;
      }

      // Проверяем, существует ли файл в целевой папке
      if (fs.existsSync(targetPath)) {
        console.log(`  ⚠️  Файл уже существует в папке ${dateFolder}, пропускаем`);
        skippedCount++;
        continue;
      }

      // Создаем папку, если её нет
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
        console.log(`  📁 Создана папка: ${dateFolder}`);
      }

      // Перемещаем файл
      fs.renameSync(itemPath, targetPath);
      console.log(`  ✅ Перемещен в папку: ${dateFolder}`);
      movedCount++;

    } catch (error) {
      console.error(`  ❌ Ошибка при обработке ${item}:`, error instanceof Error ? error.message : error);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Итоги организации:');
  console.log(`  📷 Обработано файлов: ${processedCount}`);
  console.log(`  ✅ Перемещено: ${movedCount}`);
  console.log(`  ⏭️  Пропущено: ${skippedCount}`);
  console.log(`  ❌ Ошибок: ${errorCount}`);
  
  if (skippedFiles.length > 0) {
    console.log('\n⚠️  Файлы, которые не удалось обработать:');
    skippedFiles.forEach(file => console.log(`    - ${file}`));
  }
  
  console.log('='.repeat(50));

  if (errorCount === 0 && movedCount > 0) {
    console.log('\n🎉 Организация завершена успешно!');
  } else if (movedCount === 0) {
    console.log('\nℹ️  Все файлы уже организованы или не требуют перемещения.');
  } else {
    console.log('\n⚠️  Организация завершена с ошибками. Проверьте логи выше.');
  }
}

// Запускаем организацию
organizeImages().catch((error) => {
  console.error('❌ Критическая ошибка:', error);
  process.exit(1);
});

