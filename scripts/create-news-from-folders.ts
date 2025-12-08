/**
 * Скрипт для создания новостей из папок с фотографиями мероприятий
 * 
 * Использование:
 * npm run create:news-from-folders
 * или
 * npx tsx scripts/create-news-from-folders.ts
 * 
 * Скрипт:
 * 1. Сканирует папки с датами в формате YYYY.MM.DD
 * 2. Определяет последовательные даты и объединяет их в одно событие
 * 3. Извлекает геолокацию из EXIF данных изображений
 * 4. Создает новости с изображениями и геолокацией
 */

import * as fs from 'fs';
import * as path from 'path';
import exifr from 'exifr';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const TRAININGS_DIR = path.join(process.cwd(), 'public', 'images', 'trainings');

// Инициализация Supabase клиента
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Режим dry-run (без подключения к базе)
const DRY_RUN = process.env.DRY_RUN === 'true' || !supabaseUrl || !supabaseAnonKey;

let supabase: ReturnType<typeof createClient> | null = null;

if (!DRY_RUN) {
  supabase = createClient(supabaseUrl!, supabaseAnonKey!);
} else {
  console.log('⚠️  Режим DRY-RUN: новости не будут созданы в базе данных\n');
}

// Расширения изображений
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp', '.JPG', '.JPEG', '.PNG'];
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.MP4', '.MOV', '.AVI', '.MKV'];

interface FolderInfo {
  folderName: string;
  date: Date;
  images: string[];
  videos: string[];
  location: { latitude: number; longitude: number; city?: string } | null;
}

/**
 * Парсит дату из формата YYYY.MM.DD
 */
function parseDateFolder(folderName: string): Date | null {
  const match = folderName.match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
  if (!match) {
    return null;
  }
  
  const [, year, month, day] = match;
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  
  if (isNaN(date.getTime())) {
    return null;
  }
  
  return date;
}

/**
 * Валидирует координаты GPS
 */
function isValidCoordinates(lat: number, lon: number): boolean {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

/**
 * Извлекает геолокацию из изображения
 */
async function getImageLocation(imagePath: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    // Проверяем существование файла
    if (!fs.existsSync(imagePath)) {
      return null;
    }

    const exifData = await exifr.parse(imagePath, {
      pick: ['latitude', 'longitude', 'GPSLatitude', 'GPSLongitude']
    });

    if (!exifData) {
      return null;
    }

    // exifr может возвращать latitude/longitude напрямую или GPSLatitude/GPSLongitude
    const lat = exifData.latitude || exifData.GPSLatitude;
    const lon = exifData.longitude || exifData.GPSLongitude;

    if (lat && lon && typeof lat === 'number' && typeof lon === 'number') {
      // Валидируем координаты
      if (isValidCoordinates(lat, lon)) {
        return { latitude: lat, longitude: lon };
      }
    }

    return null;
  } catch (_error) {
    return null;
  }
}

/**
 * Получает информацию о папке: изображения, видео, геолокация
 */
