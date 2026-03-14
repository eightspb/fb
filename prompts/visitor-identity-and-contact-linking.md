# Задача: Visitor Identity, Session Linking и ручная привязка к CRM-контакту

Реализовать в проекте полноценную систему идентификации посетителей сайта на уровне браузера/устройства, отделить долгоживущего посетителя от краткоживущей сессии визита, добавить вероятностный fingerprint как вспомогательный сигнал, а также дать администратору возможность вручную привязывать сессии и посетителей к контактам из CRM.

Нужно выполнить работу end-to-end: от проектирования схемы данных и миграций до backend/API, frontend/admin UI, backfill исторических данных, тестов и краткой документации по новой модели.

---

## Режим работы

- Не ограничивайся планом: реализуй задачу в коде.
- Сначала изучи существующую реализацию и работай от текущей архитектуры, а не "с нуля".
- Делай additive-изменения без разрушения текущих данных.
- Не деплой и не применяй remote-миграции, если об этом явно не попросили.
- Если можно выполнить локально и проверить локально, сделай это.

---

## Обязательные project skills

Используй эти skills в рамках работы:

1. `fb-migrations-maintainer`
   Нужны новые таблицы, индексы, колонки, backfill и обновление `database-schema.sql`.

2. `fb-admin-csrf-guard`
   Любые новые `POST/PUT/PATCH/DELETE` запросы в `/api/admin/*` обязаны использовать CSRF по правилам проекта.

3. `fb-test-gatekeeper`
   Перед финализацией прогони уместный набор тестов и явно сообщи, что запускал и что не запускал.

Если нужны дополнительные локальные уточнения, опирайся на `AGENTS.md` в корне репозитория.

---

## Текущий контекст проекта, от которого нужно отталкиваться

Ниже перечислены уже существующие места, которые обязательно нужно изучить перед изменениями:

- `src/components/VisitorTracker.tsx`
  Сейчас хранит `visitor_session_id` в `localStorage` и отправляет pageview/heartbeat/leave в `/api/analytics/track`.

- `src/app/api/analytics/track/route.ts`
  Сейчас пишет данные в `visitor_sessions` и `page_visits`, а также сохраняет `ip`, `user-agent`, гео, device/browser/os.

- `database-schema.sql`
  Уже содержит таблицы `visitor_sessions`, `page_visits`, `ip_geolocation_cache`, `contacts`, `form_submissions`.

- `src/app/api/admin/analytics/sessions/route.ts`
  Сейчас отдает "активные сессии" напрямую из `visitor_sessions`.

- `src/app/api/admin/analytics/history/route.ts`
  Сейчас строит историю активности по `page_visits`, агрегируя по `session_id`.

- `src/app/api/admin/analytics/history/[sessionId]/route.ts`
  Сейчас отдает таймлайн конкретной сессии.

- `apps/admin/src/components/admin/ActiveSessions.tsx`
  UI активных посетителей.

- `apps/admin/src/components/admin/ActivityHistoryPage.tsx`
  UI истории активности.

- `src/app/api/admin/contacts/route.ts`
  API поиска/списка контактов CRM.

- `apps/admin/src/lib/admin-csrf-fetch.ts`
  Используй для любых новых non-GET запросов из admin UI.

Важно: текущий `visitor_session_id`, который лежит в `localStorage`, фактически уже ведет себя как долгоживущий browser/device ID, хотя по названию считается "session". Новая архитектура должна аккуратно исправить это без поломки существующей аналитики.

---

## Продуктовая цель

Нужно добиться следующего поведения:

1. Если посетитель приходит с того же браузера, но с другого IP-адреса, система должна узнавать, что это тот же visitor/device.

2. Если посетитель приходит с другого браузера или другого устройства, система должна уметь:
   - либо создать нового visitor,
   - либо показать лишь вероятное совпадение по fingerprint,
   - но не склеивать автоматически людей только по слабым сигналам.

3. В админке должно быть видно:
   - конкретную visit session,
   - долгоживущего visitor/device,
   - ручную или автоматическую связь visitor/session с CRM-контактом.

4. В списке сессий, в истории активности и в активных сессиях администратор должен иметь возможность вручную:
   - привязать visit session к контакту,
   - либо привязать весь visitor к контакту,
   - отвязать связь,
   - перепривязать к другому контакту,
   - оставить причину/комментарий действия,
   - видеть, кто и когда выполнил привязку.

