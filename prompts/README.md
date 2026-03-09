# Prompts — планы задач для AI-агентов

Каждый файл — детальное задание, готовое к передаче AI-агенту.

---

## AI Ассистент: расширения

| Файл | Фича | Сложность |
|------|------|-----------|
| [ai-assistant-features/01-streaming.md](ai-assistant-features/01-streaming.md) | Streaming ответов (SSE) | Средняя |
| [ai-assistant-features/02-chat-history.md](ai-assistant-features/02-chat-history.md) | История чатов (localStorage) | Низкая |
| [ai-assistant-features/03-export-csv.md](ai-assistant-features/03-export-csv.md) | Экспорт результатов в CSV | Низкая |
| [ai-assistant-features/04-daily-analytics.md](ai-assistant-features/04-daily-analytics.md) | Дайджест аналитики за период | Средняя |
| [ai-assistant-features/05-saved-queries.md](ai-assistant-features/05-saved-queries.md) | Сохранённые запросы | Низкая |
| [ai-assistant-features/06-charts.md](ai-assistant-features/06-charts.md) | Графики (SVG, без библиотек) | Средняя |
| [ai-assistant-features/07-vector-search.md](ai-assistant-features/07-vector-search.md) | Векторный поиск (pgvector) | Высокая |

## Батчевые операции

| Файл | Фича | Сложность |
|------|------|-----------|
| [batch-research/batch-research-plan.md](batch-research/batch-research-plan.md) | Пакетное AI-исследование контактов | Высокая |

---

## Рекомендуемая очерёдность

1. `03-export-csv.md` — 30 минут, чистая польза
2. `05-saved-queries.md` — 1 час, без backend
3. `02-chat-history.md` — 2 часа, без backend
4. `batch-research-plan.md` — главная фича, 1-2 дня
5. `04-daily-analytics.md` — 3-4 часа
6. `01-streaming.md` — 4-6 часов, требует переработки UI
7. `06-charts.md` — 3-4 часа
8. `07-vector-search.md` — требует pgvector, отдельный этап
