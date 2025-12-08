/**
 * Интеграция с OpenRouter API для расширения текста через ChatGPT
 */

import axios from 'axios';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'openai/gpt-4o-mini'; // Можно изменить на openai/gpt-4 или openai/gpt-3.5-turbo

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface ExpandedNews {
  title: string;
  shortDescription: string;
  fullDescription: string;
}

/**
 * Расширяет краткий текст в полноценную новость с помощью AI
 */
export async function expandTextWithAI(
  text: string,
  context?: {
    date?: string;
    location?: string;
    imagesCount?: number;
    videosCount?: number;
  }
): Promise<ExpandedNews> {
  console.log('[AI] 🤖 Начало расширения текста через OpenRouter');
  console.log(`[AI] 📝 Исходный текст: "${text.substring(0, 100)}..."`);
  
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.warn('[AI] ⚠️ OPENROUTER_API_KEY не установлен, используем fallback');
    console.warn('[AI] ⚠️ Проверьте переменную окружения OPENROUTER_API_KEY в .env.local');
    return {
      title: text.substring(0, 50),
      shortDescription: text.substring(0, 200),
      fullDescription: text,
    };
  }

  // Проверяем, что ключ не пустой
  if (apiKey.trim().length === 0) {
    console.warn('[AI] ⚠️ OPENROUTER_API_KEY пустой, используем fallback');
    return {
      title: text.substring(0, 50),
      shortDescription: text.substring(0, 200),
      fullDescription: text,
    };
  }

  console.log(`[AI] 🔑 API ключ найден (длина: ${apiKey.length} символов, первые 10: ${apiKey.substring(0, 10)}...)`);

  // Формируем промпт
  const contextInfo = [];
  if (context?.date) {
    contextInfo.push(`Дата события: ${context.date}`);
  }
  if (context?.location) {
    contextInfo.push(`Место проведения: ${context.location}`);
  }
  if (context?.imagesCount && context.imagesCount > 0) {
    contextInfo.push(`Количество фотографий: ${context.imagesCount}`);
  }
  if (context?.videosCount && context.videosCount > 0) {
    contextInfo.push(`Количество видео: ${context.videosCount}`);
  }

  console.log(`[AI] 📊 Контекст: ${contextInfo.join(', ')}`);

  const systemPrompt = `Ты профессиональный журналист, специализирующийся на медицинских новостях и мероприятиях. 
Твоя задача - преобразовать краткое описание события в полноценную, информативную новость для медицинского сайта.

КРИТИЧЕСКИ ВАЖНО: Ты ДОЛЖЕН расширить и дополнить исходный текст. Не просто переписывай его, а создавай новую, более подробную версию.

Формат ответа должен быть строго в JSON:
{
  "title": "Заголовок новости (краткий, информативный, 5-10 слов)",
  "shortDescription": "Краткое описание (1-2 предложения, до 200 символов)",
  "fullDescription": "Полное описание события (3-5 абзацев, минимум 300 слов, подробное и информативное)"
}

Требования к расширению:
- ВАЖНО: Расширь исходный текст минимум в 3-5 раз
- Добавь контекст о медицинской тематике мероприятия
- Упомяни важность события для медицинского сообщества
- Добавь детали о возможных результатах или целях мероприятия
- Используй профессиональный медицинский стиль
- Сохрани все важные детали из исходного текста
- Сделай текст интересным и информативным для читателей медицинского сайта
- Полное описание должно быть развернутым и содержательным`;

  const userPrompt = `Исходный текст события:
"${text}"

${contextInfo.length > 0 ? `Дополнительная информация:\n${contextInfo.join('\n')}\n` : ''}
ВАЖНО: Расширь этот текст в полноценную новость. Не просто переписывай его, а создавай новую, более подробную версию с дополнительными деталями, контекстом и информацией о медицинской тематике. Полное описание должно быть минимум в 3-5 раз длиннее исходного текста.

Создай развернутую новость на основе этого текста. Если речь идет об обучении, то обучение в клинике проходит только методики вакуумно-аспирационной биопсии. И вообще клиника занимается мамологией, и все новости связаны именно с молочной железой`;

  try {
    console.log('[AI] 📤 Отправка запроса к OpenRouter...');
    const response = await axios.post<OpenRouterResponse>(
      OPENROUTER_API_URL,
      {
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature: 0.8,
        max_tokens: 2000,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
          'X-Title': 'FB.NET News Bot',
          'Content-Type': 'application/json',
        },
      }
    );

    const content = response.data.choices[0]?.message?.content;
    console.log(`[AI] 📥 Получен ответ от OpenRouter (${content?.length || 0} символов)`);
    console.log(`[AI] 📄 Первые 200 символов ответа: "${content?.substring(0, 200) || 'пусто'}..."`);

    if (!content) {
      console.warn('[AI] ⚠️ Пустой ответ от OpenRouter, используем fallback');
      throw new Error('Пустой ответ от OpenRouter');
    }

    // Пытаемся распарсить JSON из ответа
    let parsed: ExpandedNews;
    try {
      // Убираем markdown форматирование, если есть
      const cleanedContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      parsed = JSON.parse(cleanedContent);
      console.log('[AI] ✅ JSON успешно распарсен');
    } catch (_parseError) {
      // Если не удалось распарсить JSON, создаем структуру из текста
      console.warn('[AI] ⚠️ Не удалось распарсить JSON ответ от AI, используем fallback');
      const lines = content.split('\n').filter((line) => line.trim());
      
      parsed = {
        title: lines[0]?.replace(/^#+\s*/, '').substring(0, 100) || text.substring(0, 50),
        shortDescription: lines.slice(0, 2).join(' ').substring(0, 200) || text.substring(0, 150),
        fullDescription: content.substring(0, 2000) || text,
      };
    }

    // Валидация и очистка данных
    const result = {
      title: parsed.title?.trim() || text.substring(0, 50),
      shortDescription: parsed.shortDescription?.trim() || text.substring(0, 200),
      fullDescription: parsed.fullDescription?.trim() || text,
    };
    
    console.log(`[AI] ✅ Текст расширен: "${result.title}"`);
    return result;
  } catch (error) {
    console.error('[AI] ❌ Ошибка при расширении текста через OpenRouter:', error);
    if (error instanceof Error) {
      console.error('[AI] Сообщение об ошибке:', error.message);
      if (error.message.includes('401')) {
        console.error('[AI] ❌ ОШИБКА 401: Неверный API ключ OpenRouter!');
        console.error('[AI] ❌ Проверьте переменную OPENROUTER_API_KEY в .env.local');
        console.error('[AI] ❌ Убедитесь, что ключ начинается с "sk-or-v1-"');
      }
      if (error.message.includes('429')) {
        console.error('[AI] ❌ ОШИБКА 429: Превышен лимит запросов к OpenRouter!');
      }
    }
    if (axios.isAxiosError(error)) {
      console.error('[AI] Статус ответа:', error.response?.status);
      console.error('[AI] Данные ответа:', JSON.stringify(error.response?.data, null, 2));
    }
    
    // Fallback: возвращаем базовую структуру из исходного текста
    console.log('[AI] 🔄 Использование fallback - возвращаем исходный текст без изменений');
    return {
      title: text.substring(0, 50),
      shortDescription: text.substring(0, 200),
      fullDescription: text,
    };
  }
}

