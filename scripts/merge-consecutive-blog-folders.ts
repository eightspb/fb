import * as fs from 'fs';
import * as path from 'path';

// Функция для парсинга даты из имени папки
function parseDate(folderName: string): { year: number; month: number; day: number } | null {
  // Формат: YYYY.MM.DD или YYYY.MM.DD-DD или YYYY.MM.DD-
  const match = folderName.match(/^(\d{4})\.(\d{2})\.(\d{2})/);
  if (!match) {
    return null;
  }
  
  return {
    year: parseInt(match[1], 10),
    month: parseInt(match[2], 10),
    day: parseInt(match[3], 10),
  };
}

// Функция для проверки, является ли папка уже объединенной (имеет формат с дефисом)
function isAlreadyMerged(folderName: string): boolean {
  // Проверяем формат YYYY.MM.DD-DD (уже объединенная папка)
  return /^\d{4}\.\d{2}\.\d{2}-\d{2}$/.test(folderName);
}

// Функция для проверки, являются ли две даты последовательными (день за днем)
function areConsecutive(date1: { year: number; month: number; day: number }, 
                       date2: { year: number; month: number; day: number }): boolean {
  const d1 = new Date(date1.year, date1.month - 1, date1.day);
  const d2 = new Date(date2.year, date2.month - 1, date2.day);
  
  // Разница должна быть 1 день
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  
  return diffDays === 1;
}

// Функция для проверки, связаны ли папки одним мероприятием
// Проверяем по именам файлов - если есть похожие паттерны, вероятно одно мероприятие
function areLikelySameEvent(folder1: string, folder2: string, blogDir: string): boolean {
  const files1 = fs.readdirSync(path.join(blogDir, folder1)).filter(f => 
    fs.statSync(path.join(blogDir, folder1, f)).isFile()
  );
  const files2 = fs.readdirSync(path.join(blogDir, folder2)).filter(f => 
    fs.statSync(path.join(blogDir, folder2, f)).isFile()
  );
  
  // Если обе папки пусты, не объединяем
  if (files1.length === 0 || files2.length === 0) {
    return false;
  }
  
  // Проверяем, есть ли файлы с похожими именами (например, IMG_5786 и IMG_5783 - близкие номера)
  // Или если в именах файлов есть общие паттерны дат
  const fileNames1 = files1.map(f => f.toLowerCase());
  const fileNames2 = files2.map(f => f.toLowerCase());
  
  // Проверяем наличие общих паттернов в именах файлов
  // Например, если есть файлы с одинаковыми префиксами или близкими номерами
  for (const file1 of fileNames1) {
    for (const file2 of fileNames2) {
      // Проверяем, есть ли общие паттерны (например, IMG_57xx)
      const prefix1 = file1.match(/^(img_|photo-|dsc|img)(\d+)/i);
      const prefix2 = file2.match(/^(img_|photo-|dsc|img)(\d+)/i);
      
      if (prefix1 && prefix2) {
        const num1 = parseInt(prefix1[2], 10);
        const num2 = parseInt(prefix2[2], 10);
        // Если номера близки (разница меньше 100), вероятно одно мероприятие
        if (Math.abs(num1 - num2) < 100) {
          return true;
        }
      }
      
      // Проверяем наличие общих слов в именах файлов
      const words1 = file1.split(/[_\s-]/);
      const words2 = file2.split(/[_\s-]/);
      const commonWords = words1.filter(w => w.length > 3 && words2.includes(w));
      if (commonWords.length > 0) {
        return true;
      }
    }
  }
  
  // Если не нашли явных признаков, но даты последовательные, считаем что это одно мероприятие
  return true;
}

// Функция для создания имени объединенной папки
function createMergedFolderName(startDate: { year: number; month: number; day: number },
                                endDate: { year: number; month: number; day: number }): string {
  const startStr = `${startDate.year}.${String(startDate.month).padStart(2, '0')}.${String(startDate.day).padStart(2, '0')}`;
  const endStr = `${String(endDate.day).padStart(2, '0')}`;
  return `${startStr}-${endStr}`;
}

// Функция для получения всех папок с датами
function getDateFolders(blogDir: string): Array<{ name: string; date: { year: number; month: number; day: number } }> {
  const folders: Array<{ name: string; date: { year: number; month: number; day: number } }> = [];
  
  if (!fs.existsSync(blogDir)) {
    return folders;
  }

  const items = fs.readdirSync(blogDir);

  items.forEach((item) => {
    const itemPath = path.join(blogDir, item);
    const stat = fs.statSync(itemPath);

    if (stat.isDirectory()) {
      const date = parseDate(item);
      if (date) {
        folders.push({ name: item, date });
      }
    }
  });

  return folders.sort((a, b) => {
    if (a.date.year !== b.date.year) return a.date.year - b.date.year;
    if (a.date.month !== b.date.month) return a.date.month - b.date.month;
    return a.date.day - b.date.day;
  });
}

