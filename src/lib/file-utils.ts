/**
 * Утилиты для работы с файлами
 */

import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import exifr from 'exifr';

const TRAININGS_DIR = path.join(process.cwd(), 'public', 'images', 'trainings');

/**
 * Проверяет валидность координат
 */
function isValidCoordinates(lat: number, lon: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    !isNaN(lat) &&
    !isNaN(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

/**
 * Извлекает дату съемки из изображения
 */
export async function extractDateFromImage(imagePath: string): Promise<Date | null> {
  try {
    console.log(`[FILE] 📅 Извлечение даты съемки из: ${imagePath}`);
    
    // Проверяем существование файла
    if (!fs.existsSync(imagePath)) {
      console.log(`[FILE] ⚠️ Файл не существует: ${imagePath}`);
      return null;
    }

    // Пытаемся получить EXIF данные - используем полный парсинг БЕЗ pick для получения всех полей
    // exifr автоматически возвращает Date объекты для полей даты
    const exifData = await exifr.parse(imagePath);

    if (!exifData) {
      console.log(`[FILE] ℹ️ EXIF данные не найдены в файле`);
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
            console.log(`[FILE] ✅ Дата съемки найдена в поле ${field}: ${parsedDate.toISOString()}`);
            return parsedDate;
          } else {
            console.log(`[FILE] ⚠️ Дата из поля ${field} невалидна: ${parsedDate.toISOString()}`);
          }
        }
      }
    }

    // Если ничего не найдено в EXIF
    console.log(`[FILE] ℹ️ Дата съемки не найдена в EXIF данных`);
    return null;

  } catch (error) {
    console.error('[FILE] ❌ Ошибка при извлечении даты съемки:', error);
    return null;
  }
}

/**
 * Извлекает геолокацию из изображения
 */
export async function extractLocationFromImage(imagePath: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    console.log(`[FILE] 📍 Извлечение геолокации из: ${imagePath}`);
    
    // Проверяем существование файла
    if (!fs.existsSync(imagePath)) {
      console.log(`[FILE] ⚠️ Файл не существует: ${imagePath}`);
      return null;
    }

    const exifData = await exifr.parse(imagePath, {
      pick: ['latitude', 'longitude', 'GPSLatitude', 'GPSLongitude']
    });

    if (!exifData) {
      console.log(`[FILE] ℹ️ EXIF данные не найдены в файле`);
      return null;
    }

    // exifr может возвращать latitude/longitude напрямую или GPSLatitude/GPSLongitude
    const lat = exifData.latitude || exifData.GPSLatitude;
    const lon = exifData.longitude || exifData.GPSLongitude;

    if (lat && lon && typeof lat === 'number' && typeof lon === 'number') {
      // Валидируем координаты
      if (isValidCoordinates(lat, lon)) {
        console.log(`[FILE] ✅ Геолокация найдена: ${lat.toFixed(6)}, ${lon.toFixed(6)}`);
        return { latitude: lat, longitude: lon };
      } else {
        console.log(`[FILE] ⚠️ Координаты невалидны: ${lat}, ${lon}`);
      }
    }

    return null;
  } catch (error) {
    console.error('[FILE] ❌ Ошибка при извлечении геолокации:', error);
    return null;
  }
}

/**
 * Скачивает файл из Telegram
 */
export async function downloadTelegramFile(
  fileId: string,
  botToken: string
): Promise<Buffer> {
  console.log(`[FILE] 📥 Начало скачивания файла, fileId: ${fileId}`);
  try {
    // Получаем информацию о файле
    const fileInfoUrl = `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`;
    console.log(`[FILE] 🔍 Запрос информации о файле: ${fileInfoUrl.replace(botToken, 'TOKEN')}`);
    
    const fileInfoResponse = await axios.get(fileInfoUrl);

    if (!fileInfoResponse.data.ok) {
      console.error('[FILE] ❌ Ошибка получения информации о файле:', fileInfoResponse.data);
      throw new Error('Failed to get file info from Telegram');
    }

    const filePath = fileInfoResponse.data.result.file_path;
    const fileUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
    console.log(`[FILE] 📥 Скачивание файла: ${filePath}`);

    // Скачиваем файл
    const fileResponse = await axios.get(fileUrl, {
      responseType: 'arraybuffer',
    });

    const buffer = Buffer.from(fileResponse.data);
    console.log(`[FILE] ✅ Файл скачан, размер: ${buffer.length} байт`);
    return buffer;
  } catch (error) {
    console.error('[FILE] ❌ Ошибка при скачивании файла:', error);
    if (error instanceof Error) {
      console.error('[FILE] Сообщение об ошибке:', error.message);
    }
    throw error;
  }
}

/**
 * Сохраняет медиафайл локально
 */
export function saveMediaFile(
  buffer: Buffer,
  filename: string,
  date: Date
): string {
  console.log(`[FILE] 💾 Сохранение файла: ${filename}`);
  // Форматируем дату в YYYY.MM.DD
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateFolder = `${year}.${month}.${day}`;

  // Создаем путь к папке
  const folderPath = path.join(TRAININGS_DIR, dateFolder);
  console.log(`[FILE] 📁 Путь к папке: ${folderPath}`);
  
  // Создаем папку, если её нет
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
    console.log(`[FILE] ✅ Папка создана: ${folderPath}`);
  }

  // Генерируем уникальное имя файла, если файл уже существует
  let finalFilename = filename;
  let counter = 1;
  let filePath = path.join(folderPath, finalFilename);
  
  while (fs.existsSync(filePath)) {
    const ext = path.extname(filename);
    const nameWithoutExt = path.basename(filename, ext);
    finalFilename = `${nameWithoutExt}_${counter}${ext}`;
    filePath = path.join(folderPath, finalFilename);
    counter++;
  }

  const finalPath = path.join(folderPath, finalFilename);
  
  // Сохраняем файл
  fs.writeFileSync(finalPath, buffer);
  console.log(`[FILE] ✅ Файл сохранен: ${finalPath}`);

  // Возвращаем относительный путь для БД
  const relativePath = `/images/trainings/${dateFolder}/${finalFilename}`;
  console.log(`[FILE] 📝 Относительный путь: ${relativePath}`);
  return relativePath;
}

/**
 * Генерирует ID новости на основе заголовка и даты
 */
export function generateNewsId(title: string, date: Date): string {
  // Форматируем дату
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}.${month}.${day}`;

  // Создаем slug из заголовка
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9а-яё\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50)
    .replace(/^-|-$/g, '');

  return `${dateStr}-${slug}`;
}

/**
 * Извлекает расширение файла из имени или MIME типа
 */
export function getFileExtension(filename: string, mimeType?: string): string {
  // Пытаемся получить из имени файла
  const extFromName = path.extname(filename).toLowerCase();
  if (extFromName) {
    return extFromName;
  }

  // Если нет, пытаемся определить по MIME типу
  if (mimeType) {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'video/mp4': '.mp4',
      'video/mpeg': '.mp4',
      'video/quicktime': '.mov',
      'video/x-msvideo': '.avi',
    };

    return mimeToExt[mimeType] || '.bin';
  }

  return '.bin';
}

