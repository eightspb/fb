# Задача: История чатов AI Ассистента

## Цель
Сохранять сессии разговоров, чтобы пользователь мог вернуться к прошлым запросам. Хранить в localStorage (без новой таблицы БД — для скорости и простоты).

---

## Структура данных (localStorage)

```typescript
interface ChatSession {
  id: string;           // uuid (crypto.randomUUID())
  title: string;        // первые 60 символов первого вопроса
  createdAt: string;    // ISO
  updatedAt: string;    // ISO
  messages: ChatMessage[];
}

// localStorage key: 'ai-assistant-sessions'
// Тип: ChatSession[] (массив, свежие сверху)
// Максимум: 50 сессий (старые удалять)
// Максимум на сессию: 50 сообщений
```

---

## Что создать

### 1. Хук `apps/admin/src/app/ai-assistant/useChatHistory.ts`

```typescript
export function useChatHistory() {
  const STORAGE_KEY = 'ai-assistant-sessions';
  const MAX_SESSIONS = 50;

  function getSessions(): ChatSession[] { ... }

  function saveSession(session: ChatSession): void {
    const sessions = getSessions();
    const idx = sessions.findIndex(s => s.id === session.id);
    if (idx >= 0) sessions[idx] = session;
    else sessions.unshift(session);
    // Trim to MAX_SESSIONS
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
  }

  function deleteSession(id: string): void { ... }

  function clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  return { getSessions, saveSession, deleteSession, clearAll };
}
```

### 2. Боковая панель истории в `apps/admin/src/app/ai-assistant/page.tsx`

**Лейаут страницы — изменить на двухколоночный:**

```
┌─────────────────┬────────────────────────────────────┐
│  История чатов  │           Активный чат              │
│                 │                                     │
│  [+ Новый чат]  │  ┌── хедер ──────────────────────┐ │
│  ─────────────  │  │ AI Ассистент    [Новый чат]   │ │
│  Сегодня        │  └───────────────────────────────┘ │
│  > Контакты ... │                                     │
│  > Сколько всег │        сообщения                    │
│  ─────────────  │                                     │
│  Вчера          │        ввод                         │
│  > Топ городов  │                                     │
└─────────────────┴────────────────────────────────────┘
```

**Ширина боковой панели:** 240px, фиксированная, с `overflow-y: auto`.

**Группировка по дате:** "Сегодня", "Вчера", "На этой неделе", "Ранее". Использовать `date-fns` если уже есть в проекте, иначе написать простую функцию группировки вручную.

**Элемент сессии:**
```typescript
<button
  onClick={() => loadSession(session.id)}
  style={{
    // активная сессия: bg-[var(--frox-gray-100)]
    // остальные: transparent, hover: bg-[var(--frox-gray-50)]
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', padding: '8px 12px', borderRadius: 8,
    textAlign: 'left',
  }}
>
  <span style={{ fontSize: '0.85em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
    {session.title}
  </span>
  {/* Кнопка удаления — появляется при hover */}
  <Trash2 size={12} onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }} />
</button>
```

### 3. Автосохранение в `page.tsx`

```typescript
// При каждом изменении messages — сохранять сессию
useEffect(() => {
  if (messages.length === 0) return;
  const session: ChatSession = {
    id: currentSessionId,
    title: messages[0].content.slice(0, 60),
    createdAt: sessionCreatedAt,
    updatedAt: new Date().toISOString(),
    messages,
  };
  saveSession(session);
}, [messages]);

// При "Новый чат":
function startNewChat() {
  setCurrentSessionId(crypto.randomUUID());
  setSessionCreatedAt(new Date().toISOString());
  setMessages([]);
}
```

### 4. Поиск по истории (опционально, бонус)

Поле поиска вверху боковой панели (фильтрует по `session.title` и `messages[*].content`).

---

## Паттерны проекта

- `'use client'` — всё в клиентских компонентах
- Не добавлять новых API endpoints для этой фичи
- Не использовать `date-fns` если нет в `package.json` — написать вручную
- Стили: `var(--frox-gray-*)` переменные, `rounded-2xl`
- На мобильных (ширина < 768px) — боковую панель скрывать, добавить кнопку "История" в хедер

## НЕ делать
- Не сохранять в БД (только localStorage)
- Не добавлять серверный стейт для истории
- Не устанавливать новые npm-пакеты
