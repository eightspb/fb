import * as fs from 'fs';
import * as path from 'path';

// Функция для парсинга даты из имени папки
function parseDate(folderName: string): { year: number; month: number; day: number } | null {
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

// Функция для проверки, является ли папка объединенной
function isMergedFolder(folderName: string): boolean {
  return /^\d{4}\.\d{2}\.\d{2}-\d{2}$/.test(folderName);
}

// Функция для получения всех папок
function getAllFolders(blogDir: string): string[] {
  if (!fs.existsSync(blogDir)) {
    return [];
  }

  return fs.readdirSync(blogDir).filter(item => {
    const itemPath = path.join(blogDir, item);
    return fs.statSync(itemPath).isDirectory();
  });
}

function main() {
  const blogDir = path.join(process.cwd(), 'public', 'images', 'blog');

  console.log('📁 Папка blog:', blogDir);
  console.log('');

  if (!fs.existsSync(blogDir)) {
    console.error('❌ Ошибка: папка blog не найдена!');
    process.exit(1);
  }

  const allFolders = getAllFolders(blogDir);
  const mergedFolders = allFolders.filter(isMergedFolder);
  const singleFolders = allFolders.filter(f => !isMergedFolder(f));

  console.log(`📊 Всего папок: ${allFolders.length}`);
  console.log(`📁 Объединенных папок: ${mergedFolders.length}`);
  console.log(`📁 Одиночных папок: ${singleFolders.length}`);
  console.log('');

  // Находим одиночные папки, которые должны быть удалены, так как есть их объединенные версии
  const foldersToDelete: string[] = [];

  mergedFolders.forEach(mergedFolder => {
    // Извлекаем даты из объединенной папки (например, 2025.02.12-13)
    const match = mergedFolder.match(/^(\d{4})\.(\d{2})\.(\d{2})-(\d{2})$/);
    if (!match) return;

    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const startDay = parseInt(match[3], 10);
    const endDay = parseInt(match[4], 10);

    // Проверяем все дни в диапазоне
    for (let day = startDay; day <= endDay; day++) {
      const folderName = `${year}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}`;
      
      // Если такая папка существует и не является объединенной, добавляем в список на удаление
      if (singleFolders.includes(folderName) && !foldersToDelete.includes(folderName)) {
        // Проверяем, что файлы действительно были скопированы в объединенную папку
        const singleFolderPath = path.join(blogDir, folderName);
        const mergedFolderPath = path.join(blogDir, mergedFolder);
        
        if (fs.existsSync(singleFolderPath) && fs.existsSync(mergedFolderPath)) {
          const singleFiles = fs.readdirSync(singleFolderPath).filter(f => 
            fs.statSync(path.join(singleFolderPath, f)).isFile()
          );
          const mergedFiles = fs.readdirSync(mergedFolderPath).filter(f => 
            fs.statSync(path.join(mergedFolderPath, f)).isFile()
          );
          
          // Проверяем, что хотя бы некоторые файлы из одиночной папки есть в объединенной
          const commonFiles = singleFiles.filter(f => mergedFiles.includes(f));
          if (commonFiles.length > 0 || singleFiles.length === 0) {
            foldersToDelete.push(folderName);
          }
        }
      }
    }
  });

  if (foldersToDelete.length === 0) {
    console.log('ℹ️  Не найдено папок для удаления');
    return;
  }

  console.log(`📋 Найдено папок для удаления: ${foldersToDelete.length}`);
  console.log('');
  foldersToDelete.forEach(folder => {
    console.log(`   - ${folder}`);
  });
  console.log('');

  // Удаляем папки
  let deletedCount = 0;
  foldersToDelete.forEach(folderName => {
    const folderPath = path.join(blogDir, folderName);
    
    try {
      if (fs.existsSync(folderPath)) {
        fs.rmSync(folderPath, { recursive: true, force: true });
        console.log(`✅ Удалена папка: ${folderName}`);
        deletedCount++;
      }
    } catch (error) {
      console.error(`❌ Ошибка при удалении ${folderName}:`, error);
    }
  });

  console.log('');
  console.log('═'.repeat(60));
  console.log('📊 ИТОГОВАЯ СТАТИСТИКА');
  console.log('═'.repeat(60));
  console.log(`✅ Удалено папок: ${deletedCount}`);
  console.log('');
  console.log('✅ Готово!');
}

main();
