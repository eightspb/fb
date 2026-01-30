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

// Функция для получения текущей даты в формате YYYY.MM.DD
function getCurrentDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

// Рекурсивная функция для обхода всех файлов в директории
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

// Основная функция
function main() {
  const trainingsDir = path.join(process.cwd(), 'public', 'images', 'trainings');
  const currentDate = getCurrentDate();
  const targetDir = path.join(trainingsDir, currentDate);

  console.log('📁 Исходная папка:', trainingsDir);
  console.log('📁 Целевая папка:', targetDir);
  console.log('📅 Дата:', currentDate);
  console.log('');

  // Проверяем существование исходной папки
  if (!fs.existsSync(trainingsDir)) {
    console.error('❌ Ошибка: папка trainings не найдена!');
    process.exit(1);
  }

  // Создаем целевую папку, если её нет
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    console.log('✅ Создана папка:', targetDir);
  } else {
    console.log('⚠️  Папка уже существует:', targetDir);
  }

  console.log('');
  console.log('🔍 Поиск файлов...');

  // Получаем все файлы из всех подпапок trainings
  const allFiles = getAllFiles(trainingsDir);
  
  // Фильтруем файлы, исключая файлы из целевой папки (чтобы не копировать самих себя)
  const filesToCopy = allFiles.filter(file => !file.startsWith(targetDir));

  console.log(`📊 Найдено файлов для копирования: ${filesToCopy.length}`);
  console.log('');

  let copiedCount = 0;
  let skippedCount = 0;
  const copiedFiles: string[] = [];

  // Копируем файлы
  filesToCopy.forEach((filePath) => {
    const fileName = path.basename(filePath);
    const normalizedFileName = normalizeFileName(fileName);
    const targetFilePath = path.join(targetDir, normalizedFileName);

    // Если файл с таким именем уже существует, пропускаем или добавляем суффикс
    let finalTargetPath = targetFilePath;
    let counter = 1;
    while (fs.existsSync(finalTargetPath)) {
      const ext = path.extname(normalizedFileName);
      const nameWithoutExt = path.basename(normalizedFileName, ext);
      finalTargetPath = path.join(targetDir, `${nameWithoutExt}_${counter}${ext}`);
      counter++;
    }

    try {
      fs.copyFileSync(filePath, finalTargetPath);
      copiedCount++;
      copiedFiles.push(`${fileName} -> ${path.basename(finalTargetPath)}`);
      
      if (copiedCount % 10 === 0) {
        process.stdout.write(`\r📋 Скопировано: ${copiedCount}/${filesToCopy.length}`);
      }
    } catch (error) {
      console.error(`\n❌ Ошибка при копировании ${fileName}:`, error);
      skippedCount++;
    }
  });

  console.log(`\r📋 Скопировано: ${copiedCount}/${filesToCopy.length}`);
  console.log('');

  // Выводим статистику
  console.log('📊 Статистика:');
  console.log(`   ✅ Скопировано файлов: ${copiedCount}`);
  if (skippedCount > 0) {
    console.log(`   ⚠️  Пропущено файлов: ${skippedCount}`);
  }
  console.log('');

  // Показываем примеры переименованных файлов
  if (copiedFiles.length > 0) {
    console.log('📝 Примеры переименованных файлов (первые 10):');
    copiedFiles.slice(0, 10).forEach((item, index) => {
      console.log(`   ${index + 1}. ${item}`);
    });
    if (copiedFiles.length > 10) {
      console.log(`   ... и еще ${copiedFiles.length - 10} файлов`);
    }
  }

  console.log('');
  console.log('✅ Готово! Все файлы скопированы в папку:', targetDir);
}

// Запускаем скрипт
main();
