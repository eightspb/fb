'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, MapPin, Users, Clock, Video, Image as ImageIcon, FileText, CheckCircle, GraduationCap } from "lucide-react";
import Link from 'next/link';

import { PastEvents } from '@/components/PastEvents';

interface Conference {
  id: string;
  title: string;
  date: string;
  description: string;
  type: string;
  location: string | null;
  speaker: string | null;
  cme_hours: number | null;
  program: string[];
  materials: string[]; // 'video', 'photo', 'doc'
  status: string;
}

export function ConferencesList() {
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('/api/conferences');
        if (response.ok) {
          const data = await response.json();
          // Filter out drafts if not admin (API returns all, client filters for public)
          // Actually API returns all for now.
          // In real app, API should filter based on auth. 
          // For now, let's filter 'published' ones only.
          const published = data.filter((c: any) => c.status === 'published');
          setConferences(published);
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
    // Try YYYY-MM-DD
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return new Date(dateStr);
    }
    // Try DD.MM.YYYY
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    return new Date();
  };

  const now = new Date();
  
  const upcoming = conferences.filter(c => {
    const date = parseDate(c.date);
    return date >= now;
  }).sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());

  if (loading) {
    return <div className="text-center py-12">Загрузка мероприятий...</div>;
  }

  // If no data, show something empty or fallback to static example if preferred?
  // I will just show empty states.

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
        
        {/* Recurring Monthly Training Event */}
        <div className="mb-8">
           <Card className="border-teal-200 shadow-md bg-gradient-to-r from-teal-50/50 to-blue-50/50 overflow-hidden relative group">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <GraduationCap className="w-32 h-32" />
             </div>
             <CardContent className="p-8 relative z-10">
               <div className="flex flex-col md:flex-row gap-8 items-start">
                 <div className="flex-1">
                   <div className="flex items-center gap-3 mb-4">
                     <Badge className="bg-teal-600 text-white hover:bg-teal-700 border-0 px-3 py-1 text-sm">
                        Регулярное обучение
                     </Badge>
                     <div className="flex items-center gap-1 text-teal-700 font-medium text-sm bg-teal-100/50 px-3 py-1 rounded-full">
                        <Calendar className="w-4 h-4" />
                        <span>Каждый месяц</span>
                     </div>
                   </div>

                   <h3 className="text-3xl font-bold text-slate-900 mb-2">
                     Интервенционная маммология
                   </h3>
                   <p className="text-xl text-slate-700 mb-6 font-medium">
                     Практический курс по вакуумной аспирационной биопсии (ВАБ)
                   </p>
                   
                   <p className="text-slate-600 mb-6 leading-relaxed max-w-2xl">
                     Комплексная программа повышения квалификации для хирургов, онкологов и врачей УЗД. 
                     Отработка навыков на фантомах и участие в реальных операциях под руководством эксперта.
                   </p>

                   <div className="grid sm:grid-cols-2 gap-4 mb-8 max-w-lg">
                      <div className="flex items-center gap-3 text-slate-700">
                        <Users className="w-5 h-5 text-teal-500" />
                        <span>Спикер: Одинцов В.А., д.м.н.</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-700">
                        <MapPin className="w-5 h-5 text-teal-500" />
                        <span>Санкт-Петербург</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-700">
                        <Clock className="w-5 h-5 text-teal-500" />
                        <span>36 часов CME</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-700">
                        <CheckCircle className="w-5 h-5 text-teal-500" />
                        <span>Удостоверение гособразца</span>
                      </div>
                   </div>

                   <div className="flex flex-col sm:flex-row gap-4">
                     <Button className="bg-slate-900 hover:bg-slate-800 rounded-full px-8" asChild>
                       <Link href="/training">
                         Подробнее о курсе
                       </Link>
                     </Button>
                   </div>
                 </div>
                 
                 {/* Decorative or extra info side - optional, maybe just keep text left aligned */}
               </div>
             </CardContent>
           </Card>
        </div>

        {/* Conference 2026 Teaser */}
        <div className="mb-8">
          <Card className="border-teal-200 shadow-md bg-gradient-to-r from-teal-50/50 to-blue-50/50 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Users className="w-32 h-32" />
            </div>
            <CardContent className="p-8 relative z-10">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <Badge className="bg-teal-600 text-white hover:bg-teal-700 border-0 px-3 py-1 text-sm">
                      Конференция
                    </Badge>
                    <div className="flex items-center gap-1 text-teal-700 font-medium text-sm bg-teal-100/50 px-3 py-1 rounded-full">
                      <Calendar className="w-4 h-4" />
                      <span>25 апреля 2026</span>
                    </div>
                  </div>

                  <h3 className="text-3xl font-bold text-slate-900 mb-2">
                    Миниинвазивная хирургия / Молочная железа
                  </h3>
                  <p className="text-xl text-slate-700 mb-6 font-medium">
                    Научно-практическая конференция с международным участием
                  </p>
                  
                  <p className="text-slate-600 mb-6 leading-relaxed max-w-2xl">
                    Площадка для обмена опытом и знаниями с ведущими специалистами из России и других стран. 
                    Обсуждение актуальных аспектов применения интервенционных методов в клинической практике.
                  </p>

                  <div className="grid sm:grid-cols-2 gap-4 mb-8 max-w-lg">
                    <div className="flex items-center gap-3 text-slate-700">
                      <MapPin className="w-5 h-5 text-teal-500" />
                      <span>МКНЦ имени Логинова, Москва</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-700">
                      <Users className="w-5 h-5 text-teal-500" />
                      <span>Ведущие специалисты</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button className="bg-slate-900 hover:bg-slate-800 rounded-full px-8" asChild>
                      <Link href="/conferences/sms3">
                        Записаться
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {upcoming.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-8">
            {upcoming.map((event) => {
               const eventDate = parseDate(event.date);
               const day = eventDate.getDate();
               const month = eventDate.toLocaleString('ru-RU', { month: 'short' }).toUpperCase();
               const year = eventDate.getFullYear();

               return (
                <Card key={event.id} className="border-slate-200 hover:border-teal-200 hover:shadow-lg transition-all group">
                  <CardContent className="p-8">
                    <div className="flex justify-between items-start mb-6">
                      <Badge className="bg-teal-100 text-teal-700 hover:bg-teal-200 border-0 px-3 py-1">
                        {event.type}
                      </Badge>
                      <div className="text-center bg-slate-50 rounded-lg p-2 border border-slate-100 min-w-[80px]">
                        <div className="text-sm font-bold text-slate-900">{day} {month}</div>
                        <div className="text-xs text-slate-500">{year}</div>
                      </div>
                    </div>
                    
                    <h3 className="text-2xl font-bold text-slate-900 mb-4 group-hover:text-teal-600 transition-colors">
                      {event.title}
                    </h3>
                    
                    <div className="space-y-3 text-slate-600 mb-8">
                      {event.location && (
                        <div className="flex items-center gap-3">
                          <MapPin className="w-5 h-5 text-slate-400" />
                          <span>{event.location}</span>
                        </div>
                      )}
                      {event.speaker && (
                        <div className="flex items-center gap-3">
                          <Users className="w-5 h-5 text-slate-400" />
                          <span>Спикер: {event.speaker}</span>
                        </div>
                      )}
                      {event.cme_hours && (
                        <div className="flex items-center gap-3">
                          <Clock className="w-5 h-5 text-slate-400" />
                          <span>{event.cme_hours} часов CME</span>
                        </div>
                      )}
                    </div>

                    {event.program && event.program.length > 0 && (
                      <div className="bg-slate-50 rounded-xl p-5 mb-8 border border-slate-100">
                        <h4 className="font-semibold text-slate-900 mb-3 text-sm uppercase tracking-wide">В программе:</h4>
                        <ul className="space-y-2">
                          {event.program.map((item, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                              <CheckCircle className="w-4 h-4 text-teal-500" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex gap-4">
                      <Button className="flex-1 bg-slate-900 hover:bg-slate-800 rounded-full">
                        Регистрация
                      </Button>
                      <Button variant="outline" className="flex-1 border-slate-200 rounded-full">
                        Подробнее
                      </Button>
                    </div>
                  </CardContent>
                </Card>
               );
            })}
          </div>
        ) : (
           <div className="text-center py-12 text-slate-500">
             Нет предстоящих мероприятий
           </div>
        )}
      </TabsContent>

      <TabsContent value="archive" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <PastEvents categories={['Конференции']} />
      </TabsContent>
    </Tabs>
  );
}

