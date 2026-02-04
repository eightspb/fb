# Настройка SSL сертификата (HTTPS)

Эта инструкция описывает настройку бесплатного SSL сертификата от Let's Encrypt для работы сайта по HTTPS.

## Требования

- Домен, направленный на IP вашего сервера (A-запись в DNS)
- Открытые порты 80 и 443 на сервере
- Docker и Docker Compose

## Быстрая настройка (автоматический скрипт)

```bash
cd /opt/fb-net
chmod +x scripts/setup-ssl.sh
./scripts/setup-ssl.sh yourdomain.com your@email.com
```

Скрипт автоматически:
1. Создаст необходимые директории
2. Обновит конфигурацию nginx
3. Получит SSL сертификат
4. Перезапустит все сервисы с HTTPS

---

## Ручная настройка (пошагово)

### Шаг 1: Подготовка

```bash
cd /opt/fb-net

# Создать директории для certbot
mkdir -p certbot/www certbot/conf
```

### Шаг 2: Настройка домена в nginx

Отредактируйте файл `nginx/nginx-ssl.conf` и замените `YOUR_DOMAIN` на ваш домен:

```bash
nano nginx/nginx-ssl.conf
```

Замените все вхождения `YOUR_DOMAIN` на ваш домен (например, `fibroadenoma.net`).

### Шаг 3: Запуск nginx для получения сертификата

Сначала запустите nginx с HTTP конфигурацией:

```bash
# Временно использовать HTTP конфиг для получения сертификата
cp nginx/nginx.conf nginx/nginx-temp.conf

docker compose -f docker-compose.ssl.yml up -d postgres app

# Запустить nginx отдельно с HTTP конфигом
docker run -d --name nginx-temp \
  -p 80:80 \
  -v $(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf:ro \
  -v $(pwd)/certbot/www:/var/www/certbot:ro \
  --network fb-net-prod-network \
  nginx:alpine
```

### Шаг 4: Получение SSL сертификата

```bash
docker run --rm \
  -v $(pwd)/certbot/www:/var/www/certbot \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email your@email.com \
  --agree-tos \
  --no-eff-email \
  -d yourdomain.com \
  -d www.yourdomain.com
```

### Шаг 5: Запуск с SSL

```bash
# Остановить временный nginx
docker stop nginx-temp && docker rm nginx-temp

# Обновить .env
nano .env
# Изменить: NEXT_PUBLIC_SITE_URL=https://yourdomain.com

# Запустить все сервисы с SSL
docker compose -f docker-compose.ssl.yml up -d --build
```

---

## Проверка

```bash
# Статус контейнеров
docker compose -f docker-compose.ssl.yml ps

# Проверка сертификата
curl -I https://yourdomain.com

# Информация о сертификате
docker run --rm \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  certbot/certbot certificates
```

---

## Обновление сертификата

Сертификаты Let's Encrypt действуют 90 дней. Контейнер certbot автоматически обновляет их каждые 12 часов.

### Ручное обновление

```bash
docker compose -f docker-compose.ssl.yml exec certbot certbot renew

# Перезагрузить nginx после обновления
docker compose -f docker-compose.ssl.yml exec nginx nginx -s reload
```

---

## Переход с HTTP на HTTPS

Если сайт уже работает по HTTP (`docker-compose.production.yml`):

1. Остановите текущие контейнеры:
   ```bash
   docker compose -f docker-compose.production.yml down
   ```

2. Следуйте инструкции выше для настройки SSL

3. После настройки используйте `docker-compose.ssl.yml`:
   ```bash
   docker compose -f docker-compose.ssl.yml up -d
   ```

---

## Устранение проблем

### Ошибка "Challenge failed"

DNS записи ещё не обновились. Проверьте:
```bash
nslookup yourdomain.com
```

IP должен соответствовать вашему серверу. DNS обновление может занять до 24 часов.

### Ошибка "Connection refused"

Проверьте, открыты ли порты 80 и 443:
```bash
# На сервере
sudo ufw allow 80
sudo ufw allow 443

# Или для firewalld
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### Сертификат не обновляется

```bash
# Проверьте логи certbot
docker compose -f docker-compose.ssl.yml logs certbot

# Принудительное обновление
docker run --rm \
  -v $(pwd)/certbot/www:/var/www/certbot \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  certbot/certbot renew --force-renewal
```

### Сайт недоступен после настройки SSL

```bash
# Проверьте логи nginx
docker compose -f docker-compose.ssl.yml logs nginx

# Проверьте конфигурацию
docker compose -f docker-compose.ssl.yml exec nginx nginx -t
```

---

## Структура файлов

```
/opt/fb-net/
├── nginx/
│   ├── nginx.conf          # HTTP конфигурация (для получения сертификата)
│   └── nginx-ssl.conf      # HTTPS конфигурация (основная)
├── certbot/
│   ├── www/                # Файлы для ACME challenge
│   └── conf/               # SSL сертификаты
├── docker-compose.ssl.yml  # Docker Compose с SSL
└── .env                    # Переменные окружения
```

---

## Полезные команды

```bash
# Проверить дату истечения сертификата
openssl s_client -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates

# Перезагрузить nginx без даунтайма
docker compose -f docker-compose.ssl.yml exec nginx nginx -s reload

# Просмотреть логи в реальном времени
docker compose -f docker-compose.ssl.yml logs -f nginx
```
