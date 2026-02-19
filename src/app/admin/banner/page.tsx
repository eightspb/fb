'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, Loader2, Eye, Bell } from 'lucide-react';
import type { SiteBanner } from '@/lib/types/banner';

export default function BannerPage() {
  const [banner, setBanner] = useState<SiteBanner | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadBanner();
  }, []);

  const loadBanner = async () => {
    try {
      const response = await fetch('/api/admin/banner', {
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || 'Ошибка загрузки баннера';
        if (errorMessage.includes('не найдена') || errorMessage.includes('миграцию')) {
          alert(`⚠️ ${errorMessage}\n\nПримените миграцию:\nmigrations/007_add_site_banner.sql`);
        } else {
          throw new Error(errorMessage);
        }
        setLoading(false);
        return;
      }

      if (data.banner) {
        setBanner(data.banner);
      }
    } catch (error: any) {
      console.error('Ошибка загрузки баннера:', error);
      alert('Ошибка загрузки баннера: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  const saveBanner = async () => {
    if (!banner) {
      alert('Данные баннера не загружены');
      return;
    }

    // Валидация
    if (!banner.message.trim()) {
      alert('Текст сообщения обязателен для заполнения');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/banner', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          enabled: banner.enabled,
          message: banner.message,
          style: banner.style,
          bg_color: banner.bg_color,
          text_color: banner.text_color,
          font_size: banner.font_size,
          font_weight: banner.font_weight,
          dismissible: banner.dismissible,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Неизвестная ошибка' }));
        const errorMessage = errorData.error || errorData.details || `HTTP ${response.status}: ${response.statusText}`;

        if (errorMessage.includes('не найдена') || errorMessage.includes('миграцию')) {
          alert(`⚠️ ${errorMessage}\n\nПримените миграцию:\nmigrations/007_add_site_banner.sql`);
          return;
        }

        throw new Error(errorMessage);
      }

      const result = await response.json();
      alert('Баннер успешно сохранен');

      if (result.banner) {
        setBanner(result.banner);
      }
    } catch (error: any) {
      console.error('Ошибка сохранения баннера:', error);
      const errorMessage = error.message || 'Неизвестная ошибка';
      alert(`Ошибка сохранения баннера: ${errorMessage}\n\nПроверьте консоль браузера для деталей.`);
    } finally {
      setSaving(false);
    }
  };

  const updateBanner = (field: keyof SiteBanner, value: any) => {
    if (!banner) return;
    setBanner({ ...banner, [field]: value });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!banner) {
    return (
      <div className="text-center py-8 text-slate-500">
        <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Баннер не найден. Примените миграцию базы данных.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Информационный баннер</h1>
        <p className="text-slate-600 mt-2">Управление баннером в верхней части сайта</p>
      </div>

      {/* Preview */}
      {showPreview && (
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Предпросмотр
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="relative w-full overflow-hidden rounded-lg"
              style={{
                backgroundColor: banner.bg_color,
                color: banner.text_color,
                fontSize: banner.font_size,
                fontWeight: banner.font_weight === 'bold' ? 700 : banner.font_weight === 'medium' ? 500 : 400,
              }}
            >
              {banner.style === 'static' && (
                <div className="py-3 px-4 text-center">
                  <p>{banner.message}</p>
                </div>
              )}

              {banner.style === 'marquee' && (
                <div className="py-3 px-4">
                  <div className="overflow-hidden whitespace-nowrap">
                    <div className="inline-block animate-marquee">
                      <span className="inline-block pr-16">{banner.message}</span>
                      <span className="inline-block pr-16">{banner.message}</span>
                      <span className="inline-block pr-16">{banner.message}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Настройки баннера</CardTitle>
          <CardDescription>
            Настройте внешний вид и поведение информационного баннера
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Включить/выключить */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enabled"
              checked={banner.enabled}
              onCheckedChange={(checked) => updateBanner('enabled', checked)}
            />
            <Label htmlFor="enabled" className="text-base font-medium cursor-pointer">
              Включить баннер на сайте
            </Label>
          </div>

          {/* Текст сообщения */}
          <div className="space-y-2">
            <Label htmlFor="message">Текст сообщения</Label>
            <Textarea
              id="message"
              value={banner.message}
              onChange={(e) => updateBanner('message', e.target.value)}
              placeholder="Введите текст для отображения в баннере..."
              className="min-h-[100px]"
            />
          </div>

          {/* Стиль отображения */}
          <div className="space-y-2">
            <Label htmlFor="style">Стиль отображения</Label>
            <select
              id="style"
              value={banner.style}
              onChange={(e) => updateBanner('style', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              <option value="static">Статичный текст</option>
              <option value="marquee">Бегущая строка</option>
            </select>
          </div>

          {/* Цвета */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bg_color">Цвет фона</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="bg_color"
                  value={banner.bg_color}
                  onChange={(e) => updateBanner('bg_color', e.target.value)}
                  className="h-10 w-20 rounded border border-slate-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={banner.bg_color}
                  onChange={(e) => updateBanner('bg_color', e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="#3b82f6"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="text_color">Цвет текста</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="text_color"
                  value={banner.text_color}
                  onChange={(e) => updateBanner('text_color', e.target.value)}
                  className="h-10 w-20 rounded border border-slate-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={banner.text_color}
                  onChange={(e) => updateBanner('text_color', e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="#ffffff"
                />
              </div>
            </div>
          </div>

          {/* Размер и толщина шрифта */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="font_size">Размер шрифта</Label>
              <select
                id="font_size"
                value={banner.font_size}
                onChange={(e) => updateBanner('font_size', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                <option value="12px">12px (Маленький)</option>
                <option value="14px">14px (Обычный)</option>
                <option value="16px">16px (Средний)</option>
                <option value="18px">18px (Большой)</option>
                <option value="20px">20px (Очень большой)</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="font_weight">Толщина шрифта</Label>
              <select
                id="font_weight"
                value={banner.font_weight}
                onChange={(e) => updateBanner('font_weight', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                <option value="normal">Normal (400)</option>
                <option value="medium">Medium (500)</option>
                <option value="bold">Bold (700)</option>
              </select>
            </div>
          </div>

          {/* Разрешить закрытие */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="dismissible"
              checked={banner.dismissible}
              onCheckedChange={(checked) => updateBanner('dismissible', checked)}
            />
            <Label htmlFor="dismissible" className="cursor-pointer">
              Разрешить пользователям закрывать баннер
            </Label>
          </div>

          {/* Кнопки действий */}
          <div className="flex gap-3 pt-4">
            <Button onClick={saveBanner} disabled={saving} className="flex-1">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Сохранить настройки
                </>
              )}
            </Button>

            <Button
              onClick={() => setShowPreview(!showPreview)}
              variant="outline"
              type="button"
            >
              <Eye className="w-4 h-4 mr-2" />
              {showPreview ? 'Скрыть' : 'Показать'} предпросмотр
            </Button>
          </div>
        </CardContent>
      </Card>

      <style jsx global>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }

        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
}
