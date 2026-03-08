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

      // Если не удалось распарсить JSON, пытаемся извлечь JSON из текста
      console.warn('[AI] ⚠️ Не удалось распарсить JSON ответ от AI, пробуем извлечь JSON из текста');

      // Попробуем найти JSON объект внутри текста
      const jsonMatch = content.match(/\{[\s\S]*"title"[\s\S]*"shortDescription"[\s\S]*"fullDescription"[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
          console.log('[AI] ✅ JSON успешно извлечён из текста');
        } catch {
          // Не удалось — используем fallback из исходного текста
          console.warn('[AI] ⚠️ Не удалось извлечь JSON, используем исходный текст как fallback');
          parsed = {
            title: text.substring(0, 50),
            shortDescription: text.substring(0, 200),
            fullDescription: text,
          };
        }
      } else {
        // Нет JSON — очищаем ответ от JSON-подобных артефактов и используем как текст
        console.warn('[AI] ⚠️ JSON не найден в ответе, используем исходный текст как fallback');
        parsed = {
          title: text.substring(0, 50),
          shortDescription: text.substring(0, 200),
          fullDescription: text,
        };
      }

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

 * Транскрибирует аудио в текст через OpenRouter (Gemini Flash с поддержкой аудио)

 */

export async function transcribeAudioWithAI(

  audioBuffer: Buffer,

  format: string = 'ogg'

): Promise<string> {

  console.log('[AI] 🎤 Начало транскрибации аудио через OpenRouter (Gemini Flash)');

  console.log(`[AI] 📊 Размер аудио: ${audioBuffer.length} байт, формат: ${format}`);



  const apiKey = process.env.OPENROUTER_API_KEY;



  if (!apiKey || apiKey.trim().length === 0) {

    console.error('[AI] ⚠️ OPENROUTER_API_KEY не установлен или пустой');

    throw new Error('OPENROUTER_API_KEY не установлен');

  }



  try {

    const base64Audio = audioBuffer.toString('base64');

    const mimeType = format === 'ogg' ? 'audio/ogg' : `audio/${format}`;



    console.log('[AI] 📤 Отправка аудио на OpenRouter (Gemini Flash)...');



    const response = await axios.post<OpenRouterResponse>(

      OPENROUTER_API_URL,

      {

        model: 'google/gemini-2.5-flash',

        messages: [

          {

            role: 'user',

            content: [

              {

                type: 'text',

                text: 'Распознай речь из этого аудио. Верни ТОЛЬКО распознанный текст, без комментариев, пояснений или форматирования.'

              },

              {

                type: 'input_audio',

                input_audio: {

                  data: base64Audio,

                  format: format

                }

              }

            ]

          }

        ],

        temperature: 0.1,

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



    const transcription = response.data?.choices?.[0]?.message?.content;



    if (!transcription || transcription.trim().length === 0) {

      console.error('[AI] ⚠️ Пустой ответ от API');

      throw new Error('Пустой ответ от OpenRouter');

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
 * Данные контакта для AI-исследования
 */
interface ContactResearchInput {
  full_name: string;
  city?: string | null;
  institution?: string | null;
  speciality?: string | null;
  phone?: string | null;
  email?: string | null;
}

/**
 * Проводит AI due diligence по контакту: ищет информацию в открытых источниках
 * Использует Perplexity Sonar Pro через OpenRouter для веб-поиска
 */
export async function researchContactWithAI(contact: ContactResearchInput): Promise<string> {
  console.log(`[AI] 🔍 Начало исследования контакта: ${contact.full_name}`);

  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('OPENROUTER_API_KEY не настроен. Обратитесь к администратору.');
  }

  const contactInfo = [
    `ФИО: ${contact.full_name}`,
    contact.city ? `Город: ${contact.city}` : null,
    contact.institution ? `Клиника/учреждение: ${contact.institution}` : null,
    contact.speciality ? `Специальность: ${contact.speciality}` : null,
    contact.phone ? `Телефон: ${contact.phone}` : null,
    contact.email ? `Email: ${contact.email}` : null,
  ].filter(Boolean).join('\n');

  const isNameComplete = contact.full_name.trim().split(/\s+/).length >= 3;

  const systemPrompt = `Ты — аналитик, проводящий due diligence по медицинскому специалисту.
Твоя задача — найти и суммаризировать информацию из открытых интернет-источников.

ВАЖНО:
- Используй ТОЛЬКО проверенные факты из открытых источников
- Если информация не найдена — пропусти этот пункт, не пиши "не найдено"
- Язык ответа: русский
- СТРОГО ЗАПРЕЩЕНО: ссылки-сноски в квадратных скобках вида [1], [2], [источник] — не используй их нигде
- СТРОГО ЗАПРЕЩЕНО: список источников / references в конце ответа
- НЕ упоминай контактные данные (email, телефон), которые уже указаны в карточке контакта — они нам известны. Если нашёл НОВЫЕ email или телефоны, которых нет в карточке — укажи их в отдельном разделе "📞 Новые контактные данные"${!isNameComplete ? '\n- Если в карточке указано неполное имя (только фамилия, или фамилия + имя без отчества), и ты нашёл полное ФИО — укажи его в начале раздела с квалификацией: «Полное имя: Фамилия Имя Отчество»' : ''}
- Используй эмодзи для визуального разделения разделов
- Формат: короткие абзацы с эмодзи-заголовком, без markdown ## заголовков`;

  const userPrompt = `Проведи исследование по следующему медицинскому специалисту:

${contactInfo}

Контактные данные, которые нам уже известны (НЕ упоминай их в ответе):
${[contact.phone ? `- Телефон: ${contact.phone}` : null, contact.email ? `- Email: ${contact.email}` : null].filter(Boolean).join('\n') || '- (контактных данных нет)'}

Найди и суммаризируй (только те пункты, по которым есть информация):
1. Квалификация: учёная степень, врачебная категория, стаж работы${!isNameComplete ? '. Если имя в карточке неполное и ты нашёл полное ФИО — укажи его здесь: «Полное имя: Фамилия Имя Отчество»' : ''}
2. Места работы (врачи часто работают в нескольких клиниках)
3. Отзывы пациентов (prodoctorov.ru, napopravku.ru, zoon.ru и другие)
4. Публикации, конференции, научная деятельность
5. Профили в соцсетях/профессиональных сообществах
6. Новые контактные данные (email, телефоны), которых НЕТ в списке известных выше — если нашёл

Формат примера (используй похожую структуру с эмодзи):
🩺 ${!isNameComplete ? 'Полное имя: Иванов Иван Иванович. ' : ''}Хирург-онколог, высшая категория, стаж 15 лет. Кандидат медицинских наук.

🏥 Работает в ГКБ №1 и частной клинике «МедСити». Специализируется на онкологии молочной железы.

⭐ Рейтинг 4.8 на ПроДокторов (120+ отзывов). Пациенты отмечают внимательность и профессионализм.

Объём: 80-150 слов. БЕЗ сносок, БЕЗ ссылок в скобках, БЕЗ списка источников.`;

  // Модели в порядке приоритета: Sonar Pro (веб-поиск) → Sonar (дешевле) → GPT-4o-mini (fallback без поиска)
  const models = ['perplexity/sonar-pro', 'perplexity/sonar', 'openai/gpt-4o-mini'];

  for (const model of models) {
    try {
      console.log(`[AI] 📤 Отправка запроса к ${model}...`);
      const response = await axios.post<OpenRouterResponse>(
        OPENROUTER_API_URL,
        {
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 1500,
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
            'X-Title': 'FB.net Contact Research',
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      );

      const content = response.data.choices[0]?.message?.content;

      if (!content || content.trim().length === 0) {
        console.warn(`[AI] ⚠️ Пустой ответ от ${model}, пробуем следующую модель...`);
        continue;
      }

      console.log(`[AI] ✅ Исследование завершено через ${model} (${content.length} символов)`);
      // Удаляем сноски вида [1], [2], [1,2], [источник] и блок "Источники:" / "References:" в конце
      let result = content.trim()
        .replace(/\[\d+(?:[,\s]\d+)*\]/g, '')          // [1], [1,2], [1, 2]
        .replace(/\[[^\]]{1,60}\]/g, '')                 // [источник], [prodoctorov.ru]
        .replace(/\n{1,2}(Источники|References|Ссылки|Sources):[\s\S]*$/i, '')  // блок источников в конце
        .replace(/\*\*([^*]+)\*\*/g, '$1')              // **жирный** → обычный текст
        .replace(/ {2,}/g, ' ')                          // двойные пробелы после удаления сносок
        .trim();
      if (model !== models[0]) {
        const modelLabel = model === 'perplexity/sonar' ? 'Perplexity Sonar (упрощённая)' : 'GPT-4o-mini (без веб-поиска)';
        result += `\n\n⚠️ Использована запасная модель: ${modelLabel}. Результат может быть менее полным.`;
      }
      return result;
    } catch (error) {
      console.error(`[AI] ⚠️ Ошибка с моделью ${model}:`, error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Неверный API ключ OpenRouter. Проверьте OPENROUTER_API_KEY');
        }
        // 402 (недостаточно средств), 429 (лимит), 5xx — пробуем следующую модель
        if (error.response?.status === 402 || error.response?.status === 429 || (error.response?.status ?? 0) >= 500) {
          console.warn(`[AI] ⚠️ ${model} недоступна (${error.response?.status}), пробуем следующую...`);
          continue;
        }
      }

      // Для последней модели в списке — бросаем ошибку
      if (model === models[models.length - 1]) {
        throw new Error('Не удалось провести исследование. Попробуйте позже');
      }
    }
  }

  throw new Error('Все модели AI недоступны. Попробуйте позже');
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

