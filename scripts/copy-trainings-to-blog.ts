import * as fs from 'fs';
import * as path from 'path';

// Функция транслитерации кириллицы в латиницу
function transliterate(text: string): string {
  const cyrillicToLatin: Record<string, string> = {
    'А': 'A', 'а': 'a',
    'Б': 'B', 'б': 'b',
    'В': 'V', 'в': 'v',
    'Г': 'G', 'г': 'g',
    'Д': 'D', 'д': 'd',
    'Е': 'E', 'е': 'e',
    'Ё': 'Yo', 'ё': 'yo',
    'Ж': 'Zh', 'ж': 'zh',
    'З': 'Z', 'з': 'z',
    'И': 'I', 'и': 'i',
    'Й': 'J', 'й': 'j',
    'К': 'K', 'к': 'k',
    'Л': 'L', 'л': 'l',
    'М': 'M', 'м': 'm',
    'Н': 'N', 'н': 'n',
    'О': 'O', 'о': 'o',
    'П': 'P', 'п': 'p',
    'Р': 'R', 'р': 'r',
    'С': 'S', 'с': 's',
    'Т': 'T', 'т': 't',
    'У': 'U', 'у': 'u',
    'Ф': 'F', 'ф': 'f',
    'Х': 'H', 'х': 'h',
    'Ц': 'Ts', 'ц': 'ts',
    'Ч': 'Ch', 'ч': 'ch',
    'Ш': 'Sh', 'ш': 'sh',
    'Щ': 'Shch', 'щ': 'shch',
    'Ъ': '', 'ъ': '',
    'Ы': 'Y', 'ы': 'y',
    'Ь': '', 'ь': '',
    'Э': 'E', 'э': 'e',
    'Ю': 'Yu', 'ю': 'yu',
    'Я': 'Ya', 'я': 'ya',
  };

  return text
    .split('')
    .map(char => cyrillicToLatin[char] || char)
    .join('');
}

// Функция нормализации имени файла: транслитерация + замена пробелов и спецсимволов на подчеркивания
function normalizeFileName(fileName: string): string {
  // Транслитерация
  let normalized = transliterate(fileName);
  
  // Заменяем пробелы и спецсимволы на подчеркивания
  // Оставляем только буквы, цифры, точки, дефисы и подчеркивания
  normalized = normalized.replace(/[^\w.-]/g, '_');
  
  // Заменяем множественные подчеркивания на одно
  normalized = normalized.replace(/_+/g, '_');
  
  // Убираем подчеркивания в начале и конце
  normalized = normalized.replace(/^_+|_+$/g, '');
  
  return normalized;
}

// Функция для получения всех файлов из директории (не рекурсивно)
function getFilesInDirectory(dirPath: string): string[] {
  const files: string[] = [];
  
  if (!fs.existsSync(dirPath)) {
    return files;
  }

  const items = fs.readdirSync(dirPath);

  items.forEach((item) => {
    const itemPath = path.join(dirPath, item);
    const stat = fs.statSync(itemPath);

    if (stat.isFile()) {
      files.push(itemPath);
    }
  });

  return files;
}

// Функция для получения всех папок с датами из директории trainings
function getDateFolders(trainingsDir: string): string[] {
  const folders: string[] = [];
  
  if (!fs.existsSync(trainingsDir)) {
    return folders;
  }

  const items = fs.readdirSync(trainingsDir);

  items.forEach((item) => {
    const itemPath = path.join(trainingsDir, item);
    const stat = fs.statSync(itemPath);

    // Проверяем, является ли это папкой с датой (формат YYYY.MM.DD или YYYY.MM.DD-DD)
    if (stat.isDirectory() && /^\d{4}\.\d{2}\.\d{2}/.test(item)) {
      folders.push(item);
    }
  });

  return folders.sort();
}

