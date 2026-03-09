# Задача: Батчевое исследование контактов

Реализовать систему пакетного запуска AI-исследований (basic research и deep research) по выбранным контактам. Включает: выбор контактов по фильтру или вручную, запуск параллельной обработки, real-time прогресс через SSE, детальный лог каждого контакта.

---

## Архитектура

```
Пользователь:
  1. Открывает /contacts или /ai-assistant
  2. Фильтрует контакты (город, статус, теги, специальность) ИЛИ отмечает вручную
  3. Выбирает тип: "AI Research" или "Deep Research"
  4. Нажимает "Запустить пакетное исследование"
  5. Видит прогресс в реальном времени: прогресс-бар, лог по каждому контакту

Backend:
  POST /api/admin/contacts/batch-research  → запустить задачу (вернуть jobId)
  GET  /api/admin/contacts/batch-research/[jobId]/stream  → SSE прогресс
  GET  /api/admin/contacts/batch-research/[jobId]  → статус задачи
  DELETE /api/admin/contacts/batch-research/[jobId]  → отменить задачу
```

---

## Что создать

### 1. In-memory хранилище задач: `src/lib/batch-research-store.ts`

```typescript
export type ResearchType = 'basic' | 'deep';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface BatchJob {
  id: string;               // uuid
  type: ResearchType;
  status: JobStatus;
  contactIds: string[];     // все контакты в задаче
  totalCount: number;
  processedCount: number;
  successCount: number;
  errorCount: number;
  cancelledCount: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  results: ContactResult[];
  abortController: AbortController;  // для отмены
}

export interface ContactResult {
  contactId: string;
  fullName: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  noteId?: string;    // созданная заметка
  error?: string;
  stage?: string;     // для deep research: "search" | "verify"
  model?: string;     // использованная модель
}

// Singleton Map — живёт пока работает процесс Node.js
const jobs = new Map<string, BatchJob>();

export function createJob(type: ResearchType, contactIds: string[]): BatchJob { ... }
export function getJob(id: string): BatchJob | undefined { ... }
export function cancelJob(id: string): boolean { ... }

// Очистка старых задач (> 2 часов) при создании новой
function cleanupOldJobs() { ... }
```

**Важно:** Это in-memory решение. При перезапуске сервера задачи теряются — это нормально для MVP.

---

### 2. API: Запуск задачи `src/app/api/admin/contacts/batch-research/route.ts`

```typescript
export const runtime = 'nodejs';

// POST /api/admin/contacts/batch-research
// Body:
// {
//   type: 'basic' | 'deep',
//   contactIds?: string[],          // ручной выбор
//   filter?: {                      // фильтр вместо ручного выбора
//     status?: string,
//     city?: string,
//     tag?: string,
//     speciality?: string,
//     hasNoResearch?: boolean,      // только без заметок типа ai_research
//     hasNoDeepResearch?: boolean,  // только без заметок типа ai_deep_research
//   },
//   concurrency?: number            // 1-5, по умолчанию 3
// }
// Response: { jobId: string, totalCount: number }

export async function POST(request: NextRequest) {
  if (!await verifyAdminSession()) return unauthorized();

  const body = await request.json();
  const { type, contactIds, filter, concurrency = 3 } = body;

  // Получить contactIds из фильтра если не заданы вручную
  let ids: string[] = contactIds || [];
  if (!ids.length && filter) {
    ids = await getContactIdsByFilter(filter);
  }
  if (!ids.length) return NextResponse.json({ error: 'Нет контактов для обработки' }, { status: 400 });

  // Ограничение: не более 500 контактов за раз
  if (ids.length > 500) {
    return NextResponse.json({ error: 'Максимум 500 контактов за один запуск' }, { status: 400 });
  }

  const job = createJob(type, ids);

  // Запустить обработку в фоне (не await!)
  runBatchJob(job, Math.min(Math.max(concurrency, 1), 5)).catch(console.error);

  return NextResponse.json({ jobId: job.id, totalCount: job.totalCount });
}

async function getContactIdsByFilter(filter: BatchFilter): Promise<string[]> {
  const conditions: string[] = ['c.full_name IS NOT NULL', "TRIM(c.full_name) != ''"];
  const params: unknown[] = [];
  let idx = 1;

  if (filter.status) {
    conditions.push(`c.status = $${idx++}`);
    params.push(filter.status);
  }
  if (filter.city) {
    conditions.push(`LOWER(c.city) = LOWER($${idx++})`);
    params.push(filter.city);
  }
  if (filter.tag) {
    conditions.push(`$${idx++} = ANY(c.tags)`);
    params.push(filter.tag);
  }
  if (filter.speciality) {
    conditions.push(`LOWER(c.speciality) ILIKE $${idx++}`);
    params.push(`%${filter.speciality}%`);
  }
  if (filter.hasNoResearch) {
    conditions.push(`NOT EXISTS (
      SELECT 1 FROM contact_notes cn
      WHERE cn.contact_id = c.id AND cn.source = 'ai_research'
    )`);
  }
  if (filter.hasNoDeepResearch) {
    conditions.push(`NOT EXISTS (
      SELECT 1 FROM contact_notes cn
      WHERE cn.contact_id = c.id AND cn.source = 'ai_deep_research'
    )`);
  }

  const sql = `SELECT c.id FROM contacts c WHERE ${conditions.join(' AND ')} ORDER BY c.created_at DESC LIMIT 500`;
  const { rows } = await pool.query(sql, params);
  return rows.map(r => r.id);
}
```

