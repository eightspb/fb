'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NewsItem } from '@/lib/news-data';
import { ImageIcon, Video, FileText, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

export interface PastEventsProps {
  categories?: string[];
}

export function PastEvents({ categories }: PastEventsProps) {
  const [events, setEvents] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    async function loadEvents() {
      try {
        const response = await fetch('/api/news');
        if (response.ok) {
          const data: NewsItem[] = await response.json();
          
          // Filter for past events (Мероприятия or Обучение)
          // And optionally filter by date if needed, but usually "News" are published things.
          // However, some news are announcements.
          // Let's filter by category/tag and maybe check if date is past?
          // For now, I'll just filter by category as requested "all news which have the event mark".
          // I will treat "Мероприятия" and "Обучение" as event marks.
          
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

          setEvents(filtered);
        }
      } catch (error) {
        console.error('Failed to load events', error);
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, [categories]);

  const totalPages = Math.ceil(events.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEvents = events.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Optionally scroll to top of section
    const section = document.getElementById('past-events');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        Нет прошедших мероприятий.
      </div>
    );
  }

  return (
    <div className="space-y-8" id="past-events">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedEvents.map((event) => (
          <Card key={event.id} className="group hover:shadow-lg transition-all border-slate-200 overflow-hidden bg-white h-full flex flex-col">
            <CardContent className="p-0 flex flex-col h-full">
               {/* Image */}
               <div className="relative h-48 bg-slate-100 overflow-hidden">
                  {event.images && event.images.length > 0 ? (
                    <Image 
                      src={event.images[0]} 
                      alt={event.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <ImageIcon className="w-12 h-12" />
                    </div>
                  )}
                  <div className="absolute top-4 left-4 flex gap-2">
                    <Badge className="bg-white/90 text-slate-900 backdrop-blur-sm hover:bg-white border-0 shadow-sm">
                      {event.date}
                    </Badge>
                  </div>
               </div>

               <div className="p-6 flex flex-col flex-grow">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {event.category && (
                        <Badge variant="outline" className="border-pink-200 text-pink-700 bg-pink-50">
                            {event.category}
                        </Badge>
                    )}
                  </div>

                  <Link href={`/news/${event.id}`} className="group-hover:text-pink-600 transition-colors">
                    <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2">
                      {event.title}
                    </h3>
                  </Link>

                  <p className="text-slate-600 text-sm mb-4 line-clamp-3">
                    {event.shortDescription}
                  </p>

                  <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                     <div className="flex gap-3 text-slate-400">
                        {event.images && event.images.length > 0 && <ImageIcon className="w-4 h-4" />}
                        {event.videos && event.videos.length > 0 && <Video className="w-4 h-4" />}
                        {event.documents && event.documents.length > 0 && <FileText className="w-4 h-4" />}
                     </div>
                     <Button variant="ghost" size="sm" className="text-pink-600 hover:text-pink-700 hover:bg-pink-50 p-0 h-auto font-medium" asChild>
                        <Link href={`/news/${event.id}`}>Подробнее</Link>
                     </Button>
                  </div>
               </div>
            </CardContent>
          </Card>
        ))}
      </div>

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

