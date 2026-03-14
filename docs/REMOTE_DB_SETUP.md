# Работа с удалённой базой данных

Локальная разработка с реальными продакшн данными через SSH-туннель.

## Быстрый старт

```bash
bun run dev:remote
```

Открыть: `http://localhost:3001/admin/login`

Скрипт автоматически: проверяет SSH, создаёт туннель `localhost:54321 → PostgreSQL в Docker`, запускает `site` (3000) + `admin` (3001). Ctrl+C завершает всё корректно.
Скрипт сам определяет текущий IP контейнера PostgreSQL на сервере, поэтому IP не нужно прописывать вручную.

## Вручную (3 терминала)

```bash
# Терминал 1 — SSH туннель (держать открытым)
bun run tunnel:start

# Терминал 2
bun run dev:site

# Терминал 3
bun run dev:admin
```

## Troubleshooting

**Порт 54321 занят:**
```bash
lsof -nP -iTCP:54321 -sTCP:LISTEN
kill <PID>
```

**SSH не подключается:**
```bash
ssh -p 2222 root@155.212.217.60  # или: ssh fb-net (если настроен alias)
```

**Туннель разрывается сам — добавить в `~/.ssh/config`:**
```
Host 155.212.217.60
    Port 2222
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

## ⚠️ Важно

Вы работаете с **продакшн данными** — все изменения реальные. Для тестирования деструктивных операций используйте локальную БД:

```bash
bun run docker:up
bun run dev:site
```
