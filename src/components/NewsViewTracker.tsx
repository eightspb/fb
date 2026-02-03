'use client';

import { useEffect, useState } from 'react';
import { getCsrfToken } from '@/lib/csrf-client';

interface NewsViewTrackerProps {
  newsId: string;
}

export function NewsViewTracker({ newsId }: NewsViewTrackerProps) {
  const [viewCount, setViewCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Загружаем текущую статистику просмотров сразу
    async function loadViewStats() {
      try {
        const response = await fetch(`/api/news/${newsId}/view`, {
          cache: 'no-store'
        });
        if (response.ok) {
          const data = await response.json();
          setViewCount(data.uniqueVisitors || 0);
        }
      } catch (error) {
        console.error('Failed to load view stats:', error);
        setViewCount(0); // Показываем 0 в случае ошибки
      } finally {
        setIsLoading(false);
      }
    }

    // Регистрируем просмотр (отложенно, чтобы не блокировать рендер)
    async function trackView() {
      // Небольшая задержка для того, чтобы пользователь действительно просматривал страницу
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        const csrfToken = await getCsrfToken();
        const response = await fetch(`/api/news/${newsId}/view`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.stats) {
            setViewCount(data.stats.uniqueVisitors);
          }
        }
      } catch (error) {
        console.error('Failed to track view:', error);
      }
    }

    loadViewStats();
    trackView();
  }, [newsId]);

  // Показываем счетчик даже во время загрузки (показываем текущее значение)
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="16" 
        height="16" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        className="text-gray-500"
      >
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
      <span className="font-medium">{isLoading ? '...' : (viewCount || 0)}</span>
    </span>
  );
}