---

### 3. Движок параллельной обработки: `src/lib/batch-research-runner.ts`

```typescript
import { researchContactWithAI, deepResearchContactWithAI } from './openrouter';

export async function runBatchJob(job: BatchJob, concurrency: number) {
  job.status = 'running';
  job.startedAt = new Date();

  // Загрузить данные контактов
  const { rows: contacts } = await pool.query(
    `SELECT id, full_name, city, institution, speciality, phone, email
     FROM contacts WHERE id = ANY($1)`,
    [job.contactIds]
  );

  // Инициализировать results
  job.results = contacts.map(c => ({
    contactId: c.id,
    fullName: c.full_name,
    status: 'pending',
  }));

  // Семафор для ограничения concurrency
  const semaphore = new Semaphore(concurrency);

  const tasks = contacts.map(contact =>
    semaphore.run(async () => {
      if (job.abortController.signal.aborted) {
        updateResult(job, contact.id, { status: 'skipped' });
        job.cancelledCount++;
        return;
      }

      updateResult(job, contact.id, { status: 'running', startedAt: new Date() });
      emitProgress(job);

      const startMs = Date.now();
      try {
        if (job.type === 'basic') {
          await runBasicResearch(job, contact);
        } else {
          await runDeepResearch(job, contact);
        }

        updateResult(job, contact.id, {
          status: 'success',
          completedAt: new Date(),
          durationMs: Date.now() - startMs,
        });
        job.successCount++;
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        updateResult(job, contact.id, {
          status: 'error', error,
          completedAt: new Date(),
          durationMs: Date.now() - startMs,
        });
        job.errorCount++;
      } finally {
        job.processedCount++;
        emitProgress(job);
      }
    })
  );

  await Promise.all(tasks);

  job.status = job.abortController.signal.aborted ? 'cancelled' : 'completed';
  job.completedAt = new Date();
  emitProgress(job);  // финальное событие
}

async function runBasicResearch(job: BatchJob, contact: ContactRow) {
  updateResult(job, contact.id, { stage: 'research' });
  const summary = await withTimeout(
    researchContactWithAI(contact),
    { ms: 90_000, label: 'basic research timeout' }
  );

  // Сохранить в contact_notes
  const title = `AI Research (${formatDate(new Date())})`;
  const { rows } = await pool.query(`
    INSERT INTO contact_notes (id, contact_id, title, content, source, metadata)
    VALUES (gen_random_uuid(), $1, $2, $3, 'ai_research', $4)
    RETURNING id
  `, [contact.id, title, summary, JSON.stringify({ batchJobId: job.id })]);

  updateResult(job, contact.id, { noteId: rows[0].id });
}

async function runDeepResearch(job: BatchJob, contact: ContactRow) {
  updateResult(job, contact.id, { stage: 'search', model: 'perplexity/sonar-deep-research' });
  emitProgress(job);

  const result = await withTimeout(
    deepResearchContactWithAI(contact),
    { ms: 360_000, label: 'deep research timeout' }  // 6 мин
  );

  updateResult(job, contact.id, { stage: 'verify', model: result.verifyModel });
  emitProgress(job);

  const title = `Deep Research (${formatDate(new Date())})`;
  const { rows } = await pool.query(`
    INSERT INTO contact_notes (id, contact_id, title, content, source, metadata)
    VALUES (gen_random_uuid(), $1, $2, $3, 'ai_deep_research', $4)
    RETURNING id
  `, [contact.id, title, result.summary, JSON.stringify({
    structured: result.structured,
    searchModel: result.searchModel,
    verifyModel: result.verifyModel,
    confidence: result.structured.matched_identity_confidence,
    batchJobId: job.id,
  })]);

  updateResult(job, contact.id, { noteId: rows[0].id, model: result.verifyModel });
}

// Простой семафор
class Semaphore {
  private running = 0;
  private queue: (() => void)[] = [];
  constructor(private limit: number) {}
  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try { return await fn(); }
    finally { this.release(); }
  }
  private acquire() {
    if (this.running < this.limit) { this.running++; return Promise.resolve(); }
    return new Promise<void>(resolve => this.queue.push(resolve));
  }
  private release() {
    this.running--;
    const next = this.queue.shift();
    if (next) { this.running++; next(); }
  }
}
```

