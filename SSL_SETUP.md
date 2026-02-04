# Настройка SSL сертификата (HTTPS) для fibroadenoma.net

Эта инструкция описывает настройку бесплатного SSL сертификата от Let's Encrypt для работы сайта по HTTPS.

## Требования

**Перед началом убедитесь:**

1. ✅ Домен **fibroadenoma.net** направлен на IP вашего сервера (A-запись в DNS)
2. ✅ Порты **80 и 443** открыты на сервере
3. ✅ Docker и Docker Compose установлены
4. ✅ Сайт работает на сервере (доступен по HTTP)

### Проверка DNS

```bash
# Проверьте, что домен указывает на ваш сервер
nslookup fibroadenoma.net

# Должен показать IP вашего сервера
```

### Проверка портов

```bash
# На сервере
sudo ufw status
sudo ufw allow 80
sudo ufw allow 443

# Или для firewalld
sudo firewall-cmd --list-all
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

---

## 🚀 Автоматическая настройка (рекомендуется)

### Шаг 1: Загрузите последние изменения

```bash
cd /opt/fb-net
git pull
```

### Шаг 2: Запустите скрипт настройки

```bash
chmod +x scripts/setup-ssl.sh
./scripts/setup-ssl.sh your@email.com
```

**Примечание:** Email опциональный, но рекомендуется указать для получения уведомлений о сроке действия сертификата.

### Что делает скрипт

1. ⏸️  Останавливает текущий HTTP деплой (если работает)
2. 📁 Создает директории для certbot
3. 🌐 Запускает временный HTTP сервер для верификации домена
4. 🔐 Получает SSL сертификат от Let's Encrypt
5. ⚙️  Обновляет .env файл с HTTPS URL
6. 🔄 Перезапускает все сервисы с SSL конфигурацией

### Если скрипт завершился успешно

Сайт теперь доступен по адресу: **https://fibroadenoma.net**

HTTP автоматически перенаправляется на HTTPS.

---

## 📋 Ручная настройка (альтернатива)

Если автоматический скрипт не подходит:

### Шаг 1: Остановите текущий деплой

```bash
cd /opt/fb-net
docker compose -f docker-compose.production.yml down
```

### Шаг 2: Создайте директории

```bash
mkdir -p certbot/www certbot/conf
```

### Шаг 3: Временно запустите с HTTP конфигом

Создайте временный `docker-compose.http.yml`:

```yaml
services:
  postgres:
    image: postgres:15
    container_name: fb-net-db
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres-prod-data:/var/lib/postgresql/data
    networks:
      - fb-net-prod-network

  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: fb-net-app
    expose:
      - "3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://postgres:${POSTGRES_PASSWORD}@postgres:5432/postgres
    networks:
      - fb-net-prod-network

  nginx:
    image: nginx:alpine
    container_name: fb-net-nginx
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certbot/www:/var/www/certbot:ro
    networks:
      - fb-net-prod-network

volumes:
  postgres-prod-data:

networks:
  fb-net-prod-network:
```

Запустите:

```bash
docker compose -f docker-compose.http.yml up -d
```

### Шаг 4: Получите SSL сертификат

```bash
docker run --rm \
  -v $(pwd)/certbot/www:/var/www/certbot \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  --network fb-net-prod-network \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email your@email.com \
  --agree-tos \
  -d fibroadenoma.net
```

### Шаг 5: Обновите .env

```bash
nano .env
# Изменить: NEXT_PUBLIC_SITE_URL=https://fibroadenoma.net
```

### Шаг 6: Запустите с SSL

```bash
docker compose -f docker-compose.http.yml down
docker compose -f docker-compose.ssl.yml up -d --build
```

---

## ✅ Проверка работы

### Проверка сайта

```bash
# Проверка HTTPS
curl -I https://fibroadenoma.net

# Должен вернуть HTTP/2 200
```

### Проверка сертификата

```bash
# Статус контейнеров
docker compose -f docker-compose.ssl.yml ps

# Информация о сертификате
docker compose -f docker-compose.ssl.yml exec certbot certbot certificates

# Логи nginx
docker compose -f docker-compose.ssl.yml logs nginx --tail=50
```

### Проверка в браузере

Откройте https://fibroadenoma.net в браузере. Должен показать:
- ✅ Зелёный замок в адресной строке
- ✅ Сертификат от Let's Encrypt
- ✅ HTTP перенаправляется на HTTPS

---

## 🔄 Автоматическое обновление сертификата

Сертификаты Let's Encrypt действуют **90 дней**.

Контейнер `certbot` автоматически проверяет и обновляет сертификат **каждые 12 часов**.

### Ручное обновление (если нужно)

```bash
# Обновить сертификат
docker compose -f docker-compose.ssl.yml exec certbot certbot renew

