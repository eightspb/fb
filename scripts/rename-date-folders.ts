/**
 * Скрипт для переименования папок с датами из формата DD.MM.YYYY в YYYY.MM.DD
 * 
 * Использование:
 * npm run rename:folders
 * или
 * npx tsx scripts/rename-date-folders.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const TRAININGS_DIR = path.join(process.cwd(), 'public', 'images', 'trainings');

/**
 * Проверяет, является ли имя папки датой в формате DD.MM.YYYY
 */
function isDateFolder(folderName: string): boolean {
  // Проверяем формат DD.MM.YYYY (например, 26.04.2025)
  const datePattern = /^(\d{2})\.(\d{2})\.(\d{4})$/;
  return datePattern.test(folderName);
}

/**
 * Преобразует дату из формата DD.MM.YYYY в YYYY.MM.DD
 */
function convertDateFormat(oldFormat: string): string | null {
  const match = oldFormat.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) {
    return null;
  }
  
  const [, day, month, year] = match;
  
  // Проверяем валидность даты
  const dayNum = parseInt(day, 10);
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);
  
  if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 1900 || yearNum > 2100) {
    return null;
  }
  
  // Возвращаем в формате YYYY.MM.DD
  return `${year}.${month}.${day}`;
}

/**
 * Основная функция переименования папок
 */
async function renameFolders() {
  console.log('🚀 Начало переименования папок с датами...\n');
  console.log(`📁 Папка: ${TRAININGS_DIR}\n`);

  if (!fs.existsSync(TRAININGS_DIR)) {
    console.error(`❌ Ошибка: Папка ${TRAININGS_DIR} не существует!`);
    process.exit(1);
  }

  // Читаем все элементы в директории
  const items = fs.readdirSync(TRAININGS_DIR);
  
  let renamedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const renamedFolders: Array<{ old: string; new: string }> = [];

  for (const item of items) {
    const itemPath = path.join(TRAININGS_DIR, item);
    
    // Пропускаем файлы
    try {
      const stats = fs.statSync(itemPath);
      if (!stats.isDirectory()) {
        continue;
      }
    } catch {
      continue;
    }
    
    // Проверяем, является ли папка датой в формате DD.MM.YYYY
    if (!isDateFolder(item)) {
      skippedCount++;
      continue;
    }

    // Преобразуем формат даты
    const newFormat = convertDateFormat(item);
    if (!newFormat) {
      console.log(`  ⚠️  Пропущена папка (неверный формат): ${item}`);
      skippedCount++;
      continue;
    }

    const newPath = path.join(TRAININGS_DIR, newFormat);

    // Проверяем, не существует ли уже папка с новым именем
    if (fs.existsSync(newPath)) {
      console.log(`  ⚠️  Папка уже существует: ${newFormat}, пропускаем ${item}`);
      skippedCount++;
      continue;
    }

    // Переименовываем папку
    try {
      fs.renameSync(itemPath, newPath);
      console.log(`  ✅ ${item} → ${newFormat}`);
      renamedFolders.push({ old: item, new: newFormat });
      renamedCount++;
    } catch (error) {
      console.error(`  ❌ Ошибка при переименовании ${item}:`, error instanceof Error ? error.message : error);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Итоги переименования:');
  console.log(`  ✅ Переименовано: ${renamedCount}`);
  console.log(`  ⏭️  Пропущено: ${skippedCount}`);
  console.log(`  ❌ Ошибок: ${errorCount}`);
  
  if (renamedFolders.length > 0) {
    console.log('\n📋 Переименованные папки:');
    renamedFolders.forEach(({ old, new: newName }) => {
      console.log(`    ${old} → ${newName}`);
    });
  }
  
  console.log('='.repeat(50));

  if (errorCount === 0 && renamedCount > 0) {
    console.log('\n🎉 Переименование завершено успешно!');
  } else if (renamedCount === 0) {
    console.log('\nℹ️  Нет папок для переименования или все уже в правильном формате.');
  } else {
    console.log('\n⚠️  Переименование завершено с ошибками. Проверьте логи выше.');
  }
}

// Запускаем переименование
renameFolders().catch((error) => {
  console.error('❌ Критическая ошибка:', error);
  process.exit(1);
});

