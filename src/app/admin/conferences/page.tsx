'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Conference {
  id: string;
  title: string;
  date: string;
  type: string;
  status: string;
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
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/conferences/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`
        }
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
    
    // Optimistic update
    setConferences(conferences.map(n => n.id === item.id ? { ...n, status: newStatus } : n));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      // Fetch full item first
      const itemResponse = await fetch(`/api/conferences/${item.id}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }
      });
      
      if (itemResponse.ok) {
        const fullItem = await itemResponse.json();
        const response = await fetch(`/api/conferences/${item.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`
          },
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
          {conferences.map((item) => (
            <Card key={item.id} className="flex flex-col h-full bg-slate-50 border shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start gap-2">
                  <Badge variant={item.status === 'published' ? 'default' : 'secondary'} className="mb-2">
                    {item.status === 'published' ? 'Опубликовано' : 'Черновик'}
                  </Badge>
                  <div className="text-xs text-slate-500 whitespace-nowrap">{item.date}</div>
                </div>
                <CardTitle className="text-lg font-bold line-clamp-3 leading-tight min-h-[4.5rem]" title={item.title}>
                  {item.title}
                </CardTitle>
                <div className="mt-2">
                  <Badge variant="outline">{item.type}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                {/* Spacer */}
              </CardContent>
              <CardFooter className="flex justify-end gap-2 pt-4 border-t">
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
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

