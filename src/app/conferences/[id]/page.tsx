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
import { isUUID } from '@/lib/slug';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  CheckCircle, 
  ChevronLeft,
  Phone,
  Mail,
  MessageCircle,
  User
} from 'lucide-react';

interface Speaker {
  id: string;
  name: string;
  photo: string;
  credentials: string;
  report_title: string;
  report_time: string;
}

interface OrganizerContacts {
  name?: string;
  phone?: string;
  email?: string;
  additional?: string;
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
  organizer_contacts?: OrganizerContacts;
  additional_info?: string;
}

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
          <div className="relative h-[300px] md:h-[400px]">
            <Image
              src={conference.cover_image}
              alt={conference.title}
              fill
              sizes="100vw"
              className="object-cover"
              unoptimized
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

      <main className="container mx-auto px-4 md:px-6 py-12 max-w-5xl">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
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

            {/* Speakers */}
            {conference.speakers && conference.speakers.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Users className="w-6 h-6 text-teal-600" />
                  Спикеры
                </h2>
                <div className="grid gap-4">
                  {conference.speakers.map((speaker, index) => (
                    <Card key={speaker.id || index} className="overflow-hidden">
                      <CardContent className="p-0">
                        <div className="flex flex-col sm:flex-row">
                          {/* Photo */}
                          <div className="sm:w-32 md:w-40 flex-shrink-0">
                            {speaker.photo ? (
                              <div className="relative w-full h-32 sm:h-full">
                                <Image
                                  src={speaker.photo}
                                  alt={speaker.name}
                                  fill
                                  sizes="(max-width: 640px) 128px, 160px"
                                  className="object-cover"
                                  unoptimized
                                />
                              </div>
                            ) : (
                              <div className="w-full h-32 sm:h-full bg-slate-100 flex items-center justify-center">
                                <User className="w-12 h-12 text-slate-300" />
                              </div>
                            )}
                          </div>
                          
                          {/* Info */}
                          <div className="p-4 sm:p-6 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                              <h3 className="text-lg font-bold text-slate-900">{speaker.name}</h3>
                              {speaker.report_time && (
                                <Badge variant="outline" className="text-xs">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {speaker.report_time}
                                </Badge>
                              )}
                            </div>
                            {speaker.credentials && (
                              <p className="text-sm text-slate-500 mb-3">{speaker.credentials}</p>
                            )}
                            {speaker.report_title && (
                              <div className="bg-slate-50 rounded-lg p-3">
                                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Тема доклада</p>
                                <p className="text-slate-700 font-medium">{speaker.report_title}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Program */}
            {conference.program && conference.program.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Программа</h2>
                <Card>
                  <CardContent className="p-6">
                    <ul className="space-y-3">
                      {conference.program.map((item, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-teal-500 mt-0.5 flex-shrink-0" />
                          <span className="text-slate-700">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </section>
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

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Countdown Timer for upcoming events */}
            {upcoming && (
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4 text-center">До начала мероприятия</h3>
                <CountdownTimer targetDate={parseDate(conference.date)} />
              </div>
            )}
            
            {/* Event Details Card */}
            <Card className="sticky top-24">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3 text-slate-700">
                  <Calendar className="w-5 h-5 text-teal-600" />
                  <div>
                    <p className="text-xs text-slate-400 uppercase">Дата</p>
                    <p className="font-medium">{formatDateRange(conference.date, conference.date_end)}</p>
                  </div>
                </div>

                {conference.location && (
                  <div className="flex items-center gap-3 text-slate-700">
                    <MapPin className="w-5 h-5 text-teal-600" />
                    <div>
                      <p className="text-xs text-slate-400 uppercase">Место</p>
                      <p className="font-medium">{conference.location}</p>
                    </div>
                  </div>
                )}

                {conference.cme_hours && conference.cme_hours > 0 && (
                  <div className="flex items-center gap-3 text-slate-700">
                    <Clock className="w-5 h-5 text-teal-600" />
                    <div>
                      <p className="text-xs text-slate-400 uppercase">Часы CME</p>
                      <p className="font-medium">{conference.cme_hours} часов</p>
                    </div>
                  </div>
                )}

                {conference.speakers && conference.speakers.length > 0 && (
                  <div className="flex items-center gap-3 text-slate-700">
                    <Users className="w-5 h-5 text-teal-600" />
                    <div>
                      <p className="text-xs text-slate-400 uppercase">Спикеры</p>
                      <p className="font-medium">{conference.speakers.length} {conference.speakers.length === 1 ? 'спикер' : conference.speakers.length < 5 ? 'спикера' : 'спикеров'}</p>
                    </div>
                  </div>
                )}

                {upcoming && (
                  <div className="pt-4 border-t">
                    <Button asChild className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                      <a href="#register">Зарегистрироваться</a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Organizer Contacts */}
            {hasContacts && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-bold text-slate-900 mb-4">Контакты организаторов</h3>
                  <div className="space-y-3">
                    {conference.organizer_contacts?.name && (
                      <div className="flex items-center gap-2 text-slate-700">
                        <User className="w-4 h-4 text-slate-400" />
                        <span>{conference.organizer_contacts.name}</span>
                      </div>
                    )}
                    {conference.organizer_contacts?.phone && (
                      <a 
                        href={`tel:${conference.organizer_contacts.phone}`}
                        className="flex items-center gap-2 text-slate-700 hover:text-teal-600 transition-colors"
                      >
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span>{conference.organizer_contacts.phone}</span>
                      </a>
                    )}
                    {conference.organizer_contacts?.email && (
                      <a 
                        href={`mailto:${conference.organizer_contacts.email}`}
                        className="flex items-center gap-2 text-slate-700 hover:text-teal-600 transition-colors"
                      >
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span>{conference.organizer_contacts.email}</span>
                      </a>
                    )}
                    {conference.organizer_contacts?.additional && (
                      <div className="flex items-center gap-2 text-slate-700">
                        <MessageCircle className="w-4 h-4 text-slate-400" />
                        <span>{conference.organizer_contacts.additional}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
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

  return {
    title: `${conference.title} | Мероприятия`,
    description: conference.description || `${conference.type}: ${conference.title}`,
    openGraph: {
      title: conference.title,
      description: conference.description || undefined,
      images: conference.cover_image ? [conference.cover_image] : undefined,
      type: 'article',
      locale: 'ru_RU',
    },
  };
}
