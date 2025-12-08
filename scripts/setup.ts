/**
 * Главный скрипт инициализации проекта
 * 
 * Выполняет:
 * 1. Проверку/создание Supabase проекта
 * 2. Выполнение SQL схемы
 * 3. Миграцию данных из news-data.ts
 * 4. Создание новостей из папок с фотографиями
 * 
 * Использование:
 * npm run setup
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🚀 Инициализация проекта FB.NET\n');

// Проверка переменных окружения
function checkEnvironment() {
  console.log('📋 Проверка переменных окружения...');
  
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.log('⚠️  Переменные окружения Supabase не найдены.');
    console.log('\nВыберите вариант:');
    console.log('1. Использовать Supabase CLI (локально)');
    console.log('2. Использовать Docker Compose');
    console.log('3. Использовать облачный Supabase');
    console.log('\nДля варианта 1 или 2:');
    console.log('  - Создайте .env.local в корне проекта');
    console.log('  - Добавьте переменные (см. .env.example)');
    console.log('\nДля варианта 3:');
    console.log('  - Создайте проект на supabase.com');
    console.log('  - Скопируйте URL и ключи в .env.local');
    
    return false;
  }
  
  console.log('✅ Переменные окружения настроены\n');
  return true;
}

// Выполнение SQL схемы
async function executeSchema() {
  console.log('📊 Выполнение SQL схемы базы данных...');
  
  const schemaPath = path.join(process.cwd(), 'supabase-schema.sql');
  
  if (!fs.existsSync(schemaPath)) {
    console.error('❌ Файл supabase-schema.sql не найден!');
    return false;
  }
  
  try {
    // Используем Supabase CLI если доступен
    try {
      execSync('supabase --version', { stdio: 'ignore' });
      console.log('  Используется Supabase CLI...');
      
      // Выполняем через Supabase CLI
      execSync(`supabase db execute -f ${schemaPath}`, { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      console.log('✅ SQL схема выполнена успешно\n');
      return true;
    } catch {
      // Если Supabase CLI недоступен, пытаемся через Docker
      console.log('  Supabase CLI не найден, проверяем Docker...');
      
      try {
        execSync('docker ps', { stdio: 'ignore' });
        
        // Выполняем через Docker
        execSync(`docker exec -i fb-net-supabase-db psql -U postgres -d postgres < ${schemaPath}`, {
          stdio: 'inherit'
        });
        
        console.log('✅ SQL схема выполнена успешно\n');
        return true;
      } catch {
        console.log('⚠️  Docker контейнер не запущен.');
        console.log('  Запустите: npm run docker:up');
        console.log('  Или выполните SQL схему вручную в Supabase Studio\n');
        return false;
      }
    }
  } catch (error) {
    console.error('❌ Ошибка при выполнении SQL схемы:', error instanceof Error ? error.message : error);
    console.log('\n💡 Выполните SQL схему вручную:');
    console.log('  - Откройте Supabase Studio');
    console.log('  - Перейдите в SQL Editor');
    console.log('  - Скопируйте содержимое supabase-schema.sql');
    console.log('  - Выполните SQL\n');
    return false;
  }
}

// Миграция данных
async function migrateData() {
  console.log('📦 Миграция данных из news-data.ts...');
  
  try {
    execSync('npm run migrate:news', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log('✅ Миграция данных завершена\n');
    return true;
  } catch (error) {
    console.error('❌ Ошибка при миграции данных:', error instanceof Error ? error.message : error);
    return false;
  }
}

// Создание новостей из папок
async function createNewsFromFolders() {
  console.log('📸 Создание новостей из папок с фотографиями...');
  
  try {
    execSync('npm run create:news-from-folders', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log('✅ Создание новостей завершено\n');
    return true;
  } catch (error) {
    console.error('❌ Ошибка при создании новостей:', error instanceof Error ? error.message : error);
    return false;
  }
}

// Главная функция
async function setup() {
  console.log('='.repeat(50));
  console.log('  ИНИЦИАЛИЗАЦИЯ ПРОЕКТА FB.NET');
  console.log('='.repeat(50));
  console.log();
  
  const results = {
    environment: false,
    schema: false,
    migration: false,
    newsCreation: false
  };
  
  // Шаг 1: Проверка окружения
  results.environment = checkEnvironment();
  
  if (!results.environment) {
    console.log('\n⚠️  Продолжите настройку вручную согласно инструкциям выше.');
    process.exit(1);
  }
  
  // Шаг 2: Выполнение схемы
  results.schema = await executeSchema();
  
  if (!results.schema) {
    console.log('\n⚠️  Выполните SQL схему вручную перед продолжением.');
    console.log('  После выполнения схемы запустите: npm run setup:migrate');
    process.exit(1);
  }
  
  // Шаг 3: Миграция данных
  results.migration = await migrateData();
  
  // Шаг 4: Создание новостей из папок
  results.newsCreation = await createNewsFromFolders();
  
  // Итоги
  console.log('\n' + '='.repeat(50));
  console.log('📊 ИТОГИ ИНИЦИАЛИЗАЦИИ:');
  console.log('='.repeat(50));
  console.log(`  ${results.environment ? '✅' : '❌'} Переменные окружения`);
  console.log(`  ${results.schema ? '✅' : '❌'} SQL схема`);
  console.log(`  ${results.migration ? '✅' : '❌'} Миграция данных`);
  console.log(`  ${results.newsCreation ? '✅' : '❌'} Создание новостей из папок`);
  console.log('='.repeat(50));
  
  const allSuccess = Object.values(results).every(r => r);
  
  if (allSuccess) {
    console.log('\n🎉 Инициализация завершена успешно!');
    console.log('\n✅ Приложение автоматически использует базу данных Supabase!');
    console.log('\n📝 Следующие шаги:');
    console.log('  1. Запустите приложение: npm run dev');
    console.log('  2. Откройте http://localhost:3000');
    console.log('  3. Проверьте страницу /news - данные должны загружаться из Supabase');
    console.log('\n💡 Компоненты уже настроены для автоматического использования Supabase');
    console.log('   Если база недоступна, приложение использует fallback на статические данные');
  } else {
    console.log('\n⚠️  Инициализация завершена с ошибками.');
    console.log('  Проверьте логи выше и выполните недостающие шаги вручную.');
  }
}

setup().catch((error) => {
  console.error('❌ Критическая ошибка:', error);
  process.exit(1);
});

