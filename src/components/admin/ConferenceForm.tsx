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

interface ConferenceFormProps {
  initialData?: any;
  isEditing?: boolean;
}

export function ConferenceForm({ initialData, isEditing = false }: ConferenceFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    date: initialData?.date || new Date().toISOString().split('T')[0], // YYYY-MM-DD
    description: initialData?.description || '',
    type: initialData?.type || 'Конференция',
    location: initialData?.location || '',
    speaker: initialData?.speaker || '',
    cme_hours: initialData?.cme_hours || 0,
    status: initialData?.status || 'published',
    program: initialData?.program || [],
    materials: initialData?.materials || []
  });

  const [newProgramItem, setNewProgramItem] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleProgramAdd = () => {
    if (!newProgramItem.trim()) return;
    setFormData(prev => ({
      ...prev,
      program: [...prev.program, newProgramItem]
    }));
    setNewProgramItem('');
  };

  const handleProgramRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      program: prev.program.filter((_: any, i: number) => i !== index)
    }));
  };

  const toggleMaterial = (material: string) => {
    setFormData(prev => {
      const materials = prev.materials.includes(material)
        ? prev.materials.filter((m: string) => m !== material)
        : [...prev.materials, material];
      return { ...prev, materials };
    });
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
      
      const url = isEditing ? `/api/conferences/${initialData.id}` : '/api/conferences';
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

      router.push('/admin/conferences');
      router.refresh();
    } catch (error: any) {
      console.error('Error saving conference:', error);
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
            <Label htmlFor="title">Название</Label>
            <Input id="title" name="title" value={formData.title} onChange={handleChange} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea 
              id="description" 
              name="description" 
              value={formData.description} 
              onChange={handleChange} 
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Тип</Label>
            <select 
              id="type" 
              name="type" 
              value={formData.type} 
              onChange={handleChange}
              className="w-full border rounded-md p-2 bg-white"
            >
              <option value="Конференция">Конференция</option>
              <option value="Мастер-класс">Мастер-класс</option>
              <option value="Выставка">Выставка</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Дата</Label>
              <Input id="date" name="date" type="text" placeholder="YYYY-MM-DD or DD.MM.YYYY" value={formData.date} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cme_hours">Часы CME</Label>
              <Input id="cme_hours" name="cme_hours" type="number" value={formData.cme_hours} onChange={handleChange} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Локация</Label>
            <Input id="location" name="location" value={formData.location} onChange={handleChange} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="speaker">Спикер</Label>
            <Input id="speaker" name="speaker" value={formData.speaker} onChange={handleChange} />
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

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <Label className="mb-2 block">Программа</Label>
            <div className="flex gap-2 mb-4">
              <Input value={newProgramItem} onChange={(e) => setNewProgramItem(e.target.value)} placeholder="Пункт программы" />
              <Button type="button" onClick={handleProgramAdd}><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-2">
              {formData.program.map((item: string, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm bg-slate-50 p-2 rounded">
                  <span className="truncate flex-1">{item}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleProgramRemove(i)}><X className="w-4 h-4" /></Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Label className="mb-4 block">Доступные материалы</Label>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="mat-video" 
                  checked={formData.materials.includes('video')} 
                  onChange={() => toggleMaterial('video')} 
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="mat-video">Видео</label>
              </div>
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="mat-photo" 
                  checked={formData.materials.includes('photo')} 
                  onChange={() => toggleMaterial('photo')} 
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="mat-photo">Фото</label>
              </div>
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="mat-doc" 
                  checked={formData.materials.includes('doc')} 
                  onChange={() => toggleMaterial('doc')} 
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="mat-doc">Отчет (Документ)</label>
              </div>
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