5. Система должна быть готова к последующему авто-линку visitor -> contact при отправке формы или другой идентифицирующей активности.

---

## Что именно нужно построить

### 1. Новая аналитическая модель

Вместо одной сущности "session" внедри двухуровневую модель:

- `visitor`
  Долгоживущий идентификатор браузера/устройства.

- `visit session`
  Конкретный визит, ограниченный во времени.

- `contact link`
  Связь `visit` или `visitor` с CRM-контактом.

- `fingerprint`
  Вспомогательный вероятностный сигнал, не источник абсолютной истины.

### 2. Новая схема БД

Сделай additive migration(и) для новой модели.

Рекомендуемая схема:

#### `site_visitors`

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `visitor_id TEXT UNIQUE NOT NULL`
- `first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `first_ip_address TEXT`
- `last_ip_address TEXT`
- `first_user_agent TEXT`
- `last_user_agent TEXT`
- `first_referrer TEXT`
- `last_referrer TEXT`
- `visits_count INTEGER NOT NULL DEFAULT 0`
- `fingerprint_hash TEXT`
- `fingerprint_version TEXT`
- `fingerprint_signals JSONB NOT NULL DEFAULT '{}'::jsonb`
- `metadata JSONB NOT NULL DEFAULT '{}'::jsonb`

Индексы:

- `visitor_id`
- `last_seen_at DESC`
- `fingerprint_hash`
- при необходимости `last_ip_address`

#### `visit_sessions`

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `visit_id TEXT UNIQUE NOT NULL`
- `visitor_id TEXT NOT NULL`
- `started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `ended_at TIMESTAMPTZ`
- `is_active BOOLEAN NOT NULL DEFAULT true`
- `entry_page TEXT`
- `exit_page TEXT`
- `current_page TEXT`
- `page_title TEXT`
- `referrer TEXT`
- `page_views_count INTEGER NOT NULL DEFAULT 1`
- `ip_address TEXT`
- `user_agent TEXT`
- `device_type TEXT`
- `browser TEXT`
- `os TEXT`
- `country TEXT`
- `country_code TEXT`
- `region TEXT`
- `city TEXT`
- `utm_source TEXT`
- `utm_medium TEXT`
- `utm_campaign TEXT`
- `screen_width INTEGER`
- `screen_height INTEGER`
- `language TEXT`
- `timezone TEXT`
- `fingerprint_hash TEXT`
- `fingerprint_version TEXT`

Индексы:

- `visit_id`
- `visitor_id`
- `last_activity_at DESC`
- `is_active, last_activity_at`
- `ip_address`
- `fingerprint_hash`

Связь по FK можно делать либо на `site_visitors(id)`, либо на `site_visitors(visitor_id)`. Выбери вариант, который лучше ложится на текущий код, но API снаружи должен оперировать человекочитаемым `visitor_id`.

#### Изменения в `page_visits`

Добавь колонки:

- `visitor_id TEXT`
- `visit_id TEXT`
- `fingerprint_hash TEXT`
- `fingerprint_version TEXT`

Индексы:

- `visitor_id`
- `visit_id`
- `fingerprint_hash`

#### `analytics_contact_links`

Таблица для связей аналитики с CRM-контактами.

Поля:

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `link_scope TEXT NOT NULL CHECK (link_scope IN ('visit', 'visitor'))`
- `visit_id TEXT`
- `visitor_id TEXT`
- `contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE`
- `link_source TEXT NOT NULL CHECK (link_source IN ('manual', 'form_auto', 'auth_auto', 'heuristic_suggested'))`
- `confidence NUMERIC(5,4)`
- `reason TEXT`
- `created_by_admin TEXT`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `is_active BOOLEAN NOT NULL DEFAULT true`
- `metadata JSONB NOT NULL DEFAULT '{}'::jsonb`

Ограничения:

- если `link_scope = 'visit'`, должен быть заполнен `visit_id`
- если `link_scope = 'visitor'`, должен быть заполнен `visitor_id`

Индексы:

- `contact_id`
- `visit_id`
- `visitor_id`
- partial index для активных связей

#### `analytics_link_audit`

Поля:

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `link_id UUID`
- `action TEXT NOT NULL CHECK (action IN ('created', 'removed', 'reassigned', 'promoted_to_visitor'))`
- `payload JSONB NOT NULL DEFAULT '{}'::jsonb`
- `created_by_admin TEXT`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