# Перезагрузить nginx
docker compose -f docker-compose.ssl.yml exec nginx nginx -s reload
```

### Принудительное обновление

```bash
docker run --rm \
  -v $(pwd)/certbot/www:/var/www/certbot \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  certbot/certbot renew --force-renewal
```

---

## 🚀 Обновление кода с SSL

После настройки SSL используйте обычные скрипты деплоя:

### Быстрое обновление приложения

```powershell
# На локальной машине
.\scripts\commit-and-push.ps1
.\scripts\deploy-from-github.ps1 -AppOnly
```

**Важно:** Теперь используйте `docker-compose.ssl.yml` вместо `docker-compose.production.yml`

Скрипт `deploy-from-github.ps1` нужно будет обновить для использования SSL конфигурации. Или просто на сервере:

```bash
cd /opt/fb-net
git pull
docker compose -f docker-compose.ssl.yml up -d --build app
```

---

## 🔧 Устранение проблем

### Ошибка "Challenge failed"

**Причина:** DNS записи не обновились или домен не указывает на сервер.

```bash
# Проверьте DNS
nslookup fibroadenoma.net
dig fibroadenoma.net

# IP должен соответствовать вашему серверу
```

Подождите до 24 часов для распространения DNS.

### Ошибка "Connection refused"

**Причина:** Порты 80/443 закрыты.

```bash
# Откройте порты
sudo ufw allow 80
sudo ufw allow 443

# Проверьте
sudo netstat -tlnp | grep -E ':80|:443'
```

### Сертификат не обновляется

```bash
# Проверьте логи certbot
docker compose -f docker-compose.ssl.yml logs certbot

# Проверьте дату истечения
docker compose -f docker-compose.ssl.yml exec certbot certbot certificates
```

### Сайт недоступен после настройки

```bash
# Проверьте логи nginx
docker compose -f docker-compose.ssl.yml logs nginx

# Проверьте конфигурацию nginx
docker compose -f docker-compose.ssl.yml exec nginx nginx -t

# Перезапустите контейнеры
docker compose -f docker-compose.ssl.yml restart
```

### "502 Bad Gateway"

**Причина:** Приложение не запустилось.

```bash
# Проверьте логи приложения
docker compose -f docker-compose.ssl.yml logs app

# Перезапустите приложение
docker compose -f docker-compose.ssl.yml restart app
```

---

## 📁 Структура файлов

```
/opt/fb-net/
├── nginx/
│   ├── nginx.conf              # HTTP конфигурация (для получения сертификата)
│   └── nginx-ssl.conf          # HTTPS конфигурация (основная)
├── certbot/
│   ├── www/                    # Файлы для ACME challenge
│   └── conf/
│       └── live/
│           └── fibroadenoma.net/
│               ├── fullchain.pem    # SSL сертификат
│               └── privkey.pem      # Приватный ключ
├── docker-compose.production.yml    # HTTP деплой (старый)
├── docker-compose.ssl.yml          # HTTPS деплой (текущий)
├── scripts/
│   └── setup-ssl.sh               # Скрипт автоматической настройки
└── .env                           # Переменные окружения
```

---

## 📝 Полезные команды

```bash
# Проверить дату истечения сертификата
openssl s_client -connect fibroadenoma.net:443 2>/dev/null | openssl x509 -noout -dates

# Перезагрузить nginx без даунтайма
docker compose -f docker-compose.ssl.yml exec nginx nginx -s reload

# Просмотреть логи в реальном времени
docker compose -f docker-compose.ssl.yml logs -f

# Статус всех контейнеров
docker compose -f docker-compose.ssl.yml ps

# Перезапустить все сервисы
docker compose -f docker-compose.ssl.yml restart

# Остановить всё
docker compose -f docker-compose.ssl.yml down

# Запустить всё заново
docker compose -f docker-compose.ssl.yml up -d
```

---

## 🎯 Следующие шаги

После успешной настройки SSL:

1. ✅ Обновите все ссылки на сайт в документации на HTTPS
2. ✅ Обновите скрипты деплоя для использования `docker-compose.ssl.yml`
3. ✅ Настройте HSTS (раскомментируйте в nginx-ssl.conf после тестирования)
4. ✅ Обновите Telegram webhook на HTTPS (если используется)
5. ✅ Проверьте сайт на https://www.ssllabs.com/ssltest/

---

## 📞 Помощь

Если что-то не работает:
1. Проверьте DNS записи
2. Проверьте порты 80 и 443
3. Проверьте логи контейнеров
4. Попробуйте ручную настройку
5. Восстановите HTTP версию: `docker compose -f docker-compose.production.yml up -d`
