'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { Loader2, Plus, X } from 'lucide-react';
import { FileUpload } from '@/components/admin/FileUpload';

interface NewsFormProps {
  initialData?: any;
  isEditing?: boolean;
}

export function NewsForm({ initialData, isEditing = false }: NewsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    shortDescription: initialData?.shortDescription || '',
    fullDescription: initialData?.fullDescription || '',
    date: initialData?.date || new Date().toLocaleDateString('ru-RU'),
    year: initialData?.year || new Date().getFullYear().toString(),
    category: initialData?.category || '',
    location: initialData?.location || '',
    author: initialData?.author || '',
    status: initialData?.status || 'published',
    images: initialData?.images || [],
    videos: initialData?.videos || [],
    documents: initialData?.documents || [],
    tags: initialData?.tags || []
  });

  const [newTag, setNewTag] = useState('');
  const [newImage, setNewImage] = useState('');
  const [newVideo, setNewVideo] = useState('');
  const [newDoc, setNewDoc] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleArrayAdd = (field: 'images' | 'videos' | 'documents' | 'tags', value: string, setter: (v: string) => void) => {
    if (!value.trim()) return;
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], value]
    }));
    setter('');
  };

  const handleArrayRemove = (field: 'images' | 'videos' | 'documents' | 'tags', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_: any, i: number) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Auth check with bypass support
      const bypassStorage = localStorage.getItem('sb-admin-bypass');
      let sessionToken = '';

      if (!bypassStorage) {
        // Refresh session before request to ensure token is valid
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
           throw new Error('Unauthorized: No active session');
        }
        sessionToken = session.access_token;
      }

      const url = isEditing ? `/api/news/${initialData.id}` : '/api/news';
      const method = isEditing ? 'PUT' : 'POST';

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (bypassStorage === 'true') {
        headers['X-Admin-Bypass'] = 'true';
      } else {
        headers['Authorization'] = `Bearer ${sessionToken}`;
      }

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save');
      }

      router.push('/admin/news');
      router.refresh();
    } catch (error: any) {
      console.error('Error saving news:', error);
      alert(`Ошибка сохранения: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Заголовок</Label>
            <Input id="title" name="title" value={formData.title} onChange={handleChange} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shortDescription">Краткое описание</Label>
            <Textarea 
              id="shortDescription" 
              name="shortDescription" 
              value={formData.shortDescription} 
              onChange={handleChange} 
              required 
              className="min-h-[100px] border rounded-md w-full p-2"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullDescription">Полное описание</Label>
            <Textarea 
              id="fullDescription" 
              name="fullDescription" 
              value={formData.fullDescription} 
              onChange={handleChange} 
              required 
              className="min-h-[200px] border rounded-md w-full p-2"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Дата (DD.MM.YYYY)</Label>
              <Input id="date" name="date" value={formData.date} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Год</Label>
              <Input id="year" name="year" value={formData.year} onChange={handleChange} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Категория</Label>
            <Input id="category" name="category" value={formData.category} onChange={handleChange} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Локация</Label>
            <Input id="location" name="location" value={formData.location} onChange={handleChange} />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="status">Статус</Label>
            <select 
              id="status" 
              name="status" 
              value={formData.status} 
              onChange={handleChange}
              className="w-full border rounded-md p-2 bg-white"
            >
              <option value="draft">Черновик</option>
              <option value="published">Опубликовано</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Images */}
        <Card>
          <CardContent className="pt-6">
            <Label className="mb-2 block">Изображения (URL)</Label>
            <div className="flex gap-2 mb-4">
              <Input value={newImage} onChange={(e) => setNewImage(e.target.value)} placeholder="/images/..." />
              <FileUpload onUpload={(url) => setNewImage(url)} folder="news/images" />
              <Button type="button" onClick={() => handleArrayAdd('images', newImage, setNewImage)}><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              {formData.images.map((img: string, i: number) => (
                <div key={i} className="group relative aspect-video bg-slate-100 rounded-lg overflow-hidden border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={img} 
                    alt={`Image ${i + 1}`} 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button 
                      type="button" 
                      variant="destructive" 
                      size="icon"
                      onClick={() => handleArrayRemove('images', i)}
                      className="h-8 w-8"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1">
                    <p className="text-[10px] text-white truncate px-1">{img.split('/').pop()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Videos */}
        <Card>
          <CardContent className="pt-6">
            <Label className="mb-2 block">Видео (URL)</Label>
            <div className="flex gap-2 mb-4">
              <Input value={newVideo} onChange={(e) => setNewVideo(e.target.value)} placeholder="/videos/..." />
              <FileUpload onUpload={(url) => setNewVideo(url)} folder="news/videos" accept="video/*" />
              <Button type="button" onClick={() => handleArrayAdd('videos', newVideo, setNewVideo)}><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-2">
              {formData.videos.map((vid: string, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm bg-slate-50 p-2 rounded">
                  <span className="truncate flex-1">{vid}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleArrayRemove('videos', i)}><X className="w-4 h-4" /></Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardContent className="pt-6">
            <Label className="mb-2 block">Документы (URL)</Label>
            <div className="flex gap-2 mb-4">
              <Input value={newDoc} onChange={(e) => setNewDoc(e.target.value)} placeholder="/docs/..." />
              <FileUpload onUpload={(url) => setNewDoc(url)} folder="news/documents" accept=".pdf,.doc,.docx" />
              <Button type="button" onClick={() => handleArrayAdd('documents', newDoc, setNewDoc)}><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-2">
              {formData.documents.map((doc: string, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm bg-slate-50 p-2 rounded">
                  <span className="truncate flex-1">{doc}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleArrayRemove('documents', i)}><X className="w-4 h-4" /></Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardContent className="pt-6">
            <Label className="mb-2 block">Теги</Label>
            <div className="flex gap-2 mb-4">
              <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="Тег..." />
              <Button type="button" onClick={() => handleArrayAdd('tags', newTag, setNewTag)}><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag: string, i: number) => (
                <div key={i} className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-sm">
                  <span>{tag}</span>
                  <button type="button" onClick={() => handleArrayRemove('tags', i)} className="text-slate-500 hover:text-red-500"><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>Отмена</Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Сохранить
        </Button>
      </div>
    </form>
  );
}
