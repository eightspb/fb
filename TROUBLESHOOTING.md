# Устранение проблем

## Docker не запущен

**Ошибка:** `unable to get image ... dockerDesktopLinuxEngine`

**Решение:**
1. Запустите Docker Desktop
2. Дождитесь полной загрузки (зеленая иконка в трее)
3. Проверьте: `docker ps`

---

## Ошибка подключения к БД

**Ошибка:** `ECONNREFUSED` или `connect ECONNREFUSED`

**Решение:**
1. Убедитесь что Docker запущен: `docker ps`
2. Проверьте контейнер БД: `docker ps | grep supabase-db`
3. Перезапустите: `npm run docker:up`

---

## Страницы не открываются

**Решение:**
1. Проверьте запущен ли сервер: `npm run dev`
2. Проверьте порт: http://localhost:3000
3. Смотрите консоль на ошибки

---

## Таблицы не найдены

**Ошибка:** `relation "news" does not exist`

**Решение:**
```bash
# Примените схему БД
docker exec -i fb-net-supabase-db psql -U postgres -d postgres < supabase-schema.sql
```

---

## Переменные окружения не работают

**Решение:**
1. Убедитесь что `.env.local` существует в корне проекта
2. Перезапустите dev сервер (Ctrl+C, затем `npm run dev`)

---

## Ошибки SMTP (отправка писем)

**Ошибка:** `socket disconnected` или `TLS connection`

**Решение:**
1. Используйте пароль приложения (не обычный пароль)
2. Создайте его в настройках почты: **Пароль и безопасность** → **Пароли для внешних приложений**
3. Попробуйте порт 587 вместо 465

---

## Изображения не загружаются

Изображения хранятся в БД и отдаются через `/api/images/{id}`.

**Проверка:**
```sql
SELECT id, image_url, 
       CASE WHEN image_data IS NULL THEN 'NO DATA' ELSE 'HAS DATA' END 
FROM news_images LIMIT 5;
```

---

## Логи и отладка

```bash
# Логи Docker
npm run docker:logs

# Логи конкретного контейнера
docker logs fb-net-nextjs -f

# Подключение к БД
npm run docker:psql
```
