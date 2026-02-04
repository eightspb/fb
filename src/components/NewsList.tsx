'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NewsItem } from '@/lib/news-data';
import { ImageIcon, Video, FileText, X, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { NewsPlaceholder } from '@/components/NewsPlaceholder';

interface NewsListProps {
  initialYear?: string;
  initialCategory?: string;
}

export function NewsList({ initialYear, initialCategory }: NewsListProps) {
  const [selectedYear, setSelectedYear] = useState<string | null>(initialYear || null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory || null);
  const [currentPage, setCurrentPage] = useState(1);
  const [newsData, setNewsData] = useState<NewsItem[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [tagsWithCounts, setTagsWithCounts] = useState<Array<{ filter: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const itemsPerPage = 9;
  const debugLog = (message: string, data: Record<string, unknown>, hypothesisId: string) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/92421fa6-390c-44f6-b364-97de3045a7b0', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'year-filter',
        hypothesisId,
        location: 'src/components/NewsList.tsx',
        message,
        data,
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion
  };

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    async function loadData() {
      try {
        // Пытаемся загрузить через API route (прямое подключение к PostgreSQL)
        const [newsResponse, yearsResponse, filtersResponse] = await Promise.all([
          fetch('/api/news'),
          fetch('/api/news/years'),
          fetch('/api/news/filters')
        ]);

        console.log('[NewsList] API responses:', {
          news: { ok: newsResponse.ok, status: newsResponse.status },
          years: { ok: yearsResponse.ok, status: yearsResponse.status },
          filters: { ok: filtersResponse.ok, status: filtersResponse.status }
        });

        if (!newsResponse.ok) {
          const errorText = await newsResponse.text();
          console.error('[NewsList] News API error:', newsResponse.status, errorText);
          throw new Error(`News API failed: ${newsResponse.status} - ${errorText}`);
        }

        if (!yearsResponse.ok) {
          console.warn('[NewsList] Years API failed:', yearsResponse.status);
        }

        if (!filtersResponse.ok) {
          console.warn('[NewsList] Filters API failed:', filtersResponse.status);
        }

        const newsItems: NewsItem[] = await newsResponse.json();
        const yearsData: Array<string | number> = yearsResponse.ok ? await yearsResponse.json() : [];
        const filtersData: string[] = filtersResponse.ok ? await filtersResponse.json() : [];

        console.log('[NewsList] Loaded data:', {
          newsCount: newsItems?.length || 0,
          yearsCount: yearsData?.length || 0,
          filtersCount: filtersData?.length || 0
        });

        const sampleYears = (yearsData || []).slice(0, 3);
        const sampleNewsYears = (newsItems || []).slice(0, 3).map(item => ({
          value: item.year,
          type: typeof item.year
        }));
        debugLog(
          'Loaded years/news samples',
          {
            yearsSample: sampleYears,
            yearsTypes: sampleYears.map(value => typeof value),
            newsYearSample: sampleNewsYears,
            newsCount: newsItems?.length || 0,
            yearsCount: yearsData?.length || 0
          },
          'H1'
        );

        const firstYear = sampleYears[0];
        const strictMatchCount = firstYear !== undefined
          ? (newsItems || []).filter(item => item.year === (firstYear as any)).length
          : null;
        const normalizedMatchCount = firstYear !== undefined
          ? (newsItems || []).filter(item => String(item.year) === String(firstYear)).length
          : null;
        debugLog(
          'Year match counts',
          {
            firstYear,
            firstYearType: typeof firstYear,
            strictMatchCount,
            normalizedMatchCount
          },
          'H2'
        );

        // Устанавливаем данные даже если массив пустой (это валидное состояние)
        setNewsData(newsItems || []);
        setYears((yearsData || []).map(year => String(year)));
        
        // Загружаем счетчики только если есть фильтры
        if (filtersData && filtersData.length > 0) {
          try {
            const counts = await Promise.all(
              filtersData.map(async filter => {
                try {
                  const countResponse = await fetch(`/api/news/count?filter=${encodeURIComponent(filter)}`);
                  if (countResponse.ok) {
                    const { count } = await countResponse.json();
                    return { filter, count };
                  }
                  return { filter, count: 0 };
                } catch (e) {
                  console.warn(`[NewsList] Failed to get count for filter ${filter}:`, e);
                  return { filter, count: 0 };
                }
              })
            );
            setTagsWithCounts(counts);
          } catch (e) {
            console.warn('[NewsList] Failed to load filter counts:', e);
            setTagsWithCounts([]);
          }
        } else {
          setTagsWithCounts([]);
        }
      } catch (error) {
        console.error('[NewsList] Error loading news from API:', error);
        // Если БД недоступна, показываем пустой список
        setNewsData([]);
        setYears([]);
        setTagsWithCounts([]);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedYear, selectedCategory]);

  // Filter news based on selected filters
  const filteredNews = useMemo(() => {
    if (!newsData || newsData.length === 0) {
      return [];
    }

    let filtered = [...newsData];

    if (selectedYear) {
      filtered = filtered.filter(news => String(news.year) === String(selectedYear));
    }

    if (selectedCategory) {
      if (selectedCategory === '__NO_CATEGORY__') {
        filtered = filtered.filter(news => !news.category && (!news.tags || news.tags.length === 0));
      } else {
        filtered = filtered.filter(news => {
          if (news.category === selectedCategory) return true;
          return news.tags?.some(tag => {
            const normalizedTag = tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();
            return normalizedTag === selectedCategory || tag.toLowerCase() === selectedCategory.toLowerCase();
          });
        });
      }
    }

    filtered.sort((a, b) => {
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      return dateB.getTime() - dateA.getTime();
    });

    return filtered;
  }, [newsData, selectedYear, selectedCategory]);

  // Pagination
  const totalPages = Math.ceil(filteredNews.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedNews = filteredNews.slice(startIndex, startIndex + itemsPerPage);

  const handleYearChange = (year: string | null) => {
    debugLog(
      'Year filter toggled',
      { year, yearType: typeof year, selectedYear, selectedYearType: typeof selectedYear },
      'H3'
    );
    setSelectedYear(year === selectedYear ? null : year);
    setCurrentPage(1);
  };

  const handleCategoryChange = (category: string | null) => {
    setSelectedCategory(category === selectedCategory ? null : category);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          <p className="mt-4 text-slate-600">Загрузка новостей...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Sidebar */}
      <div className="lg:col-span-1 space-y-6">
        <Card className="border-slate-200 shadow-sm sticky top-24">
          <CardContent className="p-6">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Архив новостей
            </h3>
            
            {/* Years */}
            <div className="mb-6">
              <button
                onClick={() => handleYearChange(null)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium mb-2 transition-colors flex justify-between items-center ${
                  !selectedYear 
                    ? 'bg-slate-100 text-slate-900' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>Все годы</span>
                <span className="text-xs bg-slate-200 px-2 py-0.5 rounded-full text-slate-600">{newsData.length}</span>
              </button>
              
              <div className="flex flex-wrap gap-2">
                {years.map(year => {
                  const isSelected = selectedYear === year;
                  const count = newsData.filter(news => String(news.year) === String(year)).length;
                  return (
                    <button
                      key={year}
                      onClick={() => handleYearChange(year)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                        isSelected 
                          ? 'bg-slate-900 text-white border-slate-900' 
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {year} <span className={`ml-1 opacity-60`}>({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Categories */}
            <div>
              <h4 className="font-semibold text-slate-900 text-sm mb-3">Категории</h4>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleCategoryChange(null)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    !selectedCategory
                      ? 'bg-slate-900 text-white border-slate-900' 
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  Все <span className="ml-1 opacity-60">({newsData.length})</span>
                </button>
                
                {tagsWithCounts.map(({ filter, count }) => {
                  const isSelected = selectedCategory === filter;
                  return (
                    <button
                      key={filter}
                      onClick={() => handleCategoryChange(filter)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                        isSelected 
                          ? 'bg-slate-900 text-white border-slate-900' 
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {filter} <span className={`ml-1 opacity-60`}>({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-50 to-blue-50 border-slate-200">
          <CardContent className="p-6">
            <h4 className="font-bold text-slate-900 mb-2">Подписка</h4>
            <p className="text-sm text-slate-600 mb-4">
              Получайте свежие новости о мероприятиях и оборудовании.
            </p>
            <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white" asChild>
              <Link href="/contacts">Подписаться</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="lg:col-span-3">
        {/* Active Filters */}
        {(selectedYear || selectedCategory) && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-500 mr-2">Фильтры:</span>
            {selectedYear && (
              <Badge variant="secondary" className="bg-slate-100 text-slate-900 hover:bg-slate-200 gap-1 cursor-pointer" onClick={() => handleYearChange(selectedYear)}>
                Год: {selectedYear} <X className="w-3 h-3" />
              </Badge>
            )}
            {selectedCategory && (
              <Badge variant="secondary" className="bg-slate-100 text-slate-900 hover:bg-slate-200 gap-1 cursor-pointer" onClick={() => handleCategoryChange(selectedCategory)}>
                {selectedCategory} <X className="w-3 h-3" />
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-6 text-slate-500 hover:text-slate-900"
              onClick={() => {
                setSelectedYear(null);
                setSelectedCategory(null);
                setCurrentPage(1);
              }}
            >
              Сбросить
            </Button>
          </div>
        )}

        {/* News Grid */}
        {paginatedNews.length > 0 ? (
          <div className="space-y-6">
            <p className="text-sm text-slate-500">Найдено публикаций: {filteredNews.length}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedNews.map((news) => (
                <Card key={news.id} className="group hover:shadow-lg transition-all border-slate-200 bg-white flex flex-col overflow-hidden h-full">
                  {/* Image Section */}
                  <div className="relative w-full aspect-[4/3] overflow-hidden bg-slate-100">
                    {news.images && news.images.length > 0 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={news.images[0]} 
                        alt={news.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        style={{ objectPosition: news.imageFocalPoint || 'center 30%' }}
                      />
                    ) : (
                      <NewsPlaceholder />
                    )}
                    
                    {/* Date Badge */}
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-slate-900 shadow-sm">
                      {news.date}
                    </div>
                  </div>

                  <CardContent className="p-6 flex flex-col flex-grow">
                    {/* Category */}
                    <div className="mb-4">
                      {news.category ? (
                        <Badge className="bg-teal-50 text-teal-700 hover:bg-teal-100 border-0">
                          {news.category}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
                          Новости
                        </Badge>
                      )}
                    </div>
                    
                    <Link href={`/news/${news.id}`} className="block group-hover:text-teal-600 transition-colors mb-3">
                      <h3 className="text-xl font-bold text-slate-900 line-clamp-3">
                        {news.title}
                      </h3>
                    </Link>
                    
                    <p className="text-slate-600 text-sm line-clamp-3 mb-6 flex-grow">
                      {news.shortDescription}
                    </p>

                    <div className="flex items-center justify-between pt-4 mt-auto border-t border-slate-100">
                      <div className="flex gap-3 text-slate-400">
                        {news.images && news.images.length > 0 && (
                          <div className="flex items-center gap-1" title={`${news.images.length} фото`}>
                            <ImageIcon className="w-4 h-4" />
                            <span className="text-xs font-medium">{news.images.length}</span>
                          </div>
                        )}
                        {news.videos && news.videos.length > 0 && (
                          <div className="flex items-center gap-1" title={`${news.videos.length} видео`}>
                            <Video className="w-4 h-4" />
                            <span className="text-xs font-medium">{news.videos.length}</span>
                          </div>
                        )}
                        {news.documents && news.documents.length > 0 && (
                          <div className="flex items-center gap-1" title={`${news.documents.length} документов`}>
                            <FileText className="w-4 h-4" />
                            <span className="text-xs font-medium">{news.documents.length}</span>
                          </div>
                        )}
                      </div>
                      
                      <Link 
                        href={`/news/${news.id}`} 
                        className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
                      >
                        Подробнее
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 pt-8">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="rounded-full w-10 h-10"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                          className={`w-10 h-10 rounded-full ${currentPage === page ? 'bg-slate-900 hover:bg-slate-800 text-white' : ''}`}
                        >
                          {page}
                        </Button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return <span key={page} className="flex items-center px-2 text-slate-400">...</span>;
                    }
                    return null;
                  })}
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="rounded-full w-10 h-10"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
              <Filter className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">Новости не найдены</h3>
            <p className="text-slate-500 mb-6">Попробуйте изменить параметры поиска или сбросить фильтры</p>
            <Button onClick={() => { setSelectedYear(null); setSelectedCategory(null); }} variant="outline">
              Сбросить фильтры
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function parseDate(dateStr: string): Date {
  const parts = dateStr.split('.');
  if (parts.length === 3) {
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  } else if (parts.length === 2) {
    return new Date(parseInt(parts[1]), parseInt(parts[0]) - 1, 1);
  } else {
    return new Date(parseInt(parts[0]), 0, 1);
  }
}