// Основная функция
function main() {
  const trainingsDir = path.join(process.cwd(), 'public', 'images', 'trainings');
  const blogDir = path.join(process.cwd(), 'public', 'images', 'blog');

  console.log('📁 Исходная папка trainings:', trainingsDir);
  console.log('📁 Целевая папка blog:', blogDir);
  console.log('');

  // Проверяем существование исходной папки
  if (!fs.existsSync(trainingsDir)) {
    console.error('❌ Ошибка: папка trainings не найдена!');
    process.exit(1);
  }

  // Создаем целевую папку blog, если её нет
  if (!fs.existsSync(blogDir)) {
    fs.mkdirSync(blogDir, { recursive: true });
    console.log('✅ Создана папка blog:', blogDir);
  } else {
    console.log('ℹ️  Папка blog уже существует:', blogDir);
  }

  console.log('');
  console.log('🔍 Поиск папок с датами...');

  // Получаем все папки с датами из trainings
  const dateFolders = getDateFolders(trainingsDir);

  console.log(`📊 Найдено папок с датами: ${dateFolders.length}`);
  console.log('');

  let totalCopiedFiles = 0;
  let totalSkippedFiles = 0;
  const folderStats: Array<{ folder: string; copied: number; skipped: number }> = [];

  // Обрабатываем каждую папку с датой
  dateFolders.forEach((folderName) => {
    const sourceFolderPath = path.join(trainingsDir, folderName);
    const targetFolderPath = path.join(blogDir, folderName);

    console.log(`📂 Обработка папки: ${folderName}`);

    // Создаем целевую папку, если её нет
    if (!fs.existsSync(targetFolderPath)) {
      fs.mkdirSync(targetFolderPath, { recursive: true });
    }

    // Получаем все файлы из исходной папки
    const sourceFiles = getFilesInDirectory(sourceFolderPath);
    
    if (sourceFiles.length === 0) {
      console.log(`   ℹ️  Папка пуста, пропускаем`);
      folderStats.push({ folder: folderName, copied: 0, skipped: 0 });
      return;
    }

    console.log(`   📋 Найдено файлов: ${sourceFiles.length}`);

    let copiedCount = 0;
    let skippedCount = 0;

    // Копируем файлы с переименованием
    sourceFiles.forEach((sourceFilePath) => {
      const fileName = path.basename(sourceFilePath);
      const normalizedFileName = normalizeFileName(fileName);
      const targetFilePath = path.join(targetFolderPath, normalizedFileName);

      // Если файл с таким именем уже существует, добавляем суффикс
      let finalTargetPath = targetFilePath;
      let counter = 1;
      while (fs.existsSync(finalTargetPath)) {
        const ext = path.extname(normalizedFileName);
        const nameWithoutExt = path.basename(normalizedFileName, ext);
        finalTargetPath = path.join(targetFolderPath, `${nameWithoutExt}_${counter}${ext}`);
        counter++;
      }

      try {
        fs.copyFileSync(sourceFilePath, finalTargetPath);
        copiedCount++;
        
        // Показываем переименование только если имя изменилось
        if (fileName !== normalizedFileName) {
          console.log(`      ${fileName} -> ${path.basename(finalTargetPath)}`);
        }
      } catch (error) {
        console.error(`   ❌ Ошибка при копировании ${fileName}:`, error);
        skippedCount++;
      }
    });

    console.log(`   ✅ Скопировано: ${copiedCount}, пропущено: ${skippedCount}`);
    console.log('');

    totalCopiedFiles += copiedCount;
    totalSkippedFiles += skippedCount;
    folderStats.push({ folder: folderName, copied: copiedCount, skipped: skippedCount });
  });

  // Выводим итоговую статистику
  console.log('═'.repeat(60));
  console.log('📊 ИТОГОВАЯ СТАТИСТИКА');
  console.log('═'.repeat(60));
  console.log(`📁 Обработано папок: ${dateFolders.length}`);
  console.log(`✅ Всего скопировано файлов: ${totalCopiedFiles}`);
  if (totalSkippedFiles > 0) {
    console.log(`⚠️  Всего пропущено файлов: ${totalSkippedFiles}`);
  }
  console.log('');

  // Показываем статистику по папкам (первые 10)
  if (folderStats.length > 0) {
    console.log('📝 Статистика по папкам (первые 10):');
    folderStats.slice(0, 10).forEach((stat, index) => {
      console.log(`   ${index + 1}. ${stat.folder}: ${stat.copied} файлов`);
    });
    if (folderStats.length > 10) {
      console.log(`   ... и еще ${folderStats.length - 10} папок`);
    }
  }

  console.log('');
  console.log('✅ Готово! Структура папок создана в:', blogDir);
}

// Запускаем скрипт
main();
