'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, MapPin, Users, Clock, ArrowRight } from "lucide-react";
import { PastEvents } from '@/components/PastEvents';

interface Speaker {
  id: string;
  name: string;
  photo: string;
  credentials: string;
  report_title: string;
  report_time: string;
}

interface Conference {
  id: string;
  slug?: string;
  title: string;
  date: string;
  date_end?: string;
  description: string;
  type: string;
  location: string | null;
  speaker: string | null;
  cme_hours: number | null;
  program: string[];
  materials: string[];
  status: string;
  cover_image?: string;
  speakers?: Speaker[];
  organizer_contacts?: any;
  additional_info?: string;
}

export function ConferencesList() {
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('/api/conferences?status=published');
        if (response.ok) {
          const data = await response.json();
          setConferences(data);
        }
      } catch (error) {
        console.error('Failed to load conferences:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const parseDate = (dateStr: string) => {
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return new Date(dateStr);
    }
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    return new Date();
  };

  const formatDateRange = (start: string, end?: string) => {
    const startDate = parseDate(start);
    const day = startDate.getDate();
    const month = startDate.toLocaleString('ru-RU', { month: 'short' });
    const year = startDate.getFullYear();
    
    if (end) {
      const endDate = parseDate(end);
      const endDay = endDate.getDate();
      const endMonth = endDate.toLocaleString('ru-RU', { month: 'short' });
      const endYear = endDate.getFullYear();
      
      if (year === endYear && month === endMonth) {
        return `${day}-${endDay} ${month} ${year}`;
      } else if (year === endYear) {
        return `${day} ${month} - ${endDay} ${endMonth} ${year}`;
      } else {
        return `${day} ${month} ${year} - ${endDay} ${endMonth} ${endYear}`;
      }
    }
    
    return `${day} ${month} ${year}`;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const upcoming = conferences.filter(c => {
    const endDate = c.date_end ? parseDate(c.date_end) : parseDate(c.date);
    endDate.setHours(0, 0, 0, 0);
    return endDate >= today;
  }).sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());

  const past = conferences.filter(c => {
    const endDate = c.date_end ? parseDate(c.date_end) : parseDate(c.date);
    endDate.setHours(0, 0, 0, 0);
    return endDate < today;
  }).sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());

  if (loading) {
    return <div className="text-center py-12">Загрузка мероприятий...</div>;
  }

  const renderConferenceCard = (event: Conference, isUpcoming: boolean = true) => {
    const speakersCount = event.speakers?.length || 0;
    // Используем slug если есть, иначе id
    const conferenceUrl = event.slug || event.id;

    return (
      <Card key={event.id} className="group hover:shadow-lg transition-all border-slate-200 bg-white flex flex-col overflow-hidden h-full">
        {/* Image Section - same as NewsList */}
        <div className="relative w-full aspect-[4/3] overflow-hidden bg-slate-100">
          {event.cover_image ? (
            <Image
              src={event.cover_image}
              alt={event.title}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              style={{ objectPosition: 'center 30%' }}
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50">
              <Calendar className="w-12 h-12 text-teal-300" />
            </div>
          )}
          
          {/* Date Badge */}
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-slate-900 shadow-sm">
            {formatDateRange(event.date, event.date_end)}
          </div>
        </div>

        <CardContent className="p-6 flex flex-col flex-grow">
          {/* Category/Type */}
          <div className="mb-4">
            <Badge className="bg-teal-50 text-teal-700 hover:bg-teal-100 border-0">
              {event.type}
            </Badge>
          </div>
          
          <Link href={`/conferences/${conferenceUrl}`} className="block group-hover:text-teal-600 transition-colors mb-3">
            <h3 className="text-xl font-bold text-slate-900 line-clamp-3">
              {event.title}
            </h3>
          </Link>
          
          {event.description && (
            <p className="text-slate-600 text-sm line-clamp-3 mb-4 flex-grow">
              {event.description}
            </p>
          )}
          
          {/* Meta info */}
          <div className="space-y-2 text-slate-500 text-sm mb-6">
            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
            {speakersCount > 0 && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <span>{speakersCount} {speakersCount === 1 ? 'спикер' : speakersCount < 5 ? 'спикера' : 'спикеров'}</span>
              </div>
            )}
            {event.cme_hours && event.cme_hours > 0 && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>{event.cme_hours} часов CME</span>
              </div>
            )}
          </div>

          {/* Speakers preview */}
          {event.speakers && event.speakers.length > 0 && (
            <div className="flex items-center gap-2 mb-6">
              <div className="flex -space-x-2">
                {event.speakers.slice(0, 4).map((speaker, idx) => (
                  <div 
                    key={speaker.id || idx}
                    className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-slate-200"
                    title={speaker.name}
                  >
                    {speaker.photo ? (
                      <Image
                        src={speaker.photo}
                        alt={speaker.name}
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-medium text-slate-500">
                        {speaker.name?.charAt(0) || '?'}
                      </div>
                    )}
                  </div>
                ))}
                {event.speakers.length > 4 && (
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600">
                    +{event.speakers.length - 4}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 mt-auto border-t border-slate-100">
            {isUpcoming ? (
              <>
                <Button asChild size="sm" className="bg-teal-600 hover:bg-teal-700 text-white rounded-full">
                  <Link href={`/conferences/${conferenceUrl}#register`}>
                    Регистрация
                  </Link>
                </Button>
                <Link 
                  href={`/conferences/${conferenceUrl}`} 
                  className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors flex items-center gap-1"
                >
                  Подробнее
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            ) : (
              <>
                <div className="flex gap-3 text-slate-400">
                  {event.materials && event.materials.length > 0 && (
                    <div className="flex items-center gap-1" title="Есть материалы">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs font-medium">{event.materials.length}</span>
                    </div>
                  )}
                </div>
                <Link 
                  href={`/conferences/${conferenceUrl}`} 
                  className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
                >
                  Подробнее
                </Link>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Tabs defaultValue="announcements" className="w-full">
      <div className="flex justify-center mb-12">
        <TabsList className="grid w-full max-w-md grid-cols-2 bg-slate-100 p-1 rounded-full">
          <TabsTrigger 
            value="announcements" 
            className="rounded-full data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-500 transition-all"
          >
            Предстоящие
          </TabsTrigger>
          <TabsTrigger 
            value="archive" 
            className="rounded-full data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-500 transition-all"
          >
            Прошедшие
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="announcements" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {upcoming.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcoming.map((event) => renderConferenceCard(event, true))}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <p className="text-lg mb-2">Нет предстоящих мероприятий</p>
            <p className="text-sm">Следите за обновлениями!</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="archive" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {past.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {past.map((event) => renderConferenceCard(event, false))}
          </div>
        ) : (
          <PastEvents categories={['Конференции']} />
        )}
      </TabsContent>
    </Tabs>
  );
}
