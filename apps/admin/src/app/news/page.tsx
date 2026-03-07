'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, CheckCircle, XCircle, Image as ImageIcon, Video, FileText, Search, RefreshCw, Merge } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { getCsrfToken } from '@/lib/csrf-client';

interface NewsItem {
  id: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  date: string;
  status: string;
  category?: string;
  tags?: string[];
  images?: string[];
  videos?: string[];
  documents?: string[];
  imageFocalPoint?: string;
}

import { NewsPlaceholder } from '@/components/NewsPlaceholder';

function toAdminSrc(src: string): string {
  if (src.startsWith('/') && !src.startsWith('/admin')) {
    return `/admin${src}`;
  }
  return src;
}

function AdminNewsImage({ src, alt, focalPoint }: { src: string, alt: string, focalPoint?: string }) {
  const [error, setError] = useState(false);

  if (error) {
     return <NewsPlaceholder />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={toAdminSrc(src)}
      alt={alt}
      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      style={{ objectPosition: focalPoint || 'center 30%' }}
      onError={() => setError(true)}
    />
  );
}

export default function AdminNewsList() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNewsIds, setSelectedNewsIds] = useState<Set<string>>(new Set());
  const [isMerging, setIsMerging] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    loadNews();
  }, []);

  const uniqueCategories = Array.from(new Set(news.map(item => item.category).filter(Boolean))) as string[];
  const uniqueYears = Array.from(new Set(news.map(item => {
      const parts = item.date.split('.');
      return parts.length === 3 ? parts[2] : null;
  }).filter(Boolean))).sort().reverse() as string[];

  const filteredNews = news.filter(item => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
          item.title.toLowerCase().includes(searchLower) || 
          (item.shortDescription && item.shortDescription.toLowerCase().includes(searchLower)) ||
          (item.fullDescription && item.fullDescription.toLowerCase().includes(searchLower)) ||
          item.tags?.some(tag => tag.toLowerCase().includes(searchLower));

      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;

      const year = item.date.split('.')[2];
      const matchesYear = selectedYear === 'all' || year === selectedYear;

      const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;

      return matchesSearch && matchesCategory && matchesYear && matchesStatus;
  });

  const loadNews = async () => {
    setLoading(true);
    setError(null);
    try {
      // includeAll=true - получить все новости, включая черновики (только для админов)
      const response = await fetch('/api/news?includeAll=true', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setNews(data);
        console.log(`[Admin News] Loaded ${data.length} news items`);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const errorMessage = errorData.error || errorData.details || `HTTP ${response.status}: ${response.statusText}`;
        const errorCode = errorData.code ? ` (код: ${errorData.code})` : '';
        console.error('[Admin News] API error:', errorMessage, errorData);
        setError(`${errorMessage}${errorCode}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      console.error('[Admin News] Error loading news:', error);
      setError(`Ошибка подключения: ${errorMessage}. Проверьте, что база данных запущена и настроена.`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту новость?')) return;

    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`/api/news/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'x-csrf-token': csrfToken }
      });

      if (response.ok) {
        loadNews();
      } else {
        alert('Ошибка удаления');
      }
    } catch (error) {
      console.error('Error deleting news:', error);
    }
  };

  const togglePublish = async (item: NewsItem) => {
    const newStatus = item.status === 'published' ? 'draft' : 'published';
    
    // Optimistic update
    setNews(news.map(n => n.id === item.id ? { ...n, status: newStatus } : n));

    try {
      // Need to fetch full item first because PUT replaces everything
      const itemResponse = await fetch(`/api/news/${item.id}`, { credentials: 'include' });
      
      if (itemResponse.ok) {
        const fullItem = await itemResponse.json();
        const csrfToken = await getCsrfToken();
        const response = await fetch(`/api/news/${item.id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
          body: JSON.stringify({
            ...fullItem,
            status: newStatus
          })
        });

        if (!response.ok) {
           // Revert
           loadNews();
           alert('Ошибка обновления статуса');
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
      loadNews();
    }
  };

  const handleToggleSelect = (newsId: string) => {
    const newSelected = new Set(selectedNewsIds);
    if (newSelected.has(newsId)) {
      newSelected.delete(newsId);
    } else {
      newSelected.add(newsId);
    }
    setSelectedNewsIds(newSelected);
  };

  const handleMerge = async () => {
    if (selectedNewsIds.size < 2) {
      alert('Выберите минимум 2 новости для объединения');
      return;
    }

    if (!confirm(`Вы уверены, что хотите объединить ${selectedNewsIds.size} новостей? Первая новость будет сохранена, остальные будут удалены.`)) {
      return;
    }

    setIsMerging(true);
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch('/api/news/merge', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({
          newsIds: Array.from(selectedNewsIds)
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Новости успешно объединены! Объединенная новость: ${result.mergedNewsId}`);
        setSelectedNewsIds(new Set());
        loadNews();
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        alert(`Ошибка объединения: ${errorData.error || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      console.error('Error merging news:', error);
      alert('Ошибка при объединении новостей');
    } finally {
      setIsMerging(false);
    }
  };

  if (loading) {
    return <div>Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[var(--frox-gray-1100)]">Новости</h1>
        <div className="flex gap-2">
          {selectedNewsIds.size >= 2 && (
            <Button 
              onClick={handleMerge} 
              disabled={isMerging}
              variant="default"
            >
              <Merge className="w-4 h-4 mr-2" />
              {isMerging ? 'Объединение...' : `Объединить (${selectedNewsIds.size})`}
            </Button>
          )}
          <Button asChild>
            <Link href="/news/create">
              <Plus className="w-4 h-4 mr-2" />
              Добавить новость
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-[var(--frox-neutral-border)] p-4 flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--frox-gray-400)] pointer-events-none" />
                <Input
                    placeholder="Поиск по заголовку, описанию, тегам..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
                <select
                    className="h-10 rounded-xl border border-[var(--frox-neutral-border)] bg-[var(--frox-gray-100)] px-3 py-2 text-sm text-[var(--frox-gray-800)] focus:outline-none focus:ring-2 focus:ring-[var(--frox-brand)]/40"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                >
                    <option value="all">Все категории</option>
                    {uniqueCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>

                <select
                    className="h-10 rounded-xl border border-[var(--frox-neutral-border)] bg-[var(--frox-gray-100)] px-3 py-2 text-sm text-[var(--frox-gray-800)] focus:outline-none focus:ring-2 focus:ring-[var(--frox-brand)]/40"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                >
                    <option value="all">Все годы</option>
                    {uniqueYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>

                <select
                    className="h-10 rounded-xl border border-[var(--frox-neutral-border)] bg-[var(--frox-gray-100)] px-3 py-2 text-sm text-[var(--frox-gray-800)] focus:outline-none focus:ring-2 focus:ring-[var(--frox-brand)]/40"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                >
                    <option value="all">Любой статус</option>
                    <option value="published">Опубликовано</option>
                    <option value="draft">Черновик</option>
                </select>

                <Button variant="outline" size="icon" onClick={loadNews} title="Обновить список">
                    <RefreshCw className="w-4 h-4" />
                </Button>
            </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="text-red-800 font-medium mb-2">Ошибка</div>
            <div className="text-red-600 text-sm mb-4">{error}</div>
            <div className="text-xs text-red-500 mb-2">Возможные причины:</div>
            <ul className="text-xs text-red-500 list-disc list-inside space-y-1 mb-4">
              <li>База данных не запущена (проверьте Docker контейнеры)</li>
              <li>Переменные окружения не настроены (создайте .env.local)</li>
              <li>Таблицы не созданы (выполните bun run setup)</li>
            </ul>
            <Button onClick={loadNews} variant="outline" size="sm">
              Попробовать снова
            </Button>
          </CardContent>
        </Card>
      )}

      {!error && filteredNews.length === 0 ? (
        <Card>
          <CardContent className="py-8">
             <div className="text-center text-[var(--frox-gray-500)]">
                {news.length > 0 ? 'Ничего не найдено по выбранным фильтрам' : 'Нет новостей'}
             </div>
          </CardContent>
        </Card>
      ) : !error ? (
        <div className="flex flex-col gap-1.5">
          {filteredNews.map((item) => (
            <div
              key={item.id}
              className={`group flex items-center gap-3 bg-white border border-[var(--frox-neutral-border)] rounded-xl px-3 py-2 hover:shadow-sm transition-all ${selectedNewsIds.has(item.id) ? 'ring-2 ring-blue-500' : ''}`}
            >
              {/* Checkbox */}
              <Checkbox
                checked={selectedNewsIds.has(item.id)}
                onChange={() => handleToggleSelect(item.id)}
                onClick={(e) => e.stopPropagation()}
              />

              {/* Thumbnail */}
              <div className="relative w-32 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-[var(--frox-gray-100)]">
                {item.images && item.images.length > 0 ? (
                  <AdminNewsImage
                    src={item.images[0]}
                    alt={item.title}
                    focalPoint={item.imageFocalPoint}
                  />
                ) : (
                  <NewsPlaceholder />
                )}
              </div>

              {/* Main content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs text-[var(--frox-gray-400)]">{item.date}</span>
                  {item.category && (
                    <Badge className="bg-teal-50 text-teal-700 hover:bg-teal-100 border-0 text-xs py-0 px-1.5 h-4">
                      {item.category}
                    </Badge>
                  )}
                  <Badge
                    variant={item.status === 'published' ? 'default' : 'secondary'}
                    className="text-xs py-0 px-1.5 h-4"
                  >
                    {item.status === 'published' ? 'Опубл.' : 'Черновик'}
                  </Badge>
                </div>
                <Link href={`/news/${item.id}`} className="block">
                  <h3 className="text-sm font-semibold text-[var(--frox-gray-1100)] line-clamp-1 group-hover:text-teal-600 transition-colors">
                    {item.title}
                  </h3>
                </Link>
                <p className="text-xs text-[var(--frox-gray-500)] line-clamp-1 mt-0.5">
                  {item.shortDescription || item.fullDescription}
                </p>
              </div>

              {/* Media counts */}
              <div className="flex gap-2 text-[var(--frox-gray-400)] flex-shrink-0">
                {item.images && item.images.length > 0 && (
                  <div className="flex items-center gap-0.5" title={`${item.images.length} фото`}>
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span className="text-xs">{item.images.length}</span>
                  </div>
                )}
                {item.videos && item.videos.length > 0 && (
                  <div className="flex items-center gap-0.5" title={`${item.videos.length} видео`}>
                    <Video className="w-3.5 h-3.5" />
                    <span className="text-xs">{item.videos.length}</span>
                  </div>
                )}
                {item.documents && item.documents.length > 0 && (
                  <div className="flex items-center gap-0.5" title={`${item.documents.length} документов`}>
                    <FileText className="w-3.5 h-3.5" />
                    <span className="text-xs">{item.documents.length}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-0.5 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => togglePublish(item)}
                  title={item.status === 'published' ? 'Снять с публикации' : 'Опубликовать'}
                  className="h-7 w-7 p-0"
                >
                  {item.status === 'published' ? (
                    <XCircle className="w-4 h-4 text-orange-500" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                </Button>
                <Button variant="ghost" size="sm" asChild className="h-7 w-7 p-0">
                  <Link href={`/news/${item.id}`}>
                    <Pencil className="w-4 h-4" />
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="h-7 w-7 p-0">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