async function getFolderInfo(folderPath: string, folderName: string): Promise<FolderInfo> {
  const date = parseDateFolder(folderName);
  if (!date) {
    throw new Error(`Неверный формат даты: ${folderName}`);
  }

  // Проверяем существование папки
  if (!fs.existsSync(folderPath)) {
    throw new Error(`Папка не существует: ${folderPath}`);
  }

  const stats = fs.statSync(folderPath);
  if (!stats.isDirectory()) {
    throw new Error(`Путь не является папкой: ${folderPath}`);
  }

  let items: string[];
  try {
    items = fs.readdirSync(folderPath);
  } catch (error) {
    throw new Error(`Не удалось прочитать папку ${folderPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  const images: string[] = [];
  const videos: string[] = [];
  let location: { latitude: number; longitude: number; city?: string } | null = null;

  // Собираем изображения и видео
  for (const item of items) {
    const itemPath = path.join(folderPath, item);
    
    // Пропускаем скрытые файлы и системные файлы
    if (item.startsWith('.') || item === 'Thumbs.db' || item === 'desktop.ini') {
      continue;
    }

    try {
      const itemStats = fs.statSync(itemPath);
      if (!itemStats.isFile()) {
        continue; // Пропускаем подпапки
      }
    } catch {
      continue; // Пропускаем файлы, к которым нет доступа
    }

    const ext = path.extname(item).toLowerCase();
    
    if (IMAGE_EXTENSIONS.includes(ext)) {
      const relativePath = `/images/trainings/${folderName}/${item}`;
      images.push(relativePath);
      
      // Пытаемся получить геолокацию из первого изображения с GPS данными
      if (!location) {
        const imgLocation = await getImageLocation(itemPath);
        if (imgLocation) {
          location = imgLocation;
        }
      }
    } else if (VIDEO_EXTENSIONS.includes(ext)) {
      const relativePath = `/images/trainings/${folderName}/${item}`;
      videos.push(relativePath);
    }
  }

  return {
    folderName,
    date,
    images,
    videos,
    location
  };
}

/**
 * Определяет, идут ли даты подряд
 */
function areConsecutiveDates(date1: Date, date2: Date): boolean {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays === 1; // Ровно один день разницы
}

/**
 * Группирует папки по последовательным датам
 */
function groupConsecutiveFolders(folders: FolderInfo[]): FolderInfo[][] {
  if (folders.length === 0) {
    return [];
  }

  // Сортируем по дате
  const sorted = [...folders].sort((a, b) => a.date.getTime() - b.date.getTime());
  
  const groups: FolderInfo[][] = [];
  let currentGroup: FolderInfo[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prevDate = sorted[i - 1].date;
    const currDate = sorted[i].date;

    if (areConsecutiveDates(prevDate, currDate)) {
      // Даты идут подряд, добавляем в текущую группу
      currentGroup.push(sorted[i]);
    } else {
      // Разрыв в датах, начинаем новую группу
      groups.push(currentGroup);
      currentGroup = [sorted[i]];
    }
  }

  // Добавляем последнюю группу
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

/**
 * Форматирует дату в формат DD.MM.YYYY
 */
function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Форматирует диапазон дат
 */
function formatDateRange(startDate: Date, endDate: Date): string {
  if (startDate.getTime() === endDate.getTime()) {
    return formatDate(startDate);
  }
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

/**
 * Создает ID для новости
 */
function createNewsId(startDate: Date, endDate: Date): string {
  const start = formatDate(startDate).replace(/\./g, '-');
  const end = formatDate(endDate).replace(/\./g, '-');
  if (start === end) {
    return `training-${start}`;
  }
  return `training-${start}-${end}`;
}

/**
 * Генерирует название новости
 */
function generateTitle(startDate: Date, endDate: Date, folderCount: number): string {
  if (folderCount === 1) {
    return `Мероприятие ${formatDate(startDate)}`;
  }
  return `Мероприятие ${formatDateRange(startDate, endDate)}`;
}

/**
 * Генерирует описание новости
 */
function generateDescription(startDate: Date, endDate: Date, imageCount: number, videoCount: number): string {
  const dateStr = startDate.getTime() === endDate.getTime() 
    ? formatDate(startDate)
    : formatDateRange(startDate, endDate);
  
  let desc = `Мероприятие, проведенное ${dateStr}.`;
  
  if (imageCount > 0) {
    desc += ` Фотографий: ${imageCount}.`;
  }
  
  if (videoCount > 0) {
    desc += ` Видео: ${videoCount}.`;
  }
  
  return desc;
}

/**
 * Пытается определить город по координатам (упрощенная версия)
 */
async function getCityFromCoordinates(_lat: number, _lon: number): Promise<string | null> {
  // Здесь можно использовать API геокодирования (например, Nominatim, Google Maps API)
  // Пока возвращаем null, можно расширить позже
  return null;
}

/**
 * Создает новость из группы папок
 */
async function createNewsFromGroup(group: FolderInfo[]): Promise<void> {
  // Проверяем, что группа не пустая
  if (!group || group.length === 0) {
    console.error(`  ❌ Ошибка: Пустая группа папок`);
    return;
  }

  const startDate = group[0].date;
  const endDate = group[group.length - 1].date;
  
  // Собираем все изображения и видео из группы
  const allImages: string[] = [];
  const allVideos: string[] = [];
  let location: { latitude: number; longitude: number; city?: string } | null = null;

  for (const folder of group) {
    allImages.push(...folder.images);
    allVideos.push(...folder.videos);
    
    // Используем первую найденную геолокацию
    if (!location && folder.location) {
      location = folder.location;
      // Пытаемся определить город
      if (location) {
        const city = await getCityFromCoordinates(location.latitude, location.longitude);
        if (city) {
          location.city = city;
        }
      }
    }
  }

  // Проверяем, что есть хотя бы одно изображение или видео
  if (allImages.length === 0 && allVideos.length === 0) {
    console.warn(`  ⚠️  Группа не содержит изображений или видео, пропускаем`);
    return;
  }

  const newsId = createNewsId(startDate, endDate);
  const title = generateTitle(startDate, endDate, group.length);
  const shortDescription = generateDescription(startDate, endDate, allImages.length, allVideos.length);
  const fullDescription = shortDescription; // Можно расширить позже
  
  const dateStr = formatDate(startDate);
  const year = String(startDate.getFullYear());
  
  // Формируем location строку
  let locationStr: string | null = null;
  if (location) {
    if (location.city) {
      locationStr = location.city;
    } else {
      locationStr = `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
    }
  }

  if (DRY_RUN || !supabase) {
    console.log(`  📝 [DRY-RUN] Новость будет создана:`);
    console.log(`     ID: ${newsId}`);
    console.log(`     Заголовок: ${title}`);
    console.log(`     Дата: ${dateStr}`);
    console.log(`     Местоположение: ${locationStr || 'не указано'}`);
    console.log(`     Изображений: ${allImages.length}`);
    console.log(`     Видео: ${allVideos.length}`);
    return;
  }

  // Валидация данных перед вставкой
  if (!title || title.trim().length === 0) {
    console.error(`  ❌ Ошибка: Пустой заголовок для новости ${newsId}`);
    return;
  }

  if (!shortDescription || shortDescription.trim().length === 0) {
    console.error(`  ❌ Ошибка: Пустое описание для новости ${newsId}`);
    return;
  }

  if (!dateStr || !year) {
    console.error(`  ❌ Ошибка: Неверная дата для новости ${newsId}`);
    return;
  }

  // Проверяем, существует ли уже новость с таким ID
  const { data: existingNews, error: checkError } = await supabase
    .from('news')
    .select('id')
    .eq('id', newsId)
    .maybeSingle(); // Используем maybeSingle вместо single, чтобы не выдавать ошибку если не найдено

  if (checkError && checkError.code !== 'PGRST116') { // PGRST116 - "not found", это нормально
    console.error(`  ⚠️  Ошибка при проверке существования новости: ${checkError.message}`);
    // Продолжаем, так как это может быть временная ошибка
  }

  if (existingNews) {
    console.log(`  ⏭️  Новость уже существует: ${newsId}`);
    return;
  }

  // Создаем новость
  const { error: newsError } = await supabase
    .from('news')
    .insert({
      id: newsId,
      title: title.trim(),
      short_description: shortDescription.trim(),
      full_description: fullDescription.trim(),
      date: dateStr,
      year,
      location: locationStr,
      category: 'Мероприятия'
    });

  if (newsError) {
    console.error(`  ❌ Ошибка при создании новости ${newsId}:`, newsError.message);
    console.error(`     Детали:`, newsError);
    return;
  }

  console.log(`  ✅ Создана новость: ${title}`);

  // Добавляем изображения (пакетами для производительности)
  if (allImages.length > 0) {
    const imageInserts = allImages.map((url, i) => ({
      news_id: newsId,
      image_url: url,
      order: i
    }));

    const { error: imagesError } = await supabase
      .from('news_images')
      .insert(imageInserts);

    if (imagesError) {
      console.error(`  ⚠️  Ошибка при добавлении изображений:`, imagesError.message);
      // Пробуем добавить по одному для более детальной диагностики
      let successCount = 0;
      for (let i = 0; i < allImages.length; i++) {
        const { error: imgError } = await supabase
          .from('news_images')
          .insert({
            news_id: newsId,
            image_url: allImages[i],
            order: i
          });
        if (!imgError) {
          successCount++;
        }
      }
      console.log(`    📷 Добавлено изображений: ${successCount} из ${allImages.length}`);
    } else {
      console.log(`    📷 Добавлено изображений: ${allImages.length}`);
    }
  }

  // Добавляем видео (пакетами для производительности)
  if (allVideos.length > 0) {
    const videoInserts = allVideos.map((url, i) => ({
      news_id: newsId,
      video_url: url,
      order: i
    }));

    const { error: videosError } = await supabase
      .from('news_videos')
      .insert(videoInserts);

    if (videosError) {
      console.error(`  ⚠️  Ошибка при добавлении видео:`, videosError.message);
      // Пробуем добавить по одному для более детальной диагностики
      let successCount = 0;
      for (let i = 0; i < allVideos.length; i++) {
        const { error: vidError } = await supabase
          .from('news_videos')
          .insert({
            news_id: newsId,
            video_url: allVideos[i],
            order: i
          });
        if (!vidError) {
          successCount++;
        }
      }
      console.log(`    🎥 Добавлено видео: ${successCount} из ${allVideos.length}`);
    } else {
      console.log(`    🎥 Добавлено видео: ${allVideos.length}`);
    }
  }

  if (location) {
    console.log(`    📍 Геолокация: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`);
  }
}