### 3. Политика хранения идентификаторов

На клиенте нужно ввести:

- `visitor_id`
  Долгоживущий ID браузера/устройства.
  Хранить в `localStorage` и в first-party cookie.

- `visit_id`
  Краткоживущий ID визита.
  Хранить отдельно.

Правила:

- если это новый браузер/устройство, создается новый `visitor_id`
- если `visitor_id` уже есть, visitor считается тем же даже при новом IP
- новый `visit_id` создается:
  - при первом заходе,
  - после длительной паузы, например более 30 минут,
  - после завершения прошлого визита

Важно:

- не удаляй текущую аналитику сразу
- внедри transition layer и dual-write, если это упрощает безопасный переход
- старый `visitor_session_id` можно использовать как seed для legacy/backfill-совместимости

### 4. Fingerprint как эвристика

Сделай "мягкий" fingerprint, который помогает сопоставлять устройства, но не используется как абсолютный источник истины.

Стартовый набор сигналов:

- `user-agent`
- `navigator.language`
- `timezone`
- `screen.width`
- `screen.height`
- `platform`, если доступно
- `hardwareConcurrency`, если доступно
- `deviceMemory`, если доступно

Требования:

- нормализуй сигнал перед хешированием
- добавь `fingerprint_version`
- сохраняй и `hash`, и `signals JSON`
- не делай auto-link контакта только по fingerprint
- можно выводить в UI статус:
  - "точное совпадение"
  - "вероятное совпадение"
  - "нет совпадения"

Canvas/WebGL fingerprint на первом этапе не обязателен. Если сочтешь нужным, добавляй только при аккуратной реализации и без перегруза.

---

## Изменения в backend

### 1. Переписать/расширить tracker endpoint

Файл:

- `src/app/api/analytics/track/route.ts`

Нужно:

- принимать `visitorId`, `visitId`, `fingerprintHash`, `fingerprintVersion`, `fingerprintSignals`
- поддержать совместимость со старым payload, если это нужно для безопасного перехода
- на `pageview`:
  - upsert/update `site_visitors`
  - upsert/update `visit_sessions`
  - писать `page_visits`
- на `heartbeat`:
  - обновлять `visit_sessions.last_activity_at`
  - обновлять `site_visitors.last_seen_at`
- на `leave`:
  - фиксировать `time_on_page`
  - обновлять `visit_sessions.exit_page`
  - по возможности помечать сессию завершенной

Нужно отделить понятия:

- visitor живет дольше
- visit session живет ограниченное время

### 2. Новые admin API для связки с контактами

Нужно создать новые admin endpoints:

- `POST /api/admin/analytics/contact-links`
  Создать manual link.

- `PATCH /api/admin/analytics/contact-links/[id]`
  Переназначить link на другой контакт или изменить reason/metadata.

- `DELETE /api/admin/analytics/contact-links/[id]`
  Деактивировать link.

Пример body для создания:

```json
{
  "linkScope": "visit",
  "visitId": "visit_xxx",
  "contactId": "uuid",
  "reason": "Узнали посетителя по заявке и маршруту",
  "promoteToVisitor": false
}
```

Или:

```json
{
  "linkScope": "visitor",
  "visitorId": "visitor_xxx",
  "contactId": "uuid",
  "reason": "Точно знаем, что это тот же человек",
  "promoteToVisitor": true
}
```

Требования:

- проверять админскую сессию
- использовать CSRF-паттерн проекта
- писать аудит в `analytics_link_audit`
- не делать hard-delete

### 3. Расширить существующие analytics admin endpoints

#### `src/app/api/admin/analytics/sessions/route.ts`

Переведи на новую модель и возвращай:

- `visitId`
- `visitorId`
- summary поля визита
- `linkedContact`
- `linkScope`
- `matchHints`
- `knownIpsCount` для visitor
- `visitorVisitsCount`

Старое поле `sessionId` можно сохранить временно как alias для совместимости UI, но постепенно переводи UI на `visitId`.

#### `src/app/api/admin/analytics/history/route.ts`

Расширь выдачу:

- `visitId`
- `visitorId`
- `linkedContact`
- `linkScope`
- `visitorFirstSeenAt`
- `visitorLastSeenAt`
- `visitorVisitsCount`
- `knownIpsCount`

Добавь фильтры:

- `linked=all|yes|no`
- `contactId`
- `visitorId`
- `hasSuggestions=yes|no`

