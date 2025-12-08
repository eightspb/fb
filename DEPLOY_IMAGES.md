# Загрузка изображений на сервер

## Проблема

Папка `/public/images/trainings/` исключена из Git (в `.gitignore`), поэтому изображения не попадают на сервер автоматически при `git clone`.

## Решение

Вам нужно **вручную скопировать** папку с изображениями на сервер.

### Вариант 1: Через SCP (рекомендуется)

С вашего локального компьютера выполните:

```bash
scp -r public/images/trainings user@your-server:/opt/fb-net/public/images/
```

Замените:
- `user` - ваш пользователь на сервере
- `your-server` - IP адрес или домен вашего сервера
- `/opt/fb-net` - путь к проекту на сервере

### Вариант 2: Через rsync (более эффективно для больших файлов)

```bash
rsync -avz --progress public/images/trainings/ user@your-server:/opt/fb-net/public/images/trainings/
```

### Вариант 3: Через Docker volume (если хотите хранить вне контейнера)

1. Создайте папку на сервере:
   ```bash
   mkdir -p /opt/fb-net-data/images/trainings
   ```

2. Скопируйте файлы туда:
   ```bash
   scp -r public/images/trainings/* user@your-server:/opt/fb-net-data/images/trainings/
   ```

3. Добавьте volume в `docker-compose.production.yml`:
   ```yaml
   app:
     volumes:
       - /opt/fb-net-data/images:/app/public/images
   ```

### Вариант 4: Использовать Supabase Storage (для новых загрузок)

Для новых изображений используйте компонент `FileUpload`, который загружает файлы в Supabase Storage. Старые изображения из `/public/images/trainings/` можно оставить как есть или постепенно мигрировать в Storage.

## Проверка

После копирования проверьте, что файлы на месте:

```bash
# На сервере
ls -la /opt/fb-net/public/images/trainings/
```

## Альтернативное решение: Использовать только Storage

Если вы хотите полностью перейти на Supabase Storage для всех изображений:

1. Загрузите все изображения через админ-панель (`/admin/news`)
2. Обновите пути в БД, чтобы они указывали на Storage URLs вместо локальных путей

