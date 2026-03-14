# DEPRECATED: legacy PowerShell entrypoint for Windows users.
# Основной поддерживаемый вариант: bash scripts/clear-all-caches.sh
# Этот файл оставлен в репозитории для обратной совместимости и не считается основным путём запуска.
#
# Скрипт для полной очистки всех кешей проекта
# Использование: .\scripts\clear-all-caches.ps1
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "🧹 Начинаю очистку всех кешей..." -ForegroundColor Cyan
Write-Host ""

# 1. Очистка Next.js кеша
Write-Host "1️⃣ Очистка Next.js кеша (.next)..." -ForegroundColor Yellow
if (Test-Path .next) {
    Remove-Item -Recurse -Force .next
    Write-Host "   ✅ .next удален" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  .next не найден" -ForegroundColor Gray
}

# 2. Очистка кеша Next.js турбо
Write-Host "2️⃣ Очистка кеша Turbopack..." -ForegroundColor Yellow
if (Test-Path .turbo) {
    Remove-Item -Recurse -Force .turbo
    Write-Host "   ✅ .turbo удален" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  .turbo не найден" -ForegroundColor Gray
}

# 3. Очистка node_modules (опционально, закомментировано по умолчанию)
Write-Host "3️⃣ Проверка node_modules..." -ForegroundColor Yellow
if (Test-Path node_modules) {
    Write-Host "   ⚠️  node_modules найден (не удаляется автоматически)" -ForegroundColor Yellow
    Write-Host "   💡 Для удаления раскомментируйте соответствующие строки в скрипте" -ForegroundColor Gray
    # Раскомментируйте следующие строки, если хотите удалить node_modules:
    # Remove-Item -Recurse -Force node_modules
    # Write-Host "   ✅ node_modules удален" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  node_modules не найден" -ForegroundColor Gray
}

# 4. Очистка bun кеша (если установлен)
Write-Host "4️⃣ Очистка bun кеша..." -ForegroundColor Yellow
try {
    bun pm cache rm 2>&1 | Out-Null
    Write-Host "   ✅ bun кеш очищен" -ForegroundColor Green
} catch {
    Write-Host "   ℹ️  bun не установлен или кеш уже пуст" -ForegroundColor Gray
}

# 5. Очистка Docker кешей (если Docker запущен)
Write-Host "5️⃣ Очистка Docker кешей..." -ForegroundColor Yellow
try {
    $dockerRunning = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   🐳 Docker обнаружен, очищаю кеши..." -ForegroundColor Cyan
        
        # Остановка контейнеров проекта (если запущены)
        Write-Host "   ⏸️  Остановка контейнеров проекта..." -ForegroundColor Gray
        docker-compose down 2>&1 | Out-Null
        
        # Удаление неиспользуемых образов
        Write-Host "   🗑️  Удаление неиспользуемых образов..." -ForegroundColor Gray
        docker image prune -f 2>&1 | Out-Null
        
        # Удаление неиспользуемых контейнеров
        Write-Host "   🗑️  Удаление неиспользуемых контейнеров..." -ForegroundColor Gray
        docker container prune -f 2>&1 | Out-Null
        
        # Удаление неиспользуемых томов
        Write-Host "   🗑️  Удаление неиспользуемых томов..." -ForegroundColor Gray
        docker volume prune -f 2>&1 | Out-Null
        
        # Очистка build кеша
        Write-Host "   🗑️  Очистка build кеша..." -ForegroundColor Gray
        docker builder prune -f 2>&1 | Out-Null
        
        Write-Host "   ✅ Docker кеши очищены" -ForegroundColor Green
    } else {
        Write-Host "   ℹ️  Docker не запущен или недоступен" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ℹ️  Docker не установлен или недоступен" -ForegroundColor Gray
}

# 6. Очистка временных файлов TypeScript
Write-Host "6️⃣ Очистка временных файлов TypeScript..." -ForegroundColor Yellow
$tsBuildInfoFiles = Get-ChildItem -Path . -Filter "*.tsbuildinfo" -Recurse -ErrorAction SilentlyContinue
if ($tsBuildInfoFiles) {
    $tsBuildInfoFiles | Remove-Item -Force
    Write-Host "   ✅ TypeScript build info файлы удалены" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  TypeScript build info файлы не найдены" -ForegroundColor Gray
}

# 7. Очистка кеша ESLint
Write-Host "7️⃣ Очистка кеша ESLint..." -ForegroundColor Yellow
if (Test-Path .eslintcache) {
    Remove-Item -Force .eslintcache
    Write-Host "   ✅ .eslintcache удален" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  .eslintcache не найден" -ForegroundColor Gray
}

# 8. Очистка кеша Vercel (если используется)
Write-Host "8️⃣ Очистка кеша Vercel..." -ForegroundColor Yellow
if (Test-Path .vercel) {
    Remove-Item -Recurse -Force .vercel
    Write-Host "   ✅ .vercel удален" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  .vercel не найден" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✨ Очистка завершена!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Дополнительные действия:" -ForegroundColor Cyan
Write-Host "   • Для очистки кеша браузера: Ctrl+Shift+Delete или Ctrl+F5" -ForegroundColor White
Write-Host "   • Для очистки Open Graph кеша в соцсетях:" -ForegroundColor White
Write-Host "     - Facebook: https://developers.facebook.com/tools/debug/" -ForegroundColor White
Write-Host "     - Twitter: https://cards-dev.twitter.com/validator" -ForegroundColor White
Write-Host "     - LinkedIn: https://www.linkedin.com/post-inspector/" -ForegroundColor White
Write-Host ""
Write-Host "💡 Для пересборки проекта выполните: bun run build" -ForegroundColor Yellow
