'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, CheckCircle, XCircle, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface NewsItem {
  id: string;
  title: string;
  date: string;
  status: string;
  category?: string;
  images?: string[];
}

export default function AdminNewsList() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    setLoading(true);
    try {
      // Get session for auth header
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/news', {
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setNews(data);
      }
    } catch (error) {
      console.error('Error loading news:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту новость?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/news/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`
        }
      });

      if (response.ok) {
        loadNews();
      } else {
        alert('Ошибка удаления');
      }
    } catch (error) {
      console.error('Error deleting news:', error);
    }
  };

  const togglePublish = async (item: NewsItem) => {
    const newStatus = item.status === 'published' ? 'draft' : 'published';
    
    // Optimistic update
    setNews(news.map(n => n.id === item.id ? { ...n, status: newStatus } : n));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      // Need to fetch full item first because PUT replaces everything
      const itemResponse = await fetch(`/api/news/${item.id}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`
        }
      });
      
      if (itemResponse.ok) {
        const fullItem = await itemResponse.json();
        const response = await fetch(`/api/news/${item.id}`, {
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
           // Revert
           loadNews();
           alert('Ошибка обновления статуса');
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
      loadNews();
    }
  };

  if (loading) {
    return <div>Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Новости</h1>
        <Button asChild>
          <Link href="/admin/news/create">
            <Plus className="w-4 h-4 mr-2" />
            Добавить новость
          </Link>
        </Button>
      </div>


      {news.length === 0 ? (
        <Card>
          <CardContent className="py-8">
             <div className="text-center text-slate-500">
                Нет новостей
             </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {news.map((item) => (
            <Card key={item.id} className="flex flex-col h-full bg-slate-50 border shadow-sm">
              <div className="relative h-48 w-full overflow-hidden bg-slate-200 rounded-t-xl">
                {item.images && item.images.length > 0 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={item.images[0]} 
                    alt={item.title}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                    <ImageIcon className="w-10 h-10 opacity-20" />
                  </div>
                )}
              </div>
              <CardHeader className="pb-4 pt-4">
                <div className="flex justify-between items-start gap-2">
                  <Badge variant={item.status === 'published' ? 'default' : 'secondary'} className="mb-2">
                    {item.status === 'published' ? 'Опубликовано' : 'Черновик'}
                  </Badge>
                  <div className="text-xs text-slate-500 whitespace-nowrap">{item.date}</div>
                </div>
                <CardTitle className="text-lg font-bold line-clamp-3 leading-tight min-h-[4.5rem]" title={item.title}>
                  {item.title}
                </CardTitle>
                {item.category && <div className="text-xs text-muted-foreground mt-2">{item.category}</div>}
              </CardHeader>
              <CardContent className="flex-grow">
                {/* Content spacer if needed */}
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
                    <Link href={`/admin/news/${item.id}`}>
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

