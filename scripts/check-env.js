#!/usr/bin/env node

/**
 * Проверка переменных окружения
 * Показывает, какие значения видит приложение
 */

// Загружаем переменные окружения так же, как это делает Next.js
const fs = require('fs');
const path = require('path');

function loadEnvFile(filename) {
  const filePath = path.join(process.cwd(), filename);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const vars = {};
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (match) {
      vars[match[1]] = match[2];
    }
  }
  
  return vars;
}

console.log('🔍 Проверка переменных окружения\n');
console.log('─'.repeat(60));

// Проверяем .env
const envVars = loadEnvFile('.env');
if (envVars) {
  console.log('\n📄 Файл .env:');
  if (envVars.ADMIN_PASSWORD) {
    const masked = envVars.ADMIN_PASSWORD.substring(0, 4) + '*'.repeat(Math.max(0, envVars.ADMIN_PASSWORD.length - 4));
    console.log(`   ADMIN_PASSWORD = ${masked} (длина: ${envVars.ADMIN_PASSWORD.length})`);
  } else {
    console.log('   ADMIN_PASSWORD = не установлен');
  }
}

// Проверяем .env.local
const envLocalVars = loadEnvFile('.env.local');
if (envLocalVars) {
  console.log('\n📄 Файл .env.local:');
  if (envLocalVars.ADMIN_PASSWORD) {
    const masked = envLocalVars.ADMIN_PASSWORD.substring(0, 4) + '*'.repeat(Math.max(0, envLocalVars.ADMIN_PASSWORD.length - 4));
    console.log(`   ADMIN_PASSWORD = ${masked} (длина: ${envLocalVars.ADMIN_PASSWORD.length})`);
  } else {
    console.log('   ADMIN_PASSWORD = не установлен');
  }
}

// Проверяем process.env (то, что действительно используется)
console.log('\n🔧 Текущие переменные окружения (process.env):');
if (process.env.ADMIN_PASSWORD) {
  const masked = process.env.ADMIN_PASSWORD.substring(0, 4) + '*'.repeat(Math.max(0, process.env.ADMIN_PASSWORD.length - 4));
  console.log(`   ADMIN_PASSWORD = ${masked} (длина: ${process.env.ADMIN_PASSWORD.length})`);
} else {
  console.log('   ADMIN_PASSWORD = не установлен');
}

console.log('\n─'.repeat(60));
console.log('\n✅ Для входа в админ панель используйте:');
console.log(`   Логин: ${process.env.ADMIN_USERNAME || 'admin'}`);
if (envLocalVars?.ADMIN_PASSWORD) {
  console.log(`   Пароль: ${envLocalVars.ADMIN_PASSWORD}`);
} else if (envVars?.ADMIN_PASSWORD) {
  console.log(`   Пароль: ${envVars.ADMIN_PASSWORD}`);
} else {
  console.log('   Пароль: не найден в .env файлах');
}
console.log();
