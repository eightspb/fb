# Задача: Сохранённые запросы ("Избранное") в AI Ассистенте

## Цель
Пользователь может сохранить любой вопрос в "Избранное" и быстро повторно его запустить. Хранить в localStorage, без новых API.

---

## Структура данных

```typescript
interface SavedQuery {
  id: string;           // crypto.randomUUID()
  text: string;         // полный текст вопроса
  label: string;        // пользовательское название (по умолчанию: первые 50 символов)
  createdAt: string;    // ISO
  usageCount: number;   // сколько раз запускали
  lastUsedAt: string;   // ISO
}

// localStorage key: 'ai-assistant-saved-queries'
// Тип: SavedQuery[]
// Максимум: 20 запросов
```

---

## Что изменить: только `apps/admin/src/app/ai-assistant/page.tsx`

### 1. Хранилище (внутри компонента или отдельный хук)

```typescript
function useSavedQueries() {
  const KEY = 'ai-assistant-saved-queries';
  const [queries, setQueries] = useState<SavedQuery[]>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch { return []; }
  });

  function save(text: string) {
    const existing = queries.find(q => q.text === text);
    if (existing) { /* уже сохранён */ return; }
    const newQuery: SavedQuery = {
      id: crypto.randomUUID(), text,
      label: text.slice(0, 50),
      createdAt: new Date().toISOString(),
      usageCount: 0, lastUsedAt: new Date().toISOString(),
    };
    const updated = [newQuery, ...queries].slice(0, 20);
    setQueries(updated);
    localStorage.setItem(KEY, JSON.stringify(updated));
  }

  function remove(id: string) { ... }

  function recordUsage(id: string) {
    const updated = queries.map(q =>
      q.id === id
        ? { ...q, usageCount: q.usageCount + 1, lastUsedAt: new Date().toISOString() }
        : q
    );
    setQueries(updated);
    localStorage.setItem(KEY, JSON.stringify(updated));
  }

  const isSaved = (text: string) => queries.some(q => q.text === text);

  return { queries, save, remove, recordUsage, isSaved };
}
```

### 2. Кнопка "Сохранить" у сообщений пользователя

В `MessageBubble` — для сообщений с `role === 'user'`:

```typescript
const { save, isSaved, remove } = useSavedQueries(); // передать через props

// Под bubble пользователя (появляется при hover):
<button
  onClick={() => isSaved(message.content) ? remove(...) : save(message.content)}
  title={isSaved(message.content) ? 'Убрать из избранного' : 'Сохранить запрос'}
  style={{ opacity: 0, /* видна при hover на родителе */ }}
>
  <Star size={13} fill={isSaved(message.content) ? 'gold' : 'none'} />
</button>
```

### 3. Дропдаун "Избранное" в хедере

```typescript
// В хедере чата — кнопка со счётчиком:
<button onClick={() => setShowSaved(prev => !prev)}>
  <Star size={16} />
  {queries.length > 0 && <span>{queries.length}</span>}
</button>

// Дропдаун (position: absolute, right: 0, top: 100%):
{showSaved && (
  <div style={{
    position: 'absolute', top: '100%', right: 0, zIndex: 50,
    background: 'white', border: '1px solid var(--frox-gray-200)',
    borderRadius: 12, width: 320, boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
    maxHeight: 400, overflowY: 'auto',
  }}>
    <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--frox-gray-100)', fontSize: '0.8em', color: 'var(--frox-gray-500)' }}>
      Сохранённые запросы
    </div>
    {queries.length === 0 && (
      <p style={{ padding: '16px 14px', color: 'var(--frox-gray-400)', fontSize: '0.875em' }}>
        Нет сохранённых запросов
      </p>
    )}
    {queries.map(q => (
      <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px' }}>
        <button
          onClick={() => { sendMessage(q.text); recordUsage(q.id); setShowSaved(false); }}
          style={{ flex: 1, textAlign: 'left', fontSize: '0.875em', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {q.label}
        </button>
        <span style={{ fontSize: '0.75em', color: 'var(--frox-gray-400)' }}>{q.usageCount}×</span>
        <button onClick={() => remove(q.id)}>
          <X size={12} />
        </button>
      </div>
    ))}
  </div>
)}
```

### 4. Сортировка в дропдауне

По умолчанию — по `lastUsedAt` desc (часто используемые наверху). Кнопка переключения: "По дате" / "По частоте".

---

## Паттерны проекта

- Всё в client component, только localStorage
- Иконки: `Star`, `X` из `lucide-react`
- Закрывать дропдаун при клике вне (`useEffect` с `document.addEventListener('click', ...)`)
- Стили: `var(--frox-gray-*)`, без внешних библиотек

## НЕ делать
- Не создавать API endpoints
- Не сохранять в БД
- Не добавлять drag-and-drop для сортировки
- Не делать редактирование label (пусть label = первые 50 символов)
