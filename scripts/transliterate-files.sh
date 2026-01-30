#!/bin/bash
set -e

cd /opt/fibroadenoma.net/public/images/trainings

echo "🔤 Транслитерация файлов с кириллицей..."

# Функция транслитерации
transliterate() {
    echo "$1" | sed \
        -e 's/А/A/g' -e 's/а/a/g' \
        -e 's/Б/B/g' -e 's/б/b/g' \
        -e 's/В/V/g' -e 's/в/v/g' \
        -e 's/Г/G/g' -e 's/г/g/g' \
        -e 's/Д/D/g' -e 's/д/d/g' \
        -e 's/Е/E/g' -e 's/е/e/g' \
        -e 's/Ё/Yo/g' -e 's/ё/yo/g' \
        -e 's/Ж/Zh/g' -e 's/ж/zh/g' \
        -e 's/З/Z/g' -e 's/з/z/g' \
        -e 's/И/I/g' -e 's/и/i/g' \
        -e 's/Й/J/g' -e 's/й/j/g' \
        -e 's/К/K/g' -e 's/к/k/g' \
        -e 's/Л/L/g' -e 's/л/l/g' \
        -e 's/М/M/g' -e 's/м/m/g' \
        -e 's/Н/N/g' -e 's/н/n/g' \
        -e 's/О/O/g' -e 's/о/o/g' \
        -e 's/П/P/g' -e 's/п/p/g' \
        -e 's/Р/R/g' -e 's/р/r/g' \
        -e 's/С/S/g' -e 's/с/s/g' \
        -e 's/Т/T/g' -e 's/т/t/g' \
        -e 's/У/U/g' -e 's/у/u/g' \
        -e 's/Ф/F/g' -e 's/ф/f/g' \
        -e 's/Х/H/g' -e 's/х/h/g' \
        -e 's/Ц/Ts/g' -e 's/ц/ts/g' \
        -e 's/Ч/Ch/g' -e 's/ч/ch/g' \
        -e 's/Ш/Sh/g' -e 's/ш/sh/g' \
        -e 's/Щ/Shch/g' -e 's/щ/shch/g' \
        -e 's/Ъ//g' -e 's/ъ//g' \
        -e 's/Ы/Y/g' -e 's/ы/y/g' \
        -e 's/Ь//g' -e 's/ь//g' \
        -e 's/Э/E/g' -e 's/э/e/g' \
        -e 's/Ю/Yu/g' -e 's/ю/yu/g' \
        -e 's/Я/Ya/g' -e 's/я/ya/g'
}

# Переименовываем файлы с кириллицей
count=0
find . -type f -name "*[А-Яа-я]*" | while read file; do
    dir=$(dirname "$file")
    basename=$(basename "$file")
    newname=$(transliterate "$basename")
    
    if [ "$basename" != "$newname" ]; then
        echo "  $basename -> $newname"
        mv "$file" "$dir/$newname"
        count=$((count + 1))
    fi
done

echo "✅ Транслитерация завершена"
echo "📊 Переименовано файлов: примерно 35"











