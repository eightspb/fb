#!/bin/bash

# Скрипт для полной очистки всех кешей на сервере
# Использование: ./scripts/clear-server-caches.sh [--rebuild]

set -e  # Прерывать при ошибках

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Флаг для пересборки
REBUILD=false
if [[ "$1" == "--rebuild" ]]; then
    REBUILD=true
fi

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         ОЧИСТКА КЕШЕЙ НА СЕРВЕРЕ                              ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Определяем какой docker-compose файл использовать
COMPOSE_FILE="docker-compose.production.yml"
if [ -f "docker-compose.ssl.yml" ]; then
    # Проверяем, используется ли SSL конфигурация
    if docker ps --format '{{.Names}}' | grep -q "fb-net-nginx"; then
        COMPOSE_FILE="docker-compose.ssl.yml"
        echo -e "${YELLOW}📋 Обнаружена SSL конфигурация, используем docker-compose.ssl.yml${NC}"
    fi
fi

echo -e "${CYAN}Используется: ${COMPOSE_FILE}${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════════
# 1. ОСТАНОВКА КОНТЕЙНЕРОВ
# ═══════════════════════════════════════════════════════════════════

echo -e "${YELLOW}1️⃣  Остановка контейнеров...${NC}"
if docker ps --format '{{.Names}}' | grep -q "fb-net"; then
    docker-compose -f $COMPOSE_FILE down
    echo -e "${GREEN}   ✅ Контейнеры остановлены${NC}"
else
    echo -e "${CYAN}   ℹ️  Контейнеры не запущены${NC}"
fi
echo ""

# ═══════════════════════════════════════════════════════════════════
# 2. ОЧИСТКА DOCKER КЕШЕЙ
# ═══════════════════════════════════════════════════════════════════

echo -e "${YELLOW}2️⃣  Очистка Docker кешей...${NC}"

# Удаление неиспользуемых образов
echo -e "${CYAN}   🗑️  Удаление неиспользуемых образов...${NC}"
docker image prune -a -f 2>/dev/null || echo -e "${CYAN}   ⚠️  Не удалось очистить образы${NC}"

# Удаление остановленных контейнеров
echo -e "${CYAN}   🗑️  Удаление остановленных контейнеров...${NC}"
docker container prune -f 2>/dev/null || echo -e "${CYAN}   ⚠️  Не удалось очистить контейнеры${NC}"

# Удаление неиспользуемых томов (осторожно!)
echo -e "${CYAN}   🗑️  Удаление неиспользуемых томов...${NC}"
echo -e "${YELLOW}   ⚠️  ВНИМАНИЕ: Это удалит только неиспользуемые тома!${NC}"
docker volume prune -f 2>/dev/null || echo -e "${CYAN}   ⚠️  Не удалось очистить тома${NC}"

# Очистка build кеша
echo -e "${CYAN}   🗑️  Очистка Docker build кеша...${NC}"
docker builder prune -a -f 2>/dev/null || echo -e "${CYAN}   ⚠️  Не удалось очистить build кеш${NC}"

# Полная очистка системы (опционально, закомментировано)
# echo -e "${CYAN}   🗑️  Полная очистка Docker системы...${NC}"
# docker system prune -a --volumes -f

echo -e "${GREEN}   ✅ Docker кеши очищены${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════════
# 3. ОЧИСТКА NGINX КЕШЕЙ
# ═══════════════════════════════════════════════════════════════════