#### `src/app/api/admin/analytics/history/[sessionId]/route.ts`

Адаптируй под новую модель:

- принимай `visitId`
- возвращай summary по визиту
- текущую связь с контактом
- соседние visit sessions этого visitor
- известные IP/города для visitor
- таймлайн страниц

Можно оставить существующий path-параметр по имени `sessionId`, если это упрощает совместимость маршрута, но фактически внутри работай с `visitId`.

### 4. Visitor detail endpoint

Добавь новый endpoint:

- `GET /api/admin/analytics/visitors/[visitorId]`

Он должен возвращать:

- visitor summary
- список последних visit sessions
- историю IP/страна/город
- fingerprint summary
- текущую привязку к контакту
- возможные suggested matches, если реализуешь этот слой

---

## Изменения в frontend/admin UI

### 1. Active Sessions

Файл:

- `apps/admin/src/components/admin/ActiveSessions.tsx`

Нужно добавить:

- отображение `visitorId` и `visitId`
- badge состояния:
  - не привязан
  - привязан к контакту
  - есть вероятное совпадение
- кнопку `Привязать к контакту`
- кнопку `Отвязать`, если есть активная связь
- ссылку на карточку контакта, если связь есть
- в expanded view показать краткую информацию о visitor:
  - сколько у него visit sessions
  - сколько разных IP
  - first seen / last seen

### 2. Activity History

Файл:

- `apps/admin/src/components/admin/ActivityHistoryPage.tsx`

Нужно добавить:

- те же badges и actions, что и в Active Sessions
- фильтр по привязке
- фильтр по `visitorId` / `contact`
- в деталях сессии показать:
  - visitor summary
  - текущий linked contact
  - историю соседних визитов visitor

### 3. Модалка ручной привязки

Сделай переиспользуемый admin-компонент, например:

- `apps/admin/src/components/admin/AnalyticsContactLinkModal.tsx`

Функциональность:

- поиск контактов через существующий `/api/admin/contacts?search=...`
- выбор одного контакта
- выбор scope:
  - `Привязать только эту сессию`
  - `Привязать весь visitor`
- поле `Причина`
- подтверждение действия

Требования:

- все non-GET через `adminCsrfFetch`
- если сервер возвращает CSRF-ошибку, должен сработать встроенный retry helper

### 4. UX-правила

- Не ломай текущий дизайн админки, придерживайся существующего визуального языка.
- Не делай перегруженный forensic-интерфейс.
- Показывай высокосигнальную информацию:
  - linked contact
  - visitor summary
  - точное или вероятное совпадение
- На мобильном layout не должен развалиться.

---

## Автоматическая привязка при идентифицирующих событиях

Реализуй инфраструктуру так, чтобы она поддерживала авто-привязку visitor -> contact.

Минимум:

- когда в будущем код создаст или найдет `contact_id` после формы, должно быть просто вызвать helper для auto-link
- helper должен поддерживать `link_source = 'form_auto'`

Если в репозитории уже есть уместные места для form submission linkage, можешь частично интегрировать сейчас, но не раздувай задачу за счет сомнительных догадок. Основной обязательный результат этой задачи: manual linking + готовая инфраструктура для auto-link.

---

## Исторические данные и backfill

Нужно сохранить преемственность с уже существующей аналитикой.

Сделай backfill-стратегию:

1. Используй текущий legacy `session_id` как исходную основу для `visitor_id` в старых данных.

2. Нарежь historical `visit_id` из `page_visits` эвристически:
   - новый visit при паузе > 30 минут
   - допускается приближенное восстановление старых визитов

3. Реализуй backfill либо:
   - отдельной SQL/data migration,
   - либо отдельным локальным script/job в `scripts/`,
   - либо безопасным серверным helper, который не запускается сам по себе на проде без явного вызова

Требования:

- backfill не должен быть destructive
- не смешивай тяжелый backfill и schema migration в одну длинную транзакцию
- результат должен быть повторяемым или как минимум безопасным при повторном запуске

---

## Совместимость и стратегия внедрения

Нужна безопасная migration path:

### Этап A. Schema ready

- новые таблицы и индексы
- обновленный `database-schema.sql`

### Этап B. Dual write

- tracker пишет в новую модель
- старая аналитика еще не ломается

### Этап C. Admin read migration

