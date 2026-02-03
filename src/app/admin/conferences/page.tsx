'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, CheckCircle, XCircle, Users, Calendar, Image as ImageIcon, Eye, Link2 } from 'lucide-react';
import { getCsrfToken } from '@/lib/csrf-client';

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
    if (!confirm('Вы уверены, что хотите удалить это мероприятие?')) return;

    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`/api/conferences/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'x-csrf-token': csrfToken }
      });

      if (response.ok) {
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
        <h1 className="text-3xl font-bold text-slate-900">Мероприятия</h1>
        <Button asChild>
          <Link href="/admin/conferences/create">
            <Plus className="w-4 h-4 mr-2" />
            Добавить мероприятие
          </Link>
        </Button>
      </div>

      {conferences.length === 0 ? (
        <Card>
          <CardContent className="py-8">
             <div className="text-center text-slate-500">
                Нет мероприятий
             </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {conferences.map((item) => {
            const speakersCount = item.speakers?.length || 0;
            
            return (
              <Card key={item.id} className="flex flex-col h-full bg-slate-50 border shadow-sm overflow-hidden">
                {/* Cover Image Preview */}
                {item.cover_image ? (
                  <div className="relative h-36 overflow-hidden">
                    <img 
                      src={item.cover_image} 
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    <Badge 
                      variant={item.status === 'published' ? 'default' : 'secondary'} 
                      className="absolute top-2 left-2"
                    >
                      {item.status === 'published' ? 'Опубликовано' : 'Черновик'}
                    </Badge>
                  </div>
                ) : (
                  <div className="h-24 bg-slate-200 flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-slate-400" />
                  </div>
                )}
                
                <CardHeader className="pb-2">
                  {!item.cover_image && (
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <Badge variant={item.status === 'published' ? 'default' : 'secondary'}>
                        {item.status === 'published' ? 'Опубликовано' : 'Черновик'}
                      </Badge>
                    </div>
                  )}
                  <CardTitle className="text-lg font-bold line-clamp-2 leading-tight" title={item.title}>
                    {item.title}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="flex-grow space-y-2 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>{formatDate(item.date, item.date_end)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{item.type}</Badge>
                    {speakersCount > 0 && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Users className="w-3 h-3" />
                        {speakersCount}
                      </span>
                    )}
                  </div>
                  {item.location && (
                    <p className="text-xs text-slate-500 truncate">{item.location}</p>
                  )}
                  {item.slug && (
                    <div className="flex items-center gap-1 text-xs text-teal-600 bg-teal-50 rounded px-2 py-1">
                      <Link2 className="w-3 h-3" />
                      <span className="truncate">/{item.slug}</span>
                    </div>
                  )}
                </CardContent>
                
                <CardFooter className="flex justify-between gap-2 pt-4 border-t">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    asChild
                    title={`Посмотреть на сайте${item.slug ? ` (/${item.slug})` : ''}`}
                  >
                    <Link href={`/conferences/${item.slug || item.id}`} target="_blank">
                      <Eye className="w-4 h-4 text-slate-500" />
                    </Link>
                  </Button>
                  
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => togglePublish(item)}
                      title={item.status === 'published' ? 'Снять с публикации' : 'Опубликовать'}
                    >
                      {item.status === 'published' ? (
                        <XCircle className="w-4 h-4 text-orange-500" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/conferences/${item.id}`}>
                        <Pencil className="w-4 h-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
