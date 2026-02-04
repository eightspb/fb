'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NewsItem } from '@/lib/news-data';
import { ImageIcon, Video, FileText, ChevronLeft, ChevronRight, Loader2, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PastEventsProps {
  categories?: string[];
}

export function PastEvents({ categories }: PastEventsProps) {
  const [allEvents, setAllEvents] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const itemsPerPage = 6;

  useEffect(() => {
    async function loadEvents() {
      try {
        const response = await fetch('/api/news');
        if (response.ok) {
          const data: NewsItem[] = await response.json();
          
          const now = new Date();
          
          const filtered = data.filter(item => {
            // Filter by specific categories if provided
            if (categories && categories.length > 0) {
              if (!item.category || !categories.includes(item.category)) {
                return false;
              }
            } else {
              // Default filter
              const isEvent = 
                item.category === 'Мероприятия' || 
                item.category === 'Обучение' || 
                item.tags?.some(t => t.toLowerCase().includes('мероприяти') || t.toLowerCase().includes('обучение'));
                
              if (!isEvent) return false;
            }

            // Parse date "DD.MM.YYYY"
            const parts = item.date.split('.');
            if (parts.length !== 3) return true; // keep if date invalid
            const itemDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            
            // Check if past
            return itemDate < now;
          });

          // Sort by date desc
          filtered.sort((a, b) => {
             const partsA = a.date.split('.');
             const dateA = new Date(parseInt(partsA[2]), parseInt(partsA[1]) - 1, parseInt(partsA[0]));
             const partsB = b.date.split('.');
             const dateB = new Date(parseInt(partsB[2]), parseInt(partsB[1]) - 1, parseInt(partsB[0]));
             return dateB.getTime() - dateA.getTime();
          });

          setAllEvents(filtered);
        }
      } catch (error) {
        console.error('Failed to load events', error);
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, [categories]);

  // Extract available years
  const availableYears = Array.from(new Set(allEvents.map(event => {
    const parts = event.date.split('.');
    return parts.length === 3 ? parseInt(parts[2]) : null;
  }).filter((year): year is number => year !== null))).sort((a, b) => b - a);

  // Filter events based on selected years
  const filteredEvents = allEvents.filter(event => {
    if (selectedYears.length === 0) return true;
    
    const parts = event.date.split('.');
    if (parts.length !== 3) return false;
    const year = parseInt(parts[2]);
    return selectedYears.includes(year);
  });

  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEvents = filteredEvents.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const section = document.getElementById('past-events');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const toggleYear = (year: number) => {
    setSelectedYears(prev => {
      const newSelection = prev.includes(year)
        ? prev.filter(y => y !== year)
        : [...prev, year];
      setCurrentPage(1); // Reset to first page on filter change
      return newSelection;
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8" id="past-events">
      {/* Year Filter */}
      {availableYears.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <div className="flex items-center gap-2 text-slate-500 mr-2">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Фильтр по годам:</span>
          </div>
          
          <Button
            variant={selectedYears.length === 0 ? "default" : "outline"}
            size="sm"
            onClick={() => { setSelectedYears([]); setCurrentPage(1); }}
            className={cn(
              "rounded-full transition-all",
              selectedYears.length === 0 
                ? "bg-teal-600 text-white hover:bg-teal-700 border-transparent shadow-md shadow-teal-900/20" 
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            Все
          </Button>
          
          {availableYears.map(year => (
            <Button
              key={year}
              variant={selectedYears.includes(year) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleYear(year)}
              className={cn(
                "rounded-full transition-all",
                selectedYears.includes(year)
                  ? "bg-teal-600 text-white hover:bg-teal-700 border-transparent shadow-md shadow-teal-900/20"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              {year}
            </Button>
          ))}
        </div>
      )}

      {filteredEvents.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          {allEvents.length > 0 ? "Нет мероприятий за выбранный год." : "Нет прошедших мероприятий."}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedEvents.map((event) => (
          <Card key={event.id} className="group hover:shadow-lg transition-all border-slate-200 bg-white flex flex-col overflow-hidden h-full">
            {/* Image Section - same as NewsList */}
            <div className="relative w-full aspect-[4/3] overflow-hidden bg-slate-100">
              {event.images && event.images.length > 0 ? (
                <Image 
                  src={event.images[0]} 
                  alt={event.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  style={{ objectPosition: event.imageFocalPoint || 'center 30%' }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <ImageIcon className="w-12 h-12" />
                </div>
              )}
              
              {/* Date Badge */}
              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-slate-900 shadow-sm">
                {event.date}
              </div>
            </div>

            <CardContent className="p-6 flex flex-col flex-grow">
              {/* Category */}
              <div className="mb-4">
                {event.category ? (
                  <Badge className="bg-teal-50 text-teal-700 hover:bg-teal-100 border-0">
                    {event.category}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
                    Новости
                  </Badge>
                )}
              </div>
              
              <Link href={`/news/${event.id}`} className="block group-hover:text-teal-600 transition-colors mb-3">
                <h3 className="text-xl font-bold text-slate-900 line-clamp-3">
                  {event.title}
                </h3>
              </Link>
              
              <p className="text-slate-600 text-sm line-clamp-3 mb-6 flex-grow">
                {event.shortDescription}
              </p>

              <div className="flex items-center justify-between pt-4 mt-auto border-t border-slate-100">
                <div className="flex gap-3 text-slate-400">
                  {event.images && event.images.length > 0 && (
                    <div className="flex items-center gap-1" title={`${event.images.length} фото`}>
                      <ImageIcon className="w-4 h-4" />
                      <span className="text-xs font-medium">{event.images.length}</span>
                    </div>
                  )}
                  {event.videos && event.videos.length > 0 && (
                    <div className="flex items-center gap-1" title={`${event.videos.length} видео`}>
                      <Video className="w-4 h-4" />
                      <span className="text-xs font-medium">{event.videos.length}</span>
                    </div>
                  )}
                  {event.documents && event.documents.length > 0 && (
                    <div className="flex items-center gap-1" title={`${event.documents.length} документов`}>
                      <FileText className="w-4 h-4" />
                      <span className="text-xs font-medium">{event.documents.length}</span>
                    </div>
                  )}
                </div>
                
                <Link 
                  href={`/news/${event.id}`} 
                  className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
                >
                  Подробнее
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-4">
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
  );
}