---

### 4. SSE прогресс: `src/app/api/admin/contacts/batch-research/[jobId]/stream/route.ts`

```typescript
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  if (!await verifyAdminSession()) return unauthorized();

  const job = getJob(params.jobId);
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Отправить текущее состояние сразу при подключении
      send(serializeJob(job));

      // Подписаться на обновления задачи
      const unsubscribe = subscribeToJob(params.jobId, (updatedJob) => {
        send(serializeJob(updatedJob));
        if (updatedJob.status === 'completed' || updatedJob.status === 'failed' || updatedJob.status === 'cancelled') {
          controller.close();
          unsubscribe();
        }
      });

      // Heartbeat каждые 15 сек
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: heartbeat\n\n`));
      }, 15_000);

      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        unsubscribe();
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

function serializeJob(job: BatchJob) {
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    totalCount: job.totalCount,
    processedCount: job.processedCount,
    successCount: job.successCount,
    errorCount: job.errorCount,
    cancelledCount: job.cancelledCount,
    progressPct: job.totalCount > 0
      ? Math.round((job.processedCount / job.totalCount) * 100)
      : 0,
    elapsedMs: job.startedAt ? Date.now() - job.startedAt.getTime() : 0,
    estimatedRemainingMs: estimateRemaining(job),
    results: job.results.map(r => ({
      contactId: r.contactId,
      fullName: r.fullName,
      status: r.status,
      durationMs: r.durationMs,
      error: r.error,
      stage: r.stage,
      model: r.model,
    })),
  };
}
```

**EventEmitter для подписки на обновления:**
```typescript
// В batch-research-store.ts
import { EventEmitter } from 'events';
const jobEmitter = new EventEmitter();

export function emitProgress(job: BatchJob) {
  jobEmitter.emit(`job:${job.id}`, job);
}

export function subscribeToJob(jobId: string, cb: (job: BatchJob) => void) {
  jobEmitter.on(`job:${jobId}`, cb);
  return () => jobEmitter.off(`job:${jobId}`, cb);
}
```

---

### 5. API: Статус и отмена

```typescript
// src/app/api/admin/contacts/batch-research/[jobId]/route.ts

// GET — текущий статус (для polling если SSE недоступен)
export async function GET(req, { params }) {
  if (!await verifyAdminSession()) return unauthorized();
  const job = getJob(params.jobId);
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(serializeJob(job));
}

// DELETE — отменить задачу
export async function DELETE(req, { params }) {
  if (!await verifyAdminSession()) return unauthorized();
  const cancelled = cancelJob(params.jobId);
  return NextResponse.json({ cancelled });
}
```

---

### 6. UI: Компонент запуска `apps/admin/src/components/admin/BatchResearchModal.tsx`

Модальное окно, открывается кнопкой на странице контактов И из AI Ассистента.

**Шаг 1 — Выбор контактов:**

```typescript
// Переключатель режима выбора
type SelectionMode = 'filter' | 'manual';

