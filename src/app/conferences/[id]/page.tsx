import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ConferenceRegistrationForm } from '@/components/ConferenceRegistrationForm';
import { CountdownTimer } from '@/components/CountdownTimer';
import { SpeakerCard } from '@/components/SpeakerCard';
import { ConferenceSchedule } from '@/components/ConferenceSchedule';
import { ConferenceVideos } from '@/components/ConferenceVideos';
import { isUUID } from '@/lib/slug';
import { getSpeakers, getPresidiumMembers, isStructuredProgram } from '@/lib/types/conference';
import type { Conference, ProgramItem } from '@/lib/types/conference';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  CheckCircle, 
  ChevronLeft,
  Phone,
} from 'lucide-react';

interface ConferencePageProps {
  params: Promise<{ id: string }>;
}

async function getConference(idOrSlug: string): Promise<Conference | null> {
  try {
    if (process.env.DATABASE_URL) {
      const { Pool } = await import('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });
      
      const client = await pool.connect();
      try {
        // Поиск по UUID или slug
        let result;
        if (isUUID(idOrSlug)) {
          result = await client.query(
            'SELECT * FROM conferences WHERE id = $1',
            [idOrSlug]
          );
        } else {
          result = await client.query(
            'SELECT * FROM conferences WHERE slug = $1',
            [idOrSlug]
          );
        }
        
        if (result.rows.length > 0) {
          const row = result.rows[0];
          return {
            id: row.id,
            slug: row.slug || undefined,
            title: row.title,
            date: row.date,
            date_end: row.date_end || undefined,
            description: row.description || '',
            type: row.type,
            location: row.location,
            speaker: row.speaker,
            cme_hours: row.cme_hours,
            program: Array.isArray(row.program) ? row.program : (typeof row.program === 'string' ? JSON.parse(row.program) : []),
            materials: Array.isArray(row.materials) ? row.materials : (typeof row.materials === 'string' ? JSON.parse(row.materials) : []),
            status: row.status,
            cover_image: row.cover_image || undefined,
            speakers: Array.isArray(row.speakers) ? row.speakers : (typeof row.speakers === 'string' ? JSON.parse(row.speakers) : []),
            organizer_contacts: typeof row.organizer_contacts === 'object' ? row.organizer_contacts : (typeof row.organizer_contacts === 'string' ? JSON.parse(row.organizer_contacts) : {}),
            additional_info: row.additional_info || undefined,
            videos: Array.isArray(row.videos) ? row.videos : (typeof row.videos === 'string' ? JSON.parse(row.videos) : []),
          };
        }
      } finally {
        client.release();
        await pool.end();
      }
    } else {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/conferences/${idOrSlug}`, {
        cache: 'no-store'
      });
      
      if (response.ok) {
        return await response.json();
      }
    }
  } catch (error) {
    console.error('Error loading conference:', error);
  }
  return null;
}

function parseDate(dateStr: string): Date {
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return new Date(dateStr);
  }
  const parts = dateStr.split('.');
  if (parts.length === 3) {
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  }
  return new Date();
}

function formatDateRange(start: string, end?: string): string {
  const startDate = parseDate(start);
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  
  if (end) {
    const endDate = parseDate(end);
    const startStr = startDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    const endStr = endDate.toLocaleDateString('ru-RU', options);
    
    if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
      return `${startDate.getDate()}-${endDate.getDate()} ${endDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}`;
    }
    return `${startStr} - ${endStr}`;
  }
  
  return startDate.toLocaleDateString('ru-RU', options);
}

function isUpcoming(date: string, dateEnd?: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = dateEnd ? parseDate(dateEnd) : parseDate(date);
  endDate.setHours(0, 0, 0, 0);
  return endDate >= today;
}

export default async function ConferencePage({ params }: ConferencePageProps) {
  const { id } = await params;
  const conference = await getConference(id);

  if (!conference) {
    notFound();
  }

  const upcoming = isUpcoming(conference.date, conference.date_end);
  const hasContacts = conference.organizer_contacts && (
    conference.organizer_contacts.name ||
    conference.organizer_contacts.phone ||
    conference.organizer_contacts.email
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-teal-100 selection:text-teal-900">
      <Header />

      {/* Hero Section */}
      <div className="relative pt-16">
        {conference.cover_image ? (
          <div className="relative h-[600px] md:h-[800px]">
            <Image
              src={conference.cover_image}
              alt={conference.title}
              fill
              sizes="100vw"
              className="object-cover"
              unoptimized
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
              <div className="container mx-auto max-w-5xl">
                <Badge className="bg-teal-500 text-white border-0 mb-4">
                  {conference.type}
                </Badge>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
                  {conference.title}
                </h1>
              </div>
            </div>
          </div>
        ) : (
          <div className="pt-8 pb-8 bg-white border-b border-slate-200">
            <div className="container mx-auto px-4 md:px-6 max-w-5xl">
              <Breadcrumbs items={[
                { label: "Мероприятия", href: "/conferences" },
                { label: conference.title }
              ]} />
              <Badge className="bg-teal-100 text-teal-700 border-0 mt-4 mb-4">
                {conference.type}
              </Badge>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900">
                {conference.title}
              </h1>
            </div>
          </div>
        )}
      </div>

      {/* Breadcrumbs for cover image case */}
      {conference.cover_image && (
        <div className="bg-white border-b border-slate-200 py-4">
          <div className="container mx-auto px-4 md:px-6 max-w-5xl">
            <Breadcrumbs items={[
              { label: "Мероприятия", href: "/conferences" },
              { label: conference.title }
            ]} />
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 md:px-6 py-12 max-w-6xl">
        <div className="space-y-12">
            {/* Description */}
            {conference.description && (
              <section>
                <div className="prose prose-lg prose-slate max-w-none">
                  {conference.description.split('\n').map((paragraph, index) => (
                    <p key={index} className="text-slate-700 leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            )}

            {/* Event Details - Inline */}
            <section>
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Date */}
                    <div className="flex items-center gap-3 text-slate-700">
                      <Calendar className="w-5 h-5 text-teal-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-slate-400 uppercase">Дата</p>
                        <p className="font-medium">{formatDateRange(conference.date, conference.date_end)}</p>
                      </div>
                    </div>

                    {/* Location */}
                    {conference.location && (
                      <div className="flex items-center gap-3 text-slate-700">
                        <MapPin className="w-5 h-5 text-teal-600 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-slate-400 uppercase">Место</p>
                          <p className="font-medium">{conference.location}</p>
                        </div>
                      </div>
                    )}

                    {/* CME Hours - только если > 0 */}
                    {typeof conference.cme_hours === 'number' && conference.cme_hours > 0 && (
                      <div className="flex items-center gap-3 text-slate-700">
                        <Clock className="w-5 h-5 text-teal-600 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-slate-400 uppercase">Часы CME</p>
                          <p className="font-medium">{conference.cme_hours} часов</p>
                        </div>
                      </div>
                    )}

                    {/* Contacts */}
                    {hasContacts && conference.organizer_contacts?.phone && (
                      <div className="flex items-center gap-3 text-slate-700">
                        <Phone className="w-5 h-5 text-teal-600 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-slate-400 uppercase">Контакты</p>
                          <a 
                            href={`tel:${conference.organizer_contacts.phone}`}
                            className="font-medium hover:text-teal-600 transition-colors"
                          >
                            {conference.organizer_contacts.phone}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Organizers Section */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">
                Организаторы конференции
              </h2>
              <div className="flex flex-wrap justify-center items-center gap-12 max-w-4xl mx-auto">
                <div className="flex items-center justify-center w-48 h-32 p-4 bg-white rounded-lg border border-slate-200">
                  <div className="relative w-full h-full">
                    <Image
                      src="/images/xishan-logo-new.png"
                      alt="Xishan"
                      fill
                      className="object-contain"
                      priority
                    />
                  </div>
                </div>
                <div className="flex items-center justify-center w-48 h-32 p-4 bg-white rounded-lg border border-slate-200">
                  <div className="relative w-full h-full">
                    <Image
                      src="/images/logo.png"
                      alt="Зенит"
                      fill
                      className="object-contain"
                      priority
                    />
                  </div>
                </div>
                <div className="flex items-center justify-center w-48 h-32 p-4 bg-white rounded-lg border border-slate-200">
                  <div className="relative w-full h-full">
                    <Image
                      src="/images/new_logo_clinic.png"
                      alt="Клиника доктора Одинцова"
                      fill
                      className="object-contain"
                      priority
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Speakers Section - 4 cards per row */}
            {conference.speakers && conference.speakers.length > 0 && (() => {
              const speakers = getSpeakers(conference.speakers);
              const presidiumMembers = getPresidiumMembers(conference.speakers);
              
              return (
                <>
                  {/* Speakers (people who give talks) */}
                  {speakers.length > 0 && (
                    <section>
                      <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Users className="w-6 h-6 text-teal-600" />
                        Докладчики конференции
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {speakers.map((speaker) => (
                          <SpeakerCard key={speaker.id} speaker={speaker} />
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Presidium members */}
                  {presidiumMembers.length > 0 && (
                    <section>
                      <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Users className="w-6 h-6 text-teal-600" />
                        Президиум конференции
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {presidiumMembers.map((speaker) => (
                          <SpeakerCard key={speaker.id} speaker={speaker} />
                        ))}
                      </div>
                    </section>
                  )}
                </>
              );
            })()}

            {/* Program Schedule - Structured or Legacy */}
            {conference.program && conference.program.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Программа конференции</h2>
                {isStructuredProgram(conference.program) ? (
                  <ConferenceSchedule 
                    program={conference.program as ProgramItem[]} 
                    speakers={conference.speakers || []} 
                  />
                ) : (
                  <Card>
                    <CardContent className="p-6">
                      <ul className="space-y-3">
                        {(conference.program as string[]).map((item, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-teal-500 mt-0.5 flex-shrink-0" />
                            <span className="text-slate-700">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </section>
            )}

            {/* Countdown Timer for upcoming events */}
            {upcoming && (
              <section className="text-center">
                <h3 className="text-lg font-bold text-slate-900 mb-4">До начала мероприятия</h3>
                <CountdownTimer targetDate={parseDate(conference.date)} />
              </section>
            )}

            {/* Videos from previous events */}
            {conference.videos && conference.videos.length > 0 && (
              <ConferenceVideos videos={conference.videos} />
            )}

            {/* Additional Info */}
            {conference.additional_info && (
              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Дополнительная информация</h2>
                <Card>
                  <CardContent className="p-6">
                    <div className="prose prose-slate max-w-none">
                      {conference.additional_info.split('\n').map((paragraph, index) => (
                        <p key={index} className="text-slate-700">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}
        </div>

        {/* Registration Form */}
        {upcoming && (
          <section id="register" className="mt-16 scroll-mt-24">
            <Card className="max-w-2xl mx-auto">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">
                  Регистрация на мероприятие
                </h2>
                <ConferenceRegistrationForm conferenceId={conference.id} conferenceTitle={conference.title} />
              </CardContent>
            </Card>
          </section>
        )}

        {/* Navigation */}
        <div className="mt-12 pt-8 border-t border-slate-200">
          <Button variant="outline" asChild>
            <Link href="/conferences" className="gap-2">
              <ChevronLeft className="w-4 h-4" /> Все мероприятия
            </Link>
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export async function generateMetadata({ params }: ConferencePageProps): Promise<import('next').Metadata> {
  const { id } = await params;
  const conference = await getConference(id);

  if (!conference) {
    return {
      title: 'Мероприятие не найдено',
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fibroadenoma.net';
  const defaultImage = `${siteUrl}/images/logo.png`;
  
  // Если cover_image относительный путь, делаем его абсолютным
  let ogImage = defaultImage;
  if (conference.cover_image) {
    ogImage = conference.cover_image.startsWith('http') 
      ? conference.cover_image 
      : `${siteUrl}${conference.cover_image.startsWith('/') ? '' : '/'}${conference.cover_image}`;
  }

  return {
    title: `${conference.title} | Мероприятия`,
    description: conference.description || `${conference.type}: ${conference.title}`,
    openGraph: {
      title: conference.title,
      description: conference.description || undefined,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: conference.title,
        },
      ],
      type: 'article',
      locale: 'ru_RU',
    },
    twitter: {
      card: 'summary_large_image',
      title: conference.title,
      description: conference.description || undefined,
      images: [ogImage],
    },
  };
}