/**
 * Основная функция
 */
async function createNewsFromFolders() {
  console.log('🚀 Начало создания новостей из папок с фотографиями...\n');
  console.log(`📁 Папка: ${TRAININGS_DIR}\n`);

  if (!fs.existsSync(TRAININGS_DIR)) {
    console.error(`❌ Ошибка: Папка ${TRAININGS_DIR} не существует!`);
    process.exit(1);
  }

  // Читаем все элементы в директории
  const items = fs.readdirSync(TRAININGS_DIR);
  
  // Фильтруем только папки с датами в формате YYYY.MM.DD
  const dateFolders: string[] = [];
  
  for (const item of items) {
    const itemPath = path.join(TRAININGS_DIR, item);
    
    try {
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory() && /^\d{4}\.\d{2}\.\d{2}$/.test(item)) {
        dateFolders.push(item);
      }
    } catch (error) {
      // Пропускаем файлы/папки, к которым нет доступа
      console.warn(`  ⚠️  Не удалось прочитать ${item}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  if (dateFolders.length === 0) {
    console.log('ℹ️  Не найдено папок с датами в формате YYYY.MM.DD');
    return;
  }

  console.log(`📋 Найдено папок с датами: ${dateFolders.length}\n`);

  // Получаем информацию о каждой папке
  const foldersInfo: FolderInfo[] = [];
  
  for (const folderName of dateFolders) {
    const folderPath = path.join(TRAININGS_DIR, folderName);
    
    try {
      console.log(`📂 Обработка папки: ${folderName}`);
      const folderInfo = await getFolderInfo(folderPath, folderName);
      foldersInfo.push(folderInfo);
      
      if (folderInfo.images.length > 0 || folderInfo.videos.length > 0) {
        console.log(`  📷 Изображений: ${folderInfo.images.length}, 🎥 Видео: ${folderInfo.videos.length}`);
        if (folderInfo.location) {
          console.log(`  📍 Геолокация найдена`);
        }
      } else {
        console.log(`  ⚠️  Папка пуста, пропускаем`);
      }
    } catch (error) {
      console.error(`  ❌ Ошибка при обработке папки ${folderName}:`, error instanceof Error ? error.message : error);
    }
  }

  // Фильтруем папки с медиафайлами
  const foldersWithMedia = foldersInfo.filter(f => f.images.length > 0 || f.videos.length > 0);

  if (foldersWithMedia.length === 0) {
    console.log('\nℹ️  Не найдено папок с изображениями или видео');
    return;
  }

  console.log(`\n📊 Папок с медиафайлами: ${foldersWithMedia.length}\n`);

  // Группируем последовательные даты
  const groups = groupConsecutiveFolders(foldersWithMedia);

  console.log(`📅 Групп последовательных дат: ${groups.length}\n`);

  // Создаем новости для каждой группы
  let createdCount = 0;
  let skippedCount = 0;

  for (const group of groups) {
    const startDate = group[0].date;
    const endDate = group[group.length - 1].date;
    
    console.log(`\n📰 Создание новости для группы:`);
    console.log(`   Даты: ${formatDateRange(startDate, endDate)}`);
    console.log(`   Папок: ${group.length}`);
    
    try {
      await createNewsFromGroup(group);
      createdCount++;
    } catch (error) {
      console.error(`  ❌ Ошибка при создании новости:`, error instanceof Error ? error.message : error);
      skippedCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Итоги:');
  console.log(`  ✅ Создано новостей: ${createdCount}`);
  console.log(`  ⏭️  Пропущено: ${skippedCount}`);
  console.log('='.repeat(50));

  if (createdCount > 0) {
    console.log('\n🎉 Создание новостей завершено успешно!');
  }
}

// Запускаем создание новостей
createNewsFromFolders().catch((error) => {
  console.error('❌ Критическая ошибка:', error);
  process.exit(1);
});