// Режим "по фильтру":
<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
  <select value={filter.status} onChange={...}>
    <option value="">Любой статус</option>
    <option value="new">Новый</option>
    <option value="in_progress">В работе</option>
    <option value="processed">Обработан</option>
    <option value="archived">Архив</option>
  </select>
  <input placeholder="Город" value={filter.city} onChange={...} />
  <input placeholder="Специальность" value={filter.speciality} onChange={...} />
  <input placeholder="Тег" value={filter.tag} onChange={...} />
  <label>
    <input type="checkbox" checked={filter.hasNoResearch} onChange={...} />
    Только без AI Research
  </label>
  <label>
    <input type="checkbox" checked={filter.hasNoDeepResearch} onChange={...} />
    Только без Deep Research
  </label>

  {/* Превью количества */}
  <button onClick={previewCount}>Показать количество</button>
  {previewCount !== null && (
    <p>Найдено контактов: <strong>{previewCount}</strong></p>
  )}
</div>
```

**Шаг 2 — Настройки:**
```typescript
<div>
  <label>Тип исследования:</label>
  <div style={{ display: 'flex', gap: 8 }}>
    <button onClick={() => setType('basic')} style={type === 'basic' ? activeStyle : {}}>
      <Search size={14} /> AI Research
      <span>Быстро (~30 сек/контакт)</span>
    </button>
    <button onClick={() => setType('deep')} style={type === 'deep' ? activeStyle : {}}>
      <Microscope size={14} /> Deep Research
      <span>Детально (~3-5 мин/контакт)</span>
    </button>
  </div>

  <label>Параллельность (1-5):</label>
  <input type="range" min={1} max={5} value={concurrency} onChange={...} />
  <span>{concurrency} параллельных запросов</span>

  {/* Предупреждение при deep research + много контактов */}
  {type === 'deep' && selectedCount > 10 && (
    <p style={{ color: 'orange' }}>
      ⚠️ Deep Research на {selectedCount} контактах займёт ~{Math.round(selectedCount * 4 / concurrency)} минут
    </p>
  )}
</div>
```

**Шаг 3 — Прогресс (после запуска):**
```typescript
// Прогресс-бар
<div style={{ background: 'var(--frox-gray-100)', borderRadius: 8, height: 12 }}>
  <div style={{
    background: 'var(--frox-blue)',
    width: `${job.progressPct}%`,
    height: '100%', borderRadius: 8,
    transition: 'width 0.3s ease',
  }} />
</div>
<p>{job.processedCount} / {job.totalCount} · {job.progressPct}%</p>

{/* Статистика */}
<div style={{ display: 'flex', gap: 16 }}>
  <span style={{ color: 'green' }}>✓ {job.successCount}</span>
  <span style={{ color: 'red' }}>✗ {job.errorCount}</span>
  {job.cancelledCount > 0 && <span style={{ color: 'gray' }}>⊘ {job.cancelledCount}</span>}
</div>

{/* Оценка времени */}
{job.status === 'running' && job.estimatedRemainingMs > 0 && (
  <p>Осталось ~{formatDuration(job.estimatedRemainingMs)}</p>
)}

{/* Кнопка отмены */}
{job.status === 'running' && (
  <button onClick={cancelJob} style={{ color: 'red' }}>
    <XCircle size={14} /> Остановить
  </button>
)}

{/* Детальный лог контактов */}
<div style={{ maxHeight: 300, overflowY: 'auto', fontSize: '0.82em' }}>
  {job.results.map(r => (
    <div key={r.contactId} style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0',
      borderBottom: '1px solid var(--frox-gray-100)',
    }}>
      {/* Иконка статуса */}
      {r.status === 'pending' && <Clock size={12} color="gray" />}
      {r.status === 'running' && <Loader2 size={12} color="blue" style={{ animation: 'spin 1s linear infinite' }} />}
      {r.status === 'success' && <CheckCircle size={12} color="green" />}
      {r.status === 'error' && <XCircle size={12} color="red" />}
      {r.status === 'skipped' && <MinusCircle size={12} color="gray" />}

      <span style={{ flex: 1 }}>{r.fullName}</span>

      {/* Стадия для running */}
      {r.status === 'running' && r.stage && (
        <span style={{ color: 'blue', fontSize: '0.9em' }}>
          {r.stage === 'search' ? '🔍 Поиск...' : r.stage === 'verify' ? '✅ Верификация...' : '...'}
        </span>
      )}

      {/* Время выполнения */}
      {r.durationMs && (
        <span style={{ color: 'gray' }}>{(r.durationMs / 1000).toFixed(1)}с</span>
      )}

      {/* Ошибка */}
      {r.error && (
        <span style={{ color: 'red' }} title={r.error}>!</span>
      )}
    </div>
  ))}
