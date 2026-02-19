'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { SiteBanner } from '@/lib/types/banner';

/**
 * Простая hash функция для создания уникального ID баннера
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export default function AnnouncementBanner() {
  const [banner, setBanner] = useState<SiteBanner | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadBanner();
  }, []);

  // Обновляем CSS переменную с высотой баннера
  useEffect(() => {
    if (isVisible && bannerRef.current) {
      const height = bannerRef.current.offsetHeight;
      document.documentElement.style.setProperty('--banner-height', `${height}px`);
    } else {
      document.documentElement.style.setProperty('--banner-height', '0px');
    }
  }, [isVisible, banner]);

  const loadBanner = async () => {
    try {
      const response = await fetch('/api/banner');
      const data = await response.json();

      if (data.enabled && data.banner) {
        const bannerHash = simpleHash(data.banner.message);
        const dismissedKey = `dismissed-banner-${bannerHash}`;
        
        // Проверяем, не был ли баннер закрыт пользователем
        const isDismissed = localStorage.getItem(dismissedKey);
        
        if (!isDismissed) {
          setBanner(data.banner);
          setIsVisible(true);
        }
      }
    } catch (error) {
      console.error('Failed to load banner:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    if (!banner) return;

    const bannerHash = simpleHash(banner.message);
    const dismissedKey = `dismissed-banner-${bannerHash}`;
    
    // Сохраняем в localStorage с timestamp
    localStorage.setItem(dismissedKey, Date.now().toString());
    
    // Скрываем баннер с анимацией
    setIsVisible(false);
  };

  // Не рендерим ничего во время загрузки или если баннер не должен отображаться
  if (isLoading || !banner || !isVisible) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={bannerRef}
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 right-0 z-[110] w-full"
          style={{
            backgroundColor: banner.bg_color,
            color: banner.text_color,
            fontSize: banner.font_size,
            fontWeight: banner.font_weight === 'bold' ? 700 : banner.font_weight === 'medium' ? 500 : 400,
          }}
        >
          <div className="relative w-full overflow-hidden">
            {/* Static режим */}
            {banner.style === 'static' && (
              <div className="flex items-center justify-center py-3 px-4 pr-12">
                <p className="text-center">{banner.message}</p>
              </div>
            )}

            {/* Marquee режим */}
            {banner.style === 'marquee' && (
              <div className="py-3 px-4 pr-12">
                <div className="marquee-container">
                  <div className="marquee-content">
                    <span className="marquee-text">{banner.message}</span>
                    <span className="marquee-text">{banner.message}</span>
                    <span className="marquee-text">{banner.message}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Кнопка закрытия */}
            {banner.dismissible && (
              <button
                onClick={handleDismiss}
                className="absolute top-1/2 right-2 -translate-y-1/2 p-1 rounded-full hover:bg-black/10 transition-colors"
                aria-label="Закрыть баннер"
                style={{ color: banner.text_color }}
              >
                <X size={20} />
              </button>
            )}
          </div>

          <style jsx>{`
            .marquee-container {
              overflow: hidden;
              white-space: nowrap;
            }

            .marquee-content {
              display: inline-block;
              animation: marquee 30s linear infinite;
            }

            .marquee-text {
              display: inline-block;
              padding-right: 4rem;
            }

            @keyframes marquee {
              0% {
                transform: translateX(0);
              }
              100% {
                transform: translateX(-33.333%);
              }
            }

            @media (max-width: 768px) {
              .marquee-content {
                animation-duration: 20s;
              }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
