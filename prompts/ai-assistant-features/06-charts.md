# Задача: Графики и визуализация в AI Ассистенте

## Цель
Когда AI возвращает агрегированные данные (топ городов, статистика тегов, динамика по времени) — рендерить простой bar chart прямо в чате. Без внешних библиотек, только SVG/CSS.

---

## Механизм обнаружения данных для графика

### Вариант A: AI сам сигнализирует (предпочтительный)
Добавить в system prompt правило:
```
11. Если результат представляет рейтинг или распределение (топ городов, статистика тегов,
    динамика по дням) — после Markdown-ответа добавь JSON-блок:
    ```chart
    {"type": "bar", "title": "...", "labels": [...], "values": [...]}
    ```
```

Поддерживаемые типы:
```typescript
type ChartType = 'bar' | 'horizontal-bar' | 'line';

interface ChartData {
  type: ChartType;
  title: string;
  labels: string[];  // подписи
  values: number[];  // числа
  unit?: string;     // "контактов", "заявок", "посещений"
}
```

### Вариант B: Автодетект на клиенте (fallback)
Если `sqlResult` — массив объектов с одним числовым и одним строковым полем → автоматически рендерить bar chart.

```typescript
function detectChartable(rows: Record<string, unknown>[]): ChartData | null {
  if (!rows || rows.length < 2 || rows.length > 30) return null;
  const keys = Object.keys(rows[0]);
  if (keys.length !== 2) return null;
  const [labelKey, valueKey] = keys;
  if (typeof rows[0][valueKey] !== 'number') return null;
  return {
    type: 'horizontal-bar',
    title: '',
    labels: rows.map(r => String(r[labelKey])),
    values: rows.map(r => Number(r[valueKey])),
  };
}
```

---

## Что создать

### 1. Компонент `apps/admin/src/app/ai-assistant/MiniChart.tsx`

```typescript
'use client';

interface MiniChartProps {
  data: ChartData;
}

export function MiniChart({ data }: MiniChartProps) {
  const max = Math.max(...data.values);

  if (data.type === 'horizontal-bar') {
    return (
      <div style={{ margin: '8px 0', fontFamily: 'inherit' }}>
        {data.title && (
          <p style={{ fontSize: '0.8em', fontWeight: 600, color: 'var(--frox-gray-600)', marginBottom: 6 }}>
            {data.title}
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {data.labels.map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82em' }}>
              <span style={{
                width: 100, flexShrink: 0, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                color: 'var(--frox-gray-700)', textAlign: 'right',
              }}>{label}</span>
              <div style={{ flex: 1, background: 'var(--frox-gray-100)', borderRadius: 4, height: 18 }}>
                <div style={{
                  width: `${(data.values[i] / max) * 100}%`,
                  background: 'var(--frox-blue)',
                  height: '100%', borderRadius: 4,
                  minWidth: 4,
                  transition: 'width 0.4s ease',
                }} />
              </div>
              <span style={{ width: 40, flexShrink: 0, color: 'var(--frox-gray-500)', fontSize: '0.95em' }}>
                {data.values[i]}{data.unit ? ` ${data.unit}` : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.type === 'bar') {
    // Вертикальные столбцы через SVG
    const BAR_W = 32, GAP = 8, HEIGHT = 100;
    const totalWidth = data.labels.length * (BAR_W + GAP);
    return (
      <div style={{ margin: '8px 0' }}>
        {data.title && <p style={{ fontSize: '0.8em', fontWeight: 600, marginBottom: 4 }}>{data.title}</p>}
        <svg width={totalWidth} height={HEIGHT + 30} style={{ overflow: 'visible' }}>
          {data.values.map((val, i) => {
            const barH = (val / max) * HEIGHT;
            const x = i * (BAR_W + GAP);
            return (
              <g key={i}>
                <rect
                  x={x} y={HEIGHT - barH}
                  width={BAR_W} height={barH}
                  rx={4} fill="var(--frox-blue)" opacity={0.85}
                />
                <text x={x + BAR_W / 2} y={HEIGHT - barH - 4}
                  textAnchor="middle" fontSize={10} fill="var(--frox-gray-600)">
                  {val}
                </text>
                <text x={x + BAR_W / 2} y={HEIGHT + 14}
                  textAnchor="middle" fontSize={9} fill="var(--frox-gray-500)">
                  {data.labels[i].slice(0, 8)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  return null;
}
```

### 2. Парсинг `chart`-блока в `page.tsx`

```typescript
function extractChart(text: string): { text: string; chart: ChartData | null } {
  const match = text.match(/```chart\s*([\s\S]*?)\s*```/);
  if (!match) return { text, chart: null };
  try {
    const chart = JSON.parse(match[1]) as ChartData;
    return { text: text.replace(match[0], '').trim(), chart };
  } catch {
    return { text, chart: null };
  }
}
```

### 3. Рендер в `MessageBubble`

```typescript
const { text: cleanContent, chart } = extractChart(message.content);

// Рендер:
<div dangerouslySetInnerHTML={{ __html: renderMarkdown(cleanContent) }} />
{chart && <MiniChart data={chart} />}
{/* fallback — автодетект из sqlResult */}
{!chart && message.sqlResult && (
  (() => {
    const auto = detectChartable(message.sqlResult);
    return auto ? <MiniChart data={auto} /> : null;
  })()
)}
```

### 4. Добавить правило в system prompt (`src/app/api/admin/ai-assistant/route.ts`)

```
11. Если результат — рейтинг/топ/распределение (топ городов, теги, динамика) — добавь после ответа:
    ```chart
    {"type":"horizontal-bar","title":"Название","labels":["A","B"],"values":[100,50]}
    ```
    type: "bar" для временных рядов, "horizontal-bar" для рейтингов
```

---

## Паттерны проекта

- Только SVG и CSS, без `recharts`, `chart.js`, `d3`
- Компонент в той же директории что и `page.tsx`
- `'use client'` не нужен если нет hooks (чистый рендер)
- Цвета: `var(--frox-blue)` для баров, `var(--frox-gray-*)` для текста

## НЕ делать
- Не добавлять chart библиотеки
- Не делать интерактивные tooltips (слишком сложно без библиотек)
- Не делать line charts с кривыми Безье
- Не рендерить более 30 баров (обрезать)