</div>
```

---

### 7. Интеграция в страницу контактов

В `apps/admin/src/app/contacts/page.tsx` добавить кнопку "Пакетное исследование" в тулбар:

```typescript
<button onClick={() => setShowBatchModal(true)}>
  <Zap size={14} /> Пакетное исследование
</button>
{showBatchModal && (
  <BatchResearchModal
    onClose={() => setShowBatchModal(false)}
    preselectedContactIds={selectedContactIds}  // если есть чекбоксы выбора
  />
)}
```

---

### 8. Интеграция в AI Ассистент

В `apps/admin/src/app/ai-assistant/page.tsx`:

```typescript
// Добавить в хедер:
<button onClick={() => setShowBatchModal(true)}>
  <Zap size={14} /> Пакетное исследование
</button>

// AI может рекомендовать: если пользователь спрашивает
// "обнови исследования для всех контактов из Москвы" →
// AI отвечает: "Найдено 47 контактов. Запустить пакетное исследование?"
// с кнопкой, которая открывает BatchResearchModal с предзаполненным фильтром city=Москва
```

---

## SSE-подписка на клиенте

```typescript
function useBatchJobSSE(jobId: string | null) {
  const [job, setJob] = useState<SerializedJob | null>(null);

  useEffect(() => {
    if (!jobId) return;

    // fetch вместо EventSource (чтобы работали cookies)
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      const response = await fetch(
        `/api/admin/contacts/batch-research/${jobId}/stream`,
        { signal: controller.signal, credentials: 'include' }
      );
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (!cancelled) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              setJob(data);
            } catch { /* ignore */ }
          }
        }
      }
    })().catch(console.error);

    return () => { cancelled = true; controller.abort(); };
  }, [jobId]);

  return job;
}
```

---

## Паттерны проекта (ОБЯЗАТЕЛЬНО)

- `export const runtime = 'nodejs'` во всех API routes
- `verifyAdminSession()` в каждом endpoint
- CSRF через `adminCsrfFetch` для POST/DELETE из UI
- SSE: `X-Accel-Buffering: no` для nginx
- Таймаут basic research: 90 сек, deep research: 360 сек
- Concurrency: 1-5 (для deep research рекомендовать 2-3, для basic — 4-5)
- Пул: `new Pool({ connectionString: process.env.DATABASE_URL || '...' })`
- Иконки: `Zap`, `CheckCircle`, `XCircle`, `Clock`, `Loader2`, `MinusCircle` из `lucide-react`

## Файлы для создания

| Файл | Описание |
|------|----------|
| `src/lib/batch-research-store.ts` | In-memory хранилище задач + EventEmitter |
| `src/lib/batch-research-runner.ts` | Движок параллельной обработки + Semaphore |
| `src/app/api/admin/contacts/batch-research/route.ts` | POST — создать задачу |
| `src/app/api/admin/contacts/batch-research/[jobId]/route.ts` | GET/DELETE — статус/отмена |
| `src/app/api/admin/contacts/batch-research/[jobId]/stream/route.ts` | GET SSE — прогресс |
| `apps/admin/src/components/admin/BatchResearchModal.tsx` | UI модал |

## Файлы для изменения

| Файл | Изменение |
|------|-----------|
| `apps/admin/src/app/contacts/page.tsx` | Добавить кнопку "Пакетное исследование" |
| `apps/admin/src/app/ai-assistant/page.tsx` | Добавить кнопку в хедер |

## НЕ делать
- Не хранить задачи в БД (только in-memory для MVP)
- Не использовать BullMQ, Redis или другие очереди
- Не делать выбор контактов чекбоксами на странице списка (это отдельная фича)
- Не отправлять email/Telegram при завершении (это следующий этап)
- Не добавлять новые npm-пакеты
