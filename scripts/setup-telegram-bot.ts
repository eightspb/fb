/**
 * Скрипт для настройки Telegram webhook
 * 
 * Использование:
 * npm run setup:telegram-bot
 * или
 * npx tsx scripts/setup-telegram-bot.ts
 */

import axios from 'axios';
import dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL || process.env.NEXT_PUBLIC_SITE_URL;

async function setupWebhook() {
  if (!botToken) {
    console.error('❌ TELEGRAM_BOT_TOKEN не установлен в .env.local');
    console.log('\nДобавьте в .env.local:');
    console.log('TELEGRAM_BOT_TOKEN=your_bot_token_here');
    process.exit(1);
  }

  if (!webhookUrl) {
    console.error('❌ TELEGRAM_WEBHOOK_URL или NEXT_PUBLIC_SITE_URL не установлены');
    console.log('\nДобавьте в .env.local:');
    console.log('TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/telegram/webhook');
    console.log('или');
    console.log('NEXT_PUBLIC_SITE_URL=https://your-domain.com');
    process.exit(1);
  }

  const webhookEndpoint = webhookUrl.endsWith('/api/telegram/webhook')
    ? webhookUrl
    : `${webhookUrl}/api/telegram/webhook`;

  console.log('🔧 Настройка Telegram webhook...');
  console.log(`📍 URL: ${webhookEndpoint}`);

  try {
    // Устанавливаем webhook
    const response = await axios.post(
      `https://api.telegram.org/bot${botToken}/setWebhook`,
      {
        url: webhookEndpoint,
        allowed_updates: ['message', 'callback_query'],
      }
    );

    if (response.data.ok) {
      console.log('✅ Webhook успешно настроен!');
      console.log(`📋 Описание: ${response.data.description || 'N/A'}`);
    } else {
      console.error('❌ Ошибка при настройке webhook:', response.data);
    }

    // Проверяем текущий webhook
    const infoResponse = await axios.get(
      `https://api.telegram.org/bot${botToken}/getWebhookInfo`
    );

    if (infoResponse.data.ok) {
      const info = infoResponse.data.result;
      console.log('\n📊 Информация о webhook:');
      console.log(`   URL: ${info.url || 'не установлен'}`);
      console.log(`   Ожидает обновлений: ${info.pending_update_count || 0}`);
      if (info.last_error_date) {
        console.log(`   ⚠️  Последняя ошибка: ${info.last_error_message}`);
      }
    }
  } catch (error: any) {
    console.error('❌ Ошибка при настройке webhook:', error.message);
    if (error.response) {
      console.error('   Детали:', error.response.data);
    }
    process.exit(1);
  }
}

setupWebhook();

