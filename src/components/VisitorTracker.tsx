'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';

// Генерация UUID (fallback для HTTP)
function generateUUID(): string {
  // Используем crypto.randomUUID если доступен (HTTPS)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  
  // Fallback для HTTP или старых браузеров
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Генерация или получение session ID
function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  
  let sessionId = localStorage.getItem('visitor_session_id');
  
  if (!sessionId) {
    sessionId = generateUUID();
    localStorage.setItem('visitor_session_id', sessionId);
  }
  
  return sessionId;
}

// Получение UTM параметров из URL
function getUtmParams(): { utmSource?: string; utmMedium?: string; utmCampaign?: string } {
  if (typeof window === 'undefined') return {};
  
  const params = new URLSearchParams(window.location.search);
  
  return {
    utmSource: params.get('utm_source') || undefined,
    utmMedium: params.get('utm_medium') || undefined,
    utmCampaign: params.get('utm_campaign') || undefined,
  };
}

// Отправка данных на сервер
async function sendTrackingData(data: {
  sessionId: string;
  pagePath: string;
  pageTitle?: string;
  referrer?: string;
  screenWidth?: number;
  screenHeight?: number;
  language?: string;
  timezone?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  type: 'pageview' | 'heartbeat' | 'leave';
  timeOnPage?: number;
}) {
  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      keepalive: true, // Важно для отправки при закрытии страницы
    });
  } catch (error) {
    // Тихо игнорируем ошибки трекинга
    console.debug('[Tracker] Error:', error);
  }
}

export default function VisitorTracker() {
  const pathname = usePathname();
  const pageStartTime = useRef<number>(Date.now());
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const lastPathname = useRef<string>('');

  // Отправка просмотра страницы
  const trackPageView = useCallback(() => {
    const sessionId = getSessionId();
    if (!sessionId) return;

    const utmParams = getUtmParams();
    
    sendTrackingData({
      sessionId,
      pagePath: pathname,
      pageTitle: document.title,
      referrer: document.referrer,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      ...utmParams,
      type: 'pageview',
    });

    pageStartTime.current = Date.now();
  }, [pathname]);

  // Отправка heartbeat
  const sendHeartbeat = useCallback(() => {
    const sessionId = getSessionId();
    if (!sessionId) return;

    sendTrackingData({
      sessionId,
      pagePath: pathname,
      pageTitle: document.title,
      type: 'heartbeat',
    });
  }, [pathname]);

  // Отправка при уходе со страницы
  const trackLeave = useCallback(() => {
    const sessionId = getSessionId();
    if (!sessionId) return;

    const timeOnPage = Math.round((Date.now() - pageStartTime.current) / 1000);

    sendTrackingData({
      sessionId,
      pagePath: lastPathname.current || pathname,
      type: 'leave',
      timeOnPage,
    });
  }, [pathname]);

  useEffect(() => {
    // Пропускаем админ панель
    if (pathname.startsWith('/admin')) {
      return;
    }

    // Отслеживаем только если страница изменилась
    if (pathname !== lastPathname.current) {
      // Отправляем leave для предыдущей страницы
      if (lastPathname.current) {
        trackLeave();
      }

      lastPathname.current = pathname;
      trackPageView();
    }

    // Запускаем heartbeat каждые 30 секунд
    heartbeatInterval.current = setInterval(sendHeartbeat, 30000);

    // Обработка закрытия/перехода
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        trackLeave();
      }
    };

    const handleBeforeUnload = () => {
      trackLeave();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [pathname, trackPageView, sendHeartbeat, trackLeave]);

  // Компонент не рендерит UI
  return null;
}
