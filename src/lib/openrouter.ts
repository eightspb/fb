/**
 * Интеграция с OpenRouter API для расширения текста через ChatGPT
 */

import axios from 'axios';
import FormData from 'form-data';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_AUDIO_URL = 'https://openrouter.ai/api/v1/audio/transcriptions';
const OPENROUTER_MODEL = 'openai/gpt-4o-mini'; // Можно изменить на openai/gpt-4 или openai/gpt-3.5-turbo
const WHISPER_MODEL = 'openai/whisper-large-v3';

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
    voiceTranscriptions?: string[];
    isFromVoice?: boolean;
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
  
  // Добавляем информацию об источнике текста
  if (context?.isFromVoice || (context?.voiceTranscriptions && context.voiceTranscriptions.length > 0)) {
    contextInfo.push('Источник: голосовое сообщение (может содержать разговорную речь)');
  }
  
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

КРИТИЧЕСКИ ВАЖНО: 
- Ты ДОЛЖЕН создать ТРИ отдельных поля с РАЗНЫМ содержанием
- Каждое поле должно быть уникальным и не дублировать другие
- Заголовок - самый краткий (5-10 слов)
- Краткое описание - средняя детализация (1-2 предложения, до 200 символов)
- Полное описание - максимально подробное (3-5 абзацев, минимум 300 слов)

Формат ответа должен быть строго в JSON:
{
  "title": "Заголовок новости (краткий, информативный, 5-10 слов)",
  "shortDescription": "Краткое описание (1-2 предложения, до 200 символов, суть события)",
  "fullDescription": "Полное описание события (3-5 абзацев, минимум 300 слов, подробное и информативное с контекстом и деталями)"
}

Требования к генерации:
- ЗАГОЛОВОК: Краткий, цепляющий, информативный (например: "Мастер-класс по вакуумной биопсии молочной железы")
- КРАТКОЕ ОПИСАНИЕ: Суть события в 1-2 предложениях, основные факты
- ПОЛНОЕ ОПИСАНИЕ: Развернутый текст минимум в 3-5 раз длиннее исходного с:
  * Контекстом о медицинской тематике
  * Важностью события для медицинского сообщества
  * Деталями о результатах или целях мероприятия
  * Профессиональным медицинским стилем
  * Всеми важными деталями из исходного текста
- Если текст из голосового сообщения - приведи его к литературному стилю
- Сохрани все факты и детали из исходного текста`;

  const userPrompt = `Исходный текст события:
"${text}"

${contextInfo.length > 0 ? `Дополнительная информация:\n${contextInfo.join('\n')}\n` : ''}
ВАЖНО: 
1. Создай THREE РАЗНЫХ текста (title ≠ shortDescription ≠ fullDescription)
2. Полное описание должно быть минимум в 3-5 раз длиннее исходного текста
3. Не дублируй содержимое между полями
4. Если речь об обучении - упомяни методики вакуумно-аспирационной биопсии
5. Клиника занимается маммологией, все новости связаны с молочной железой
6. Преобразуй разговорную речь в профессиональный текст`;

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
          'X-Title': 'Zenit News Bot',
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
    } catch {
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

/**
 * Транскрибирует аудио в текст с помощью Whisper API
 */
export async function transcribeAudioWithAI(
  audioBuffer: Buffer,
  format: string = 'ogg'
): Promise<string> {
  console.log('[AI] 🎤 Начало транскрибации аудио через Whisper API');
  console.log(`[AI] 📊 Размер аудио: ${audioBuffer.length} байт, формат: ${format}`);
  
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey || apiKey.trim().length === 0) {
    console.error('[AI] ⚠️ OPENROUTER_API_KEY не установлен или пустой');
    throw new Error('OPENROUTER_API_KEY не установлен');
  }

  try {
    // Создаем FormData для multipart/form-data запроса
    const formData = new FormData();
    
    // Добавляем аудио файл как blob с правильным именем файла
    const filename = `voice.${format}`;
    formData.append('file', audioBuffer, {
      filename: filename,
      contentType: `audio/${format}`,
    });
    
    // Добавляем модель
    formData.append('model', WHISPER_MODEL);
    
    // Указываем язык (русский) для лучшей точности
    formData.append('language', 'ru');

    console.log('[AI] 📤 Отправка аудио на Whisper API...');
    
    const response = await axios.post(
      OPENROUTER_AUDIO_URL,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
          'X-Title': 'Zenit News Bot',
          ...formData.getHeaders(),
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    const transcription = response.data?.text;
    
    if (!transcription) {
      console.error('[AI] ⚠️ Пустой ответ от Whisper API');
      throw new Error('Пустой ответ от Whisper API');
    }

    console.log(`[AI] ✅ Транскрибация завершена: "${transcription.substring(0, 100)}..."`);
    return transcription.trim();
    
  } catch (error) {
    console.error('[AI] ❌ Ошибка при транскрибации аудио:', error);
    if (error instanceof Error) {
      console.error('[AI] Сообщение об ошибке:', error.message);
    }
    if (axios.isAxiosError(error)) {
      console.error('[AI] Статус ответа:', error.response?.status);
      console.error('[AI] Данные ответа:', JSON.stringify(error.response?.data, null, 2));
    }
    throw error;
  }
}

/**
 * Улучшает текст описания новости с помощью AI
 */
export async function improveDescriptionWithAI(text: string): Promise<string> {
  console.log('[AI] 🤖 Начало улучшения описания через OpenRouter');
  
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey || apiKey.trim().length === 0) {
    console.warn('[AI] ⚠️ OPENROUTER_API_KEY не установлен или пустой');
    throw new Error('OPENROUTER_API_KEY не настроен. Обратитесь к администратору.');
  }

  const systemPrompt = `Ты профессиональный редактор и копирайтер медицинского портала.
Твоя задача - улучшить, отредактировать и обогатить текст новости.
Сделай текст более читаемым, профессиональным и структурированным.
Исправь грамматические и стилистические ошибки.
Сохрани смысл и факты, но изложи их более качественным языком.
Не добавляй выдуманных фактов.
Ответ должен содержать ТОЛЬКО улучшенный текст, без вступительных слов и комментариев.`;

  const userPrompt = `Улучши следующий текст новости:
"${text}"`;

  try {
    console.log('[AI] 📤 Отправка запроса на улучшение текста...');
    const response = await axios.post<OpenRouterResponse>(
      OPENROUTER_API_URL,
      {
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
          'X-Title': 'Zenit News Bot',
          'Content-Type': 'application/json',
        },
      }
    );

    const content = response.data.choices[0]?.message?.content;
    
    if (!content) {
      console.error('[AI] ⚠️ Пустой ответ от OpenRouter');
      throw new Error('Пустой ответ от AI сервиса');
    }

    console.log('[AI] ✅ Текст успешно улучшен');
    return content.trim();
  } catch (error) {
    console.error('[AI] ❌ Ошибка при улучшении текста:', error);
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new Error('Неверный API ключ OpenRouter. Проверьте OPENROUTER_API_KEY');
      }
      if (error.response?.status === 429) {
        throw new Error('Превышен лимит запросов к AI сервису. Попробуйте позже');
      }
      if ((error.response?.status ?? 0) >= 500) {
        throw new Error('AI сервис временно недоступен. Попробуйте позже');
      }
    }
    throw new Error('Не удалось улучшить текст. Попробуйте позже');
  }
}
