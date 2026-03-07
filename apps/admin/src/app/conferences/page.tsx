'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, CheckCircle, XCircle, Users, Calendar, Image as ImageIcon, Eye, Link2, MapPin } from 'lucide-react';
import { getCsrfToken } from '@/lib/csrf-client';
import { toPublicUrl } from '@/lib/public-url';


interface Speaker {
  id: string;
  name: string;
  photo: string;
}

interface Conference {
  id: string;
  slug?: string;
  title: string;
  date: string;
  date_end?: string;
  type: string;
  status: string;
  cover_image?: string;
  speakers?: Speaker[];
  location?: string;
}

export default function AdminConferencesList() {
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    loadConferences();
  }, []);

  const loadConferences = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/conferences');
      if (response.ok) {
        const data = await response.json();
        setConferences(data);
      }
    } catch (error) {
      console.error('Error loading conferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`/api/conferences/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'x-csrf-token': csrfToken }
      });

      if (response.ok) {
        setDeleteConfirmId(null);
        loadConferences();
      } else {
        alert('Ошибка удаления');
      }
    } catch (error) {
      console.error('Error deleting conference:', error);
    }
  };

  const togglePublish = async (item: Conference) => {
    const newStatus = item.status === 'published' ? 'draft' : 'published';
    
    setConferences(conferences.map(n => n.id === item.id ? { ...n, status: newStatus } : n));

    try {
      const itemResponse = await fetch(`/api/conferences/${item.id}`, { credentials: 'include' });
      
      if (itemResponse.ok) {
        const fullItem = await itemResponse.json();
        const csrfToken = await getCsrfToken();
        const response = await fetch(`/api/conferences/${item.id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
          body: JSON.stringify({
            ...fullItem,
            status: newStatus
          })
        });

        if (!response.ok) {
           loadConferences();
           alert('Ошибка обновления статуса');
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
      loadConferences();
    }
  };

  const formatDate = (date: string, dateEnd?: string) => {
    if (dateEnd) {
      return `${date} — ${dateEnd}`;
    }
    return date;
  };

  if (loading) {
    return <div>Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-[var(--frox-gray-1100)]">Мероприятия</h1>
        <Button asChild>
          <Link href="/conferences/create">
            <Plus className="w-4 h-4 mr-2" />
            Добавить мероприятие
          </Link>
        </Button>
      </div>

      {conferences.length === 0 ? (
        <Card>
          <CardContent className="py-8">
             <div className="text-center text-[var(--frox-gray-500)]">
                Нет мероприятий
             </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-1.5">
          {conferences.map((item) => {
            const speakersCount = item.speakers?.length || 0;

            return (
              <div
                key={item.id}
                className="group flex items-center gap-3 bg-white border border-[var(--frox-neutral-border)] rounded-xl px-3 py-2 hover:shadow-sm transition-all"
              >
                {/* Thumbnail */}
                <div className="relative w-32 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-[var(--frox-gray-100)]">
                  {item.cover_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={toPublicUrl(item.cover_image)}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-[var(--frox-gray-400)]" />
                    </div>
                  )}
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Calendar className="w-3 h-3 text-[var(--frox-gray-400)]" />
                    <span className="text-xs text-[var(--frox-gray-400)]">{formatDate(item.date, item.date_end)}</span>
                    <Badge variant="outline" className="text-xs py-0 px-1.5 h-4">{item.type}</Badge>
                    <Badge
                      variant={item.status === 'published' ? 'default' : 'secondary'}
                      className="text-xs py-0 px-1.5 h-4"
                    >
                      {item.status === 'published' ? 'Опубл.' : 'Черновик'}
                    </Badge>
                  </div>
                  <Link href={`/conferences/${item.id}`} className="block">
                    <h3 className="text-sm font-semibold text-[var(--frox-gray-1100)] line-clamp-1 group-hover:text-teal-600 transition-colors">
                      {item.title}
                    </h3>
                  </Link>
                  <div className="flex items-center gap-3 mt-0.5">
                    {item.location && (
                      <span className="flex items-center gap-1 text-xs text-[var(--frox-gray-500)] truncate">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        {item.location}
                      </span>
                    )}
                    {speakersCount > 0 && (
                      <span className="flex items-center gap-1 text-xs text-[var(--frox-gray-500)]">
                        <Users className="w-3 h-3" />
                        {speakersCount}
                      </span>
                    )}
                    {item.slug && (
                      <span className="flex items-center gap-1 text-xs text-teal-600">
                        <Link2 className="w-3 h-3" />
                        /{item.slug}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-0.5 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    title="Посмотреть на сайте"
                    className="h-7 w-7 p-0"
                  >
                    <a href={toPublicUrl(`/conferences/${item.slug || item.id}`)} target="_blank" rel="noreferrer">
                      <Eye className="w-4 h-4 text-[var(--frox-gray-500)]" />
                    </a>
                  </Button>
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
                    <Link href={`/conferences/${item.id}`}>
                      <Pencil className="w-4 h-4" />
                    </Link>
                  </Button>
                  {deleteConfirmId === item.id ? (
                    <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
                      <span className="text-xs text-red-700 whitespace-nowrap">Удалить?</span>
                      <button onClick={() => handleDelete(item.id)} className="text-xs bg-red-500 hover:bg-red-600 text-white px-1.5 py-0.5 rounded">Да</button>
                      <button onClick={() => setDeleteConfirmId(null)} className="text-xs text-[var(--frox-gray-500)] hover:text-[var(--frox-gray-800)]">Нет</button>
                    </div>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmId(item.id)} className="h-7 w-7 p-0">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
