# Задача: Режим "Аналитика дня" в AI Ассистенте

## Цель
Кнопка в хедере чата — одним кликом генерирует автоматический дайджест за текущий день/неделю без ввода вопроса. AI сам выполняет набор SQL-запросов и формирует структурированный отчёт.

---

## Что создать

### 1. API endpoint: `src/app/api/admin/ai-assistant/digest/route.ts`

```typescript
// POST /api/admin/ai-assistant/digest
// Body: { period: 'today' | 'week' | 'month' }
// Response: { reply: string, sections: DigestSection[] }
```

**Логика — выполнить набор SQL-запросов и передать всё в AI для интерпретации:**

```typescript
const DIGEST_QUERIES = {
  today: [
    {
      label: 'Новые контакты сегодня',
      sql: `SELECT COUNT(*) as count FROM contacts WHERE created_at >= CURRENT_DATE`,
    },
    {
      label: 'Новые заявки сегодня',
      sql: `SELECT COUNT(*) as count, form_type FROM form_submissions
            WHERE created_at >= CURRENT_DATE GROUP BY form_type`,
    },
    {
      label: 'Посещения сегодня',
      sql: `SELECT COUNT(DISTINCT session_id) as sessions,
                   COUNT(*) as pageviews
            FROM page_visits WHERE visited_at >= CURRENT_DATE`,
    },
    {
      label: 'Топ страниц сегодня',
      sql: `SELECT page_path, COUNT(*) as views
            FROM page_visits WHERE visited_at >= CURRENT_DATE
            GROUP BY page_path ORDER BY views DESC LIMIT 5`,
    },
    {
      label: 'Источники трафика сегодня',
      sql: `SELECT utm_source, COUNT(DISTINCT session_id) as sessions
            FROM page_visits
            WHERE visited_at >= CURRENT_DATE AND utm_source IS NOT NULL
            GROUP BY utm_source ORDER BY sessions DESC LIMIT 5`,
    },
  ],
  week: [
    // Те же запросы но за 7 дней + тренд vs прошлая неделя
    {
      label: 'Контакты за 7 дней',
      sql: `SELECT COUNT(*) as this_week,
              (SELECT COUNT(*) FROM contacts
               WHERE created_at >= NOW() - INTERVAL '14 days'
                 AND created_at < NOW() - INTERVAL '7 days') as last_week
            FROM contacts WHERE created_at >= NOW() - INTERVAL '7 days'`,
    },
    // ... другие запросы за неделю
  ],
};
```

**Выполнить все запросы параллельно:**
```typescript
const results = await Promise.all(
  DIGEST_QUERIES[period].map(async ({ label, sql }) => {
    const { rows } = await pool.query(sql);
    return { label, rows };
  })
);
```

**Передать в AI:**
```typescript
const dataBlock = results
  .map(r => `### ${r.label}\n${JSON.stringify(r.rows, null, 2)}`)
  .join('\n\n');

const prompt = `Сформируй краткий ежедневный дайджест на основе следующих данных CRM.
Период: ${period === 'today' ? 'сегодня' : period === 'week' ? 'последние 7 дней' : 'последний месяц'}.

${dataBlock}

Формат ответа:
- Начни с краткого резюме (2-3 предложения)
- По каждому разделу: ключевые цифры + краткий вывод
- Выдели необычные или важные тренды
- Заверши рекомендациями (1-3 пункта)
- Используй emoji для разделов
- Отвечай на русском языке`;
```

### 2. Кнопка в хедере `apps/admin/src/app/ai-assistant/page.tsx`

```typescript
// Добавить в хедер рядом с "Новый чат":
<div style={{ display: 'flex', gap: 8 }}>
  <button onClick={() => runDigest('today')} disabled={loading}>
    <BarChart2 size={14} /> Дайджест за сегодня
  </button>
  <select onChange={e => runDigest(e.target.value as Period)}>
    <option value="today">Сегодня</option>
    <option value="week">За неделю</option>
    <option value="month">За месяц</option>
  </select>
</div>
```

```typescript
async function runDigest(period: 'today' | 'week' | 'month') {
  if (loading) return;
  setMessages([]); // начать новый чат
  setLoading(true);

  // Добавить псевдо-сообщение пользователя
  const periodLabel = { today: 'сегодня', week: 'за неделю', month: 'за месяц' }[period];
  setMessages([{ role: 'user', content: `📊 Аналитический дайджест ${periodLabel}` }]);

  const response = await adminCsrfFetch('/api/admin/ai-assistant/digest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ period }),
  });
  const data = await response.json();

  setMessages(prev => [...prev, {
    role: 'assistant',
    content: data.reply,
  }]);
  setLoading(false);
}
```

### 3. Карточка-пример в приветственном экране

Добавить 7-й вариант в `EXAMPLE_PROMPTS`:
```typescript
{ label: '📊 Дайджест за сегодня', action: 'digest:today' },
```

Обработать `action: 'digest:*'` отдельно от обычных текстовых запросов.

---

## Паттерны проекта

- `export const runtime = 'nodejs'`
- `verifyAdminSession()` — как в других endpoints
- `new Pool({ connectionString: process.env.DATABASE_URL || '...' })`
- CSRF через `adminCsrfFetch`
- Иконки: `BarChart2`, `TrendingUp` из `lucide-react`

## НЕ делать
- Не делать крон-задачу или автоматическую отправку
- Не сохранять дайджест в БД
- Не добавлять новые npm-пакеты
- Не делать streaming для этого endpoint (ответ быстрый — все SQL параллельно)
