# Деплой информационного баннера

## 🚀 Быстрый деплой

### Вариант 1: Автоматический деплой через GitHub (Рекомендуется)

```bash
# 1. Закоммитить все изменения
git add .
git commit -m "feat: добавлен информационный баннер с настройками через админ-панель"
git push origin main
```

GitHub Actions автоматически:
- ✅ Запустит тесты
- ✅ Соберет Docker образ
- ✅ Задеплоит на продакшен
- ✅ Отправит уведомление в Telegram

**Время:** ~3-5 минут

### Вариант 2: Ручной деплой

```powershell
# Из корня проекта
.\scripts\deploy-from-github.ps1 -AppOnly
```

## 📋 После деплоя

### 1. Применить миграцию БД

Миграция уже добавлена в `database-schema.sql`, но если база уже инициализирована, нужно применить только новую таблицу:

```bash
# Через SSH
ssh root@155.212.217.60 "docker exec fb-net-db psql -U postgres -d postgres" < migrations/007_add_site_banner.sql
```

Или вручную на сервере:

```bash
# Подключиться к серверу
ssh root@155.212.217.60

# Применить миграцию
docker exec fb-net-db psql -U postgres -d postgres < /opt/fb-net/migrations/007_add_site_banner.sql

# Или напрямую через psql
docker exec -it fb-net-db psql -U postgres -d postgres
\i /opt/fb-net/migrations/007_add_site_banner.sql
\q
```

### 2. Проверить работу

```bash
# Проверить, что таблица создана
ssh root@155.212.217.60 "docker exec fb-net-db psql -U postgres -d postgres -c 'SELECT * FROM site_banner;'"

# Должна вернуться одна запись с настройками по умолчанию
```

### 3. Настроить баннер

1. Откройте админ-панель: `https://fibroadenoma.net/admin/banner`
2. Настройте параметры баннера
3. Включите баннер
4. Сохраните изменения
5. Проверьте отображение на главной странице

## 🔍 Проверка деплоя

```bash
# Проверить статус контейнеров
ssh root@155.212.217.60 "docker ps"

# Проверить логи приложения
ssh root@155.212.217.60 "docker logs fb-net-site --tail 50"

# Проверить логи БД
ssh root@155.212.217.60 "docker logs fb-net-db --tail 50"

# Проверить API баннера
curl https://fibroadenoma.net/api/banner
```

## ⚠️ Важно

### Если база данных еще не инициализирована

Если вы деплоите на чистый сервер или пересоздаете БД, миграция применится автоматически из `database-schema.sql`. Дополнительно применять `007_add_site_banner.sql` не нужно.

### Если база уже существует

Нужно применить только миграцию `007_add_site_banner.sql` как показано выше.

## 🐛 Troubleshooting

### Ошибка "Таблица site_banner не найдена"

```bash
# Применить миграцию вручную
ssh root@155.212.217.60
docker exec -it fb-net-db psql -U postgres -d postgres
\i /opt/fb-net/migrations/007_add_site_banner.sql
\q
```

### Баннер не отображается после деплоя

1. Проверьте, что миграция применена: `SELECT * FROM site_banner;`
2. Проверьте, что баннер включен в админ-панели
3. Очистите localStorage браузера
4. Проверьте логи: `docker logs fb-net-site --tail 100`

### GitHub Actions не запускается

1. Проверьте, что push в ветку `main` или `master`
2. Проверьте статус Actions: https://github.com/your-repo/actions
3. Проверьте секреты в настройках репозитория

## 📝 Что было добавлено

- ✅ Таблица `site_banner` в БД
- ✅ API endpoints: `/api/banner`, `/api/admin/banner`
- ✅ Компонент баннера на фронтенде
- ✅ Страница управления `/admin/banner`
- ✅ Пункт "Баннер" в навигации админ-панели

## ✅ Готово!

После успешного деплоя и применения миграции система баннера полностью готова к использованию.
