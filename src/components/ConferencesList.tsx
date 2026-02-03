'use client';

import { useState, useEffect } from 'react';
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
    const eventDate = parseDate(event.date);
    const day = eventDate.getDate();
    const month = eventDate.toLocaleString('ru-RU', { month: 'short' }).toUpperCase();
    const year = eventDate.getFullYear();
    const speakersCount = event.speakers?.length || 0;
    // Используем slug если есть, иначе id
    const conferenceUrl = event.slug || event.id;

    return (
      <Card key={event.id} className="border-slate-200 hover:border-teal-200 hover:shadow-lg transition-all group overflow-hidden">
        {/* Cover Image */}
        {event.cover_image && (
          <div className="relative h-48 overflow-hidden">
            <img 
              src={event.cover_image} 
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <Badge className="absolute top-4 left-4 bg-teal-500 text-white border-0 px-3 py-1">
              {event.type}
            </Badge>
          </div>
        )}
        
        <CardContent className={event.cover_image ? "p-6" : "p-8"}>
          {!event.cover_image && (
            <div className="flex justify-between items-start mb-6">
              <Badge className="bg-teal-100 text-teal-700 hover:bg-teal-200 border-0 px-3 py-1">
                {event.type}
              </Badge>
              <div className="text-center bg-slate-50 rounded-lg p-2 border border-slate-100 min-w-[80px]">
                <div className="text-sm font-bold text-slate-900">{day} {month}</div>
                <div className="text-xs text-slate-500">{year}</div>
              </div>
            </div>
          )}
          
          <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-teal-600 transition-colors line-clamp-2">
            {event.title}
          </h3>

          {event.description && (
            <p className="text-slate-600 text-sm mb-4 line-clamp-2">{event.description}</p>
          )}
          
          <div className="space-y-2 text-slate-600 mb-6 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>{formatDateRange(event.date, event.date_end)}</span>
            </div>
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
                      <img src={speaker.photo} alt={speaker.name} className="w-full h-full object-cover" />
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

          <div className="flex gap-3">
            {isUpcoming && (
              <Button asChild className="flex-1 bg-teal-600 hover:bg-teal-700 text-white rounded-full">
                <Link href={`/conferences/${conferenceUrl}#register`}>
                  Регистрация
                </Link>
              </Button>
            )}
            <Button variant="outline" asChild className={`${isUpcoming ? 'flex-1' : 'w-full'} border-slate-300 hover:border-teal-400 hover:text-teal-600 rounded-full group/btn`}>
              <Link href={`/conferences/${conferenceUrl}`} className="flex items-center gap-2">
                Подробнее
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </Link>
            </Button>
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
