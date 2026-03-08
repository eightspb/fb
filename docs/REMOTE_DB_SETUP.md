# Работа с удалённой базой данных

Локальная разработка с реальными продакшн данными через SSH-туннель.

## Быстрый старт

```powershell
bun run dev:remote
```

Открыть: `http://localhost:3001/admin`

Скрипт автоматически: проверяет SSH, создаёт туннель `localhost:54321 → PostgreSQL в Docker (172.18.0.5:5432)`, запускает `site` (3000) + `admin` (3001). Ctrl+C завершает всё корректно.

## Вручную (3 терминала)

```bash
# Терминал 1 — SSH туннель (держать открытым)
ssh -p 2222 -N -L 54321:172.18.0.5:5432 root@155.212.217.60

# Терминал 2
bun run dev:site

# Терминал 3
bun run dev:admin
```

## Troubleshooting

**Порт 54321 занят:**
```powershell
Get-NetTCPConnection -LocalPort 54321 | Select-Object OwningProcess
Stop-Process -Id <PID> -Force
```

**SSH не подключается:**
```powershell
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

```powershell
bun run docker:up
bun run dev:site
```
