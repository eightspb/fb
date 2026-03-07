'use client';

// Патчим глобальный fetch чтобы автоматически добавлять basePath (/admin)
// к относительным URL-ам вида /api/...
// Это нужно потому что Next.js с basePath не добавляет prefix к fetch автоматически.
// Выполняем патч сразу при импорте модуля (не в useEffect) чтобы успеть до первых запросов.
if (typeof window !== 'undefined') {
  // Определяем basePath по assets путям в DOM или из переменной окружения
  const getBase = () => {
    const link = document.querySelector('link[href*="/_next/"]');
    if (link) {
      const href = link.getAttribute('href') ?? '';
      const match = href.match(/^(.*)\/_next\//);
      return match ? match[1] : '';
    }
    return '';
  };

  const base = getBase() || '/admin';
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init?) => {
    if (typeof input === 'string' && input.startsWith('/') && !input.startsWith(base)) {
      input = `${base}${input}`;
    }
    return originalFetch(input, init);
  };
}

export function FetchBasePatch() {
  return null;
}