- активные сессии и история читают из новой модели
- при необходимости поддерживай временный fallback на legacy

### Этап D. Manual linking

- UI и API ручной привязки

### Этап E. Backfill

- исторические visitors/visits

Не удаляй старые таблицы и старую логику в этом же change set, если это повышает риск.

---

## Безопасность и compliance

### 1. Admin CSRF

Для любых новых client-side non-GET запросов в `/api/admin/*`:

- обязательно используй `x-csrf-token`
- токен брать через `getCsrfToken()`
- при CSRF-related `403` повторять запрос один раз через `refreshCsrfToken()`
- используй существующий helper `apps/admin/src/lib/admin-csrf-fetch.ts`

Не добавляй новые CSRF exemptions в middleware.

### 2. Privacy

Не делай агрессивную auto-identification логику.

Допускается:

- first-party `visitor_id`
- device/browser-level fingerprint как heuristic

Не допускается:

- автоматическое признание личности человека только по fingerprint/IP

Если в репозитории есть место для заметки в docs о privacy/data collection, можешь добавить краткую техническую памятку, но не уходи в юридический трактат.

---

## Тесты

Нужно добавить и/или обновить тесты.

Минимум:

### Unit / integration

- генерация и ротация `visitor_id` / `visit_id`
- fingerprint normalization / hashing
- new analytics track route behavior
- admin contact link create/update/delete
- filters в history/sessions

### UI / component / e2e

Хотя бы один реальный сценарий:

- открыть analytics UI
- привязать session или visitor к контакту
- увидеть badge/link после обновления данных

Если полноценный e2e слишком дорогой для текущего набора тестов, можно ограничиться route/unit + четко указать, чего не хватило.

Используй уместный для репозитория набор команд. Перед финализацией запусти хотя бы таргетированные тесты по затронутым зонам.

---

## Документация

После реализации:

- кратко обнови документацию, если это уместно
- добавь короткое техническое описание новой модели visitor/visit/contact-link
- если нужен отдельный `docs/` файл, создай компактный, без воды

---

## Критерии приемки

Считать задачу выполненной, если соблюдены все пункты ниже:

1. На сайте существует долгоживущий `visitor_id`, который переживает смену IP.

2. Для каждого визита существует отдельный `visit_id`, который не равен visitor-level идентификатору.

3. `track` endpoint сохраняет visitor-level и visit-level данные отдельно.

4. В `page_visits` сохраняются `visitor_id` и `visit_id`.

5. Admin API для active/history/detail используют новую модель или безопасный совместимый слой поверх нее.

6. В Active Sessions можно вручную привязать сессию или visitor к CRM-контакту.

7. В History можно вручную привязать сессию или visitor к CRM-контакту.

8. Привязка отображается в UI badge'ами и ссылкой на контакт.

9. Есть возможность отвязать или перепривязать связь.

10. Все действия ручной привязки пишутся в audit trail.

11. Все новые admin non-GET запросы работают через CSRF-safe path.

12. Есть migration(и) и обновлен `database-schema.sql`.

13. Есть стратегия и реализация backfill для старых данных.

14. Добавлены тесты или обоснованно расширены существующие.

15. В финальном отчете перечислены:
    - какие файлы изменены
    - какие миграции созданы
    - какие тесты запущены
    - какие ограничения/долги остались

---

## Практические замечания по реализации

- Предпочитай `rg` для поиска по коду.
- Изменения в файлах вноси аккуратно и локально, без лишнего рефакторинга.
- Не переименовывай массово старые сущности, если это не требуется для работающего результата.
- Если видишь, что текущий `sessionId` уже широко используется в UI, можешь временно оставить обратную совместимость:
  - API возвращает и `sessionId`, и `visitId`
  - UI постепенно переводится на `visitId`

- Не удаляй существующую таблицу `visitor_sessions` в этой задаче.
- Если нужно, пометь legacy-слой комментариями и используй его только как transitional compatibility path.

---

## Финальный формат результата

После завершения работы сообщи:

1. Что реализовано на уровне архитектуры.
2. Какие миграции добавлены.
3. Какие endpoint'ы добавлены или изменены.
4. Какие admin UI части обновлены.
5. Как теперь работает ручная привязка.
6. Как устроен backfill.
7. Какие тесты запущены и их результат.
8. Какие ограничения или следующие шаги остались.

Не останавливайся на описании решения. Цель этого задания — именно реализовать фичу в репозитории.