// Основная функция
function main() {
  const blogDir = path.join(process.cwd(), 'public', 'images', 'blog');

  console.log('📁 Папка blog:', blogDir);
  console.log('');

  if (!fs.existsSync(blogDir)) {
    console.error('❌ Ошибка: папка blog не найдена!');
    process.exit(1);
  }

  console.log('🔍 Поиск папок с последовательными датами...');
  console.log('');

  const folders = getDateFolders(blogDir);
  console.log(`📊 Найдено папок с датами: ${folders.length}`);
  console.log('');

  const mergedPairs: Array<{ 
    folders: string[]; 
    mergedName: string;
    startDate: { year: number; month: number; day: number };
    endDate: { year: number; month: number; day: number };
  }> = [];

  // Находим последовательные папки
  for (let i = 0; i < folders.length - 1; i++) {
    const folder1 = folders[i];
    const folder2 = folders[i + 1];
    
    // Пропускаем папки, которые уже имеют формат с дефисом (например, 2015.10.15-16)
    // Они уже объединены (но не папки с дефисом в конце, например 2015.10.16-)
    if (isAlreadyMerged(folder1.name) || isAlreadyMerged(folder2.name)) {
      continue;
    }
    
    // Проверяем, являются ли даты последовательными
    if (areConsecutive(folder1.date, folder2.date)) {
      // Проверяем, связаны ли они одним мероприятием
      if (areLikelySameEvent(folder1.name, folder2.name, blogDir)) {
        // Проверяем, не объединены ли уже эти папки
        const alreadyMerged = mergedPairs.some(pair => 
          pair.folders.includes(folder1.name) || pair.folders.includes(folder2.name)
        );
        
        if (!alreadyMerged) {
          const mergedName = createMergedFolderName(folder1.date, folder2.date);
          mergedPairs.push({
            folders: [folder1.name, folder2.name],
            mergedName,
            startDate: folder1.date,
            endDate: folder2.date,
          });
        }
      }
    }
  }

  // Обрабатываем последовательности из 3+ папок
  for (let i = 0; i < folders.length - 2; i++) {
    const folder1 = folders[i];
    const folder2 = folders[i + 1];
    const folder3 = folders[i + 2];
    
    // Пропускаем папки, которые уже имеют формат с дефисом
    if (isAlreadyMerged(folder1.name) || isAlreadyMerged(folder2.name) || isAlreadyMerged(folder3.name)) {
      continue;
    }
    
    if (areConsecutive(folder1.date, folder2.date) && 
        areConsecutive(folder2.date, folder3.date)) {
      if (areLikelySameEvent(folder1.name, folder2.name, blogDir) &&
          areLikelySameEvent(folder2.name, folder3.name, blogDir)) {
        const alreadyMerged = mergedPairs.some(pair => 
          pair.folders.includes(folder1.name) || 
          pair.folders.includes(folder2.name) || 
          pair.folders.includes(folder3.name)
        );
        
        if (!alreadyMerged) {
          const mergedName = createMergedFolderName(folder1.date, folder3.date);
          mergedPairs.push({
            folders: [folder1.name, folder2.name, folder3.name],
            mergedName,
            startDate: folder1.date,
            endDate: folder3.date,
          });
        }
      }
    }
  }

  // Обрабатываем последовательности из 4+ папок
  for (let i = 0; i < folders.length - 3; i++) {
    const folder1 = folders[i];
    const folder2 = folders[i + 1];
    const folder3 = folders[i + 2];
    const folder4 = folders[i + 3];
    
    // Пропускаем папки, которые уже имеют формат с дефисом
    if (isAlreadyMerged(folder1.name) || isAlreadyMerged(folder2.name) || 
        isAlreadyMerged(folder3.name) || isAlreadyMerged(folder4.name)) {
      continue;
    }
    
    if (areConsecutive(folder1.date, folder2.date) && 
        areConsecutive(folder2.date, folder3.date) &&
        areConsecutive(folder3.date, folder4.date)) {
      if (areLikelySameEvent(folder1.name, folder2.name, blogDir) &&
          areLikelySameEvent(folder2.name, folder3.name, blogDir) &&
          areLikelySameEvent(folder3.name, folder4.name, blogDir)) {
        const alreadyMerged = mergedPairs.some(pair => 
          pair.folders.some(f => 
            f === folder1.name || f === folder2.name || f === folder3.name || f === folder4.name
          )
        );
        
        if (!alreadyMerged) {
          const mergedName = createMergedFolderName(folder1.date, folder4.date);
          mergedPairs.push({
            folders: [folder1.name, folder2.name, folder3.name, folder4.name],
            mergedName,
            startDate: folder1.date,
            endDate: folder4.date,
          });
        }
      }
    }
  }

  // Обрабатываем папки с дефисом в конце (например, 2015.10.16-)
  // Они должны объединяться с предыдущей папкой, которая уже имеет формат с дефисом
  for (let i = 0; i < folders.length; i++) {
    const folder = folders[i];
    
    // Проверяем, является ли это папкой с дефисом в конце (например, 2015.10.16-)
    if (folder.name.endsWith('-') && !isAlreadyMerged(folder.name)) {
      // Ищем предыдущую папку с такой же датой начала
      const folderDate = parseDate(folder.name);
      if (!folderDate) continue;
      
      // Ищем папку, которая начинается с той же даты и уже объединена
      for (let j = i - 1; j >= 0; j--) {
        const prevFolder = folders[j];
        const prevDate = parseDate(prevFolder.name);
        
        if (prevDate && 
            prevDate.year === folderDate.year &&
            prevDate.month === folderDate.month &&
            prevDate.day === folderDate.day - 1 &&
            isAlreadyMerged(prevFolder.name)) {
          // Найдена предыдущая объединенная папка, добавляем текущую папку к ней
          const alreadyMerged = mergedPairs.some(pair => 
            pair.folders.includes(folder.name) || pair.mergedName === prevFolder.name
          );
          
          if (!alreadyMerged) {
            // Добавляем файлы из папки с дефисом в существующую объединенную папку
            mergedPairs.push({
              folders: [folder.name],
              mergedName: prevFolder.name, // Используем имя существующей объединенной папки
              startDate: prevDate,
              endDate: folderDate,
            });
          }
          break;
        }
      }
    }
  }

  if (mergedPairs.length === 0) {
    console.log('ℹ️  Не найдено папок для объединения');
    return;
  }

  console.log(`📋 Найдено групп для объединения: ${mergedPairs.length}`);
  console.log('');

  // Показываем найденные пары
  mergedPairs.forEach((pair, index) => {
    console.log(`${index + 1}. Объединить:`);
    pair.folders.forEach(folder => {
      console.log(`   - ${folder}`);
    });
    console.log(`   → ${pair.mergedName}`);
    console.log('');
  });

  // Объединяем папки
  let mergedCount = 0;
  let filesMoved = 0;

  mergedPairs.forEach((pair) => {
    const mergedPath = path.join(blogDir, pair.mergedName);
    
    // Создаем объединенную папку, если её нет
    if (!fs.existsSync(mergedPath)) {
      fs.mkdirSync(mergedPath, { recursive: true });
    }

    // Перемещаем файлы из всех папок в объединенную
    pair.folders.forEach((folderName) => {
      const sourcePath = path.join(blogDir, folderName);
      
      if (!fs.existsSync(sourcePath)) {
        console.log(`⚠️  Папка не найдена: ${folderName}`);
        return;
      }

      const files = fs.readdirSync(sourcePath).filter(f => 
        fs.statSync(path.join(sourcePath, f)).isFile()
      );

      files.forEach((fileName) => {
        const sourceFile = path.join(sourcePath, fileName);
        const targetFile = path.join(mergedPath, fileName);

        // Если файл с таким именем уже существует, добавляем суффикс
        let finalTargetFile = targetFile;
        let counter = 1;
        while (fs.existsSync(finalTargetFile)) {
          const ext = path.extname(fileName);
          const nameWithoutExt = path.basename(fileName, ext);
          finalTargetFile = path.join(mergedPath, `${nameWithoutExt}_${counter}${ext}`);
          counter++;
        }

        try {
          fs.copyFileSync(sourceFile, finalTargetFile);
          // Удаляем исходный файл после копирования
          fs.unlinkSync(sourceFile);
          filesMoved++;
        } catch (error) {
          console.error(`❌ Ошибка при копировании ${fileName}:`, error);
        }
      });

      // Удаляем исходную папку после копирования всех файлов (рекурсивно)
      try {
        // Проверяем, пуста ли папка
        const remainingItems = fs.readdirSync(sourcePath);
        if (remainingItems.length === 0) {
          fs.rmdirSync(sourcePath);
          console.log(`✅ Удалена папка: ${folderName}`);
        } else {
          // Если папка не пуста, удаляем все содержимое рекурсивно
          fs.rmSync(sourcePath, { recursive: true, force: true });
          console.log(`✅ Удалена папка (рекурсивно): ${folderName}`);
        }
      } catch (error) {
        // Пытаемся удалить еще раз через небольшую задержку
        try {
          fs.rmSync(sourcePath, { recursive: true, force: true });
          console.log(`✅ Удалена папка (повторная попытка): ${folderName}`);
        } catch (error2) {
          console.error(`⚠️  Не удалось удалить папку ${folderName}:`, error2);
        }
      }
    });

    mergedCount++;
    console.log(`✅ Объединена группа в папку: ${pair.mergedName}`);
    console.log('');
  });

  // Итоговая статистика
  console.log('═'.repeat(60));
  console.log('📊 ИТОГОВАЯ СТАТИСТИКА');
  console.log('═'.repeat(60));
  console.log(`📁 Объединено групп: ${mergedCount}`);
  console.log(`📋 Перемещено файлов: ${filesMoved}`);
  console.log('');
  console.log('✅ Готово!');
}

// Запускаем скрипт
main();