echo -e "${YELLOW}3️⃣  Очистка nginx кешей...${NC}"
if docker ps -a --format '{{.Names}}' | grep -q "fb-net-nginx"; then
    # Очистка кеша nginx внутри контейнера
    docker exec fb-net-nginx rm -rf /var/cache/nginx/* 2>/dev/null || true
    docker exec fb-net-nginx nginx -s reload 2>/dev/null || true
    echo -e "${GREEN}   ✅ nginx кеши очищены${NC}"
else
    echo -e "${CYAN}   ℹ️  nginx контейнер не найден${NC}"
fi
echo ""

# ═══════════════════════════════════════════════════════════════════
# 4. ОЧИСТКА NEXT.JS КЕШЕЙ В КОНТЕЙНЕРЕ
# ═══════════════════════════════════════════════════════════════════

echo -e "${YELLOW}4️⃣  Очистка Next.js кешей...${NC}"
if docker ps -a --format '{{.Names}}' | grep -q "fb-net-app"; then
    # Удаляем .next папку внутри контейнера (если она есть)
    docker exec fb-net-app rm -rf /app/.next 2>/dev/null || true
    docker exec fb-net-app rm -rf /app/.turbo 2>/dev/null || true
    echo -e "${GREEN}   ✅ Next.js кеши очищены${NC}"
else
    echo -e "${CYAN}   ℹ️  app контейнер не найден (будет очищен при пересборке)${NC}"
fi
echo ""

# ═══════════════════════════════════════════════════════════════════
# 5. ОЧИСТКА ЛОКАЛЬНЫХ КЕШЕЙ (если запущено не в Docker)
# ═══════════════════════════════════════════════════════════════════

echo -e "${YELLOW}5️⃣  Очистка локальных кешей проекта...${NC}"
if [ -d ".next" ]; then
    rm -rf .next
    echo -e "${GREEN}   ✅ .next удален${NC}"
fi

if [ -d ".turbo" ]; then
    rm -rf .turbo
    echo -e "${GREEN}   ✅ .turbo удален${NC}"
fi

if [ -f ".eslintcache" ]; then
    rm -f .eslintcache
    echo -e "${GREEN}   ✅ .eslintcache удален${NC}"
fi

if [ -d ".vercel" ]; then
    rm -rf .vercel
    echo -e "${GREEN}   ✅ .vercel удален${NC}"
fi

# Удаление TypeScript build info файлов
find . -name "*.tsbuildinfo" -type f -delete 2>/dev/null && echo -e "${GREEN}   ✅ TypeScript build info файлы удалены${NC}" || true

echo ""

# ═══════════════════════════════════════════════════════════════════
# 6. ПЕРЕСБОРКА И ЗАПУСК (если указан флаг --rebuild)
# ═══════════════════════════════════════════════════════════════════

if [ "$REBUILD" = true ]; then
    echo -e "${YELLOW}6️⃣  Пересборка и запуск контейнеров...${NC}"
    
    # Пересборка без кеша
    echo -e "${CYAN}   🔨 Пересборка образов (без кеша)...${NC}"
    docker-compose -f $COMPOSE_FILE build --no-cache
    
    # Запуск
    echo -e "${CYAN}   🚀 Запуск контейнеров...${NC}"
    docker-compose -f $COMPOSE_FILE up -d
    
    # Ждем запуска
    echo -e "${CYAN}   ⏳ Ожидание запуска сервисов...${NC}"
    sleep 5
    
    # Проверка статуса
    echo -e "${CYAN}   📊 Статус контейнеров:${NC}"
    docker-compose -f $COMPOSE_FILE ps
    
    echo -e "${GREEN}   ✅ Контейнеры пересобраны и запущены${NC}"
else
    echo -e "${CYAN}6️⃣  Пересборка пропущена (используйте --rebuild для пересборки)${NC}"
fi

echo ""

# ═══════════════════════════════════════════════════════════════════
# ИТОГИ
# ═══════════════════════════════════════════════════════════════════

echo -e "${GREEN}✨ Очистка завершена!${NC}"
echo ""
echo -e "${CYAN}📝 Дополнительные действия:${NC}"
echo -e "   • Для пересборки и запуска: ${YELLOW}./scripts/clear-server-caches.sh --rebuild${NC}"
echo -e "   • Для очистки Open Graph кеша в соцсетях:${NC}"
echo -e "     - Facebook: ${CYAN}https://developers.facebook.com/tools/debug/${NC}"
echo -e "     - Twitter: ${CYAN}https://cards-dev.twitter.com/validator${NC}"
echo -e "     - LinkedIn: ${CYAN}https://www.linkedin.com/post-inspector/${NC}"
echo ""
echo -e "${YELLOW}💡 Для проверки логов: docker-compose -f $COMPOSE_FILE logs -f${NC}"
echo ""
