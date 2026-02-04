'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { generateSlug, isValidSlug } from '@/lib/slug';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUpload } from '@/components/admin/FileUpload';
import { Loader2, Plus, X, User, Image as ImageIcon, ChevronUp, ChevronDown, Link2, RefreshCw } from 'lucide-react';

interface Speaker {
  id: string;
  name: string;
  photo: string;
  credentials: string;
  report_title: string;
  report_time: string;
}

interface OrganizerContacts {
  name: string;
  phone: string;
  email: string;
  additional: string;
}

interface ConferenceFormProps {
  initialData?: any;
  isEditing?: boolean;
}

const generateId = () => Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

export function ConferenceForm({ initialData, isEditing = false }: ConferenceFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(!!initialData?.slug);
  const [slugError, setSlugError] = useState('');
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    slug: initialData?.slug || '',
    date: initialData?.date || new Date().toISOString().split('T')[0],
    date_end: initialData?.date_end || '',
    description: initialData?.description || '',
    type: initialData?.type || 'Конференция',
    location: initialData?.location || '',
    speaker: initialData?.speaker || '', // legacy field
    cme_hours: initialData?.cme_hours || 0,
    status: initialData?.status || 'published',
    program: initialData?.program || [],
    materials: initialData?.materials || [],
    cover_image: initialData?.cover_image || '',
    speakers: (initialData?.speakers || []) as Speaker[],
    organizer_contacts: (initialData?.organizer_contacts || {
      name: '',
      phone: '',
      email: '',
      additional: ''
    }) as OrganizerContacts,
    additional_info: initialData?.additional_info || ''
  });

  const [newProgramItem, setNewProgramItem] = useState('');

  // Автогенерация slug из названия (только если не редактировался вручную)
  useEffect(() => {
    if (!slugManuallyEdited && formData.title && !isEditing) {
      const newSlug = generateSlug(formData.title);
      setFormData(prev => ({ ...prev, slug: newSlug }));
    }
  }, [formData.title, slugManuallyEdited, isEditing]);

  // Валидация slug при изменении
  useEffect(() => {
    if (formData.slug && !isValidSlug(formData.slug)) {
      setSlugError('Используйте только латинские буквы, цифры и дефисы');
    } else {
      setSlugError('');
    }
  }, [formData.slug]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOrganizerChange = (field: keyof OrganizerContacts, value: string) => {
    setFormData(prev => ({
      ...prev,
      organizer_contacts: {
        ...prev.organizer_contacts,
        [field]: value
      }
    }));
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

  // Speaker management
  const addSpeaker = () => {
    const newSpeaker: Speaker = {
      id: generateId(),
      name: '',
      photo: '',
      credentials: '',
      report_title: '',
      report_time: ''
    };
    setFormData(prev => ({
      ...prev,
      speakers: [...prev.speakers, newSpeaker]
    }));
  };

  const updateSpeaker = (id: string, field: keyof Speaker, value: string) => {
    setFormData(prev => ({
      ...prev,
      speakers: prev.speakers.map(s => 
        s.id === id ? { ...s, [field]: value } : s
      )
    }));
  };

  const removeSpeaker = (id: string) => {
    setFormData(prev => ({
      ...prev,
      speakers: prev.speakers.filter(s => s.id !== id)
    }));
  };

  const moveSpeaker = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= formData.speakers.length) return;
    
    setFormData(prev => {
      const newSpeakers = [...prev.speakers];
      [newSpeakers[index], newSpeakers[newIndex]] = [newSpeakers[newIndex], newSpeakers[index]];
      return { ...prev, speakers: newSpeakers };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Валидация slug перед отправкой
    if (formData.slug && !isValidSlug(formData.slug)) {
      alert('Некорректный slug. Используйте только латинские буквы, цифры и дефисы.');
      return;
    }
    
    setLoading(true);

    try {
      const url = isEditing ? `/api/conferences/${initialData.id}` : '/api/conferences';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
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
      {/* Basic Info */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Название *</Label>
            <Input id="title" name="title" value={formData.title} onChange={handleChange} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug" className="flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              URL (slug)
            </Label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input 
                  id="slug" 
                  name="slug" 
                  value={formData.slug} 
                  onChange={(e) => {
                    setSlugManuallyEdited(true);
                    handleChange(e);
                  }}
                  placeholder="miniinvazivnaya-hirurgiya-2026"
                  className={slugError ? 'border-red-300' : ''}
                />
                {slugError && (
                  <p className="text-xs text-red-500 mt-1">{slugError}</p>
                )}
              </div>
              <Button 
                type="button" 
                variant="outline" 
                size="icon"
                onClick={() => {
                  const newSlug = generateSlug(formData.title);
                  setFormData(prev => ({ ...prev, slug: newSlug }));
                  setSlugManuallyEdited(false);
                }}
                title="Сгенерировать из названия"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            {formData.slug && (
              <p className="text-xs text-slate-500">
                URL: /conferences/<span className="font-medium text-teal-600">{formData.slug}</span>
              </p>
            )}
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
              <option value="Семинар">Семинар</option>
              <option value="Вебинар">Вебинар</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Дата начала *</Label>
              <Input id="date" name="date" type="date" value={formData.date} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_end">Дата окончания</Label>
              <Input id="date_end" name="date_end" type="date" value={formData.date_end} onChange={handleChange} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cme_hours">Часы CME</Label>
              <Input id="cme_hours" name="cme_hours" type="number" value={formData.cme_hours} onChange={handleChange} />
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

          <div className="space-y-2">
            <Label htmlFor="location">Место проведения</Label>
            <Input id="location" name="location" value={formData.location} onChange={handleChange} placeholder="Адрес или онлайн" />
          </div>
        </div>
      </div>

      {/* Cover Image */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Обложка мероприятия
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-start">
            {formData.cover_image && (
              <div className="relative">
                <Image
                  src={formData.cover_image}
                  alt="Обложка"
                  width={192}
                  height={128}
                  className="w-48 h-32 object-cover rounded-lg border"
                  unoptimized
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute -top-2 -right-2 bg-white rounded-full shadow"
                  onClick={() => setFormData(prev => ({ ...prev, cover_image: '' }))}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
            <div className="flex-1">
              <FileUpload 
                onUpload={(data) => setFormData(prev => ({ ...prev, cover_image: data }))} 
                folder="conferences/covers" 
                mode="base64"
                accept="image/*"
              />
              <p className="text-sm text-slate-500 mt-2">Рекомендуемый размер: 1200x630 px</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Speakers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Спикеры ({formData.speakers.length})
            </span>
            <Button type="button" onClick={addSpeaker} size="sm">
              <Plus className="w-4 h-4 mr-1" /> Добавить спикера
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.speakers.length === 0 ? (
            <p className="text-slate-500 text-center py-4">Нет добавленных спикеров</p>
          ) : (
            formData.speakers.map((speaker, index) => (
              <Card key={speaker.id} className="bg-slate-50">
                <CardContent className="pt-4">
                  <div className="flex gap-4">
                    {/* Photo */}
                    <div className="flex-shrink-0">
                      {speaker.photo ? (
                        <div className="relative">
                          <Image
                            src={speaker.photo}
                            alt={speaker.name || 'Спикер'}
                            width={96}
                            height={96}
                            className="w-24 h-24 object-cover rounded-lg border"
                            unoptimized
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute -top-2 -right-2 bg-white rounded-full shadow h-6 w-6 p-0"
                            onClick={() => updateSpeaker(speaker.id, 'photo', '')}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="w-24 h-24 bg-slate-200 rounded-lg flex items-center justify-center">
                          <FileUpload 
                            onUpload={(data) => updateSpeaker(speaker.id, 'photo', data)} 
                            folder="conferences/speakers" 
                            mode="base64"
                            accept="image/*"
                          />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">ФИО *</Label>
                          <Input 
                            value={speaker.name} 
                            onChange={(e) => updateSpeaker(speaker.id, 'name', e.target.value)}
                            placeholder="Иванов Иван Иванович"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Время доклада</Label>
                          <Input 
                            value={speaker.report_time} 
                            onChange={(e) => updateSpeaker(speaker.id, 'report_time', e.target.value)}
                            placeholder="10:00 - 10:30"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Регалии, должность</Label>
                        <Textarea 
                          value={speaker.credentials} 
                          onChange={(e) => updateSpeaker(speaker.id, 'credentials', e.target.value)}
                          placeholder="Д.м.н., профессор, заведующий кафедрой..."
                          className="min-h-[60px]"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Название доклада</Label>
                        <Input 
                          value={speaker.report_title} 
                          onChange={(e) => updateSpeaker(speaker.id, 'report_title', e.target.value)}
                          placeholder="Тема выступления"
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => moveSpeaker(index, 'up')}
                        disabled={index === 0}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => moveSpeaker(index, 'down')}
                        disabled={index === formData.speakers.length - 1}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSpeaker(speaker.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      {/* Program and Materials */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <Label className="mb-2 block">Программа</Label>
            <div className="flex gap-2 mb-4">
              <Input 
                value={newProgramItem} 
                onChange={(e) => setNewProgramItem(e.target.value)} 
                placeholder="Пункт программы"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleProgramAdd())}
              />
              <Button type="button" onClick={handleProgramAdd}><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {formData.program.map((item: string, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm bg-slate-50 p-2 rounded">
                  <span className="text-slate-400 w-6">{i + 1}.</span>
                  <span className="truncate flex-1">{item}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleProgramRemove(i)}>
                    <X className="w-4 h-4" />
                  </Button>
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

      {/* Organizer Contacts */}
      <Card>
        <CardHeader>
          <CardTitle>Контакты организаторов</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="org_name">Контактное лицо</Label>
              <Input 
                id="org_name" 
                value={formData.organizer_contacts.name} 
                onChange={(e) => handleOrganizerChange('name', e.target.value)}
                placeholder="ФИО"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org_phone">Телефон</Label>
              <Input 
                id="org_phone" 
                value={formData.organizer_contacts.phone} 
                onChange={(e) => handleOrganizerChange('phone', e.target.value)}
                placeholder="+7 (999) 123-45-67"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org_email">Email</Label>
              <Input 
                id="org_email" 
                type="email"
                value={formData.organizer_contacts.email} 
                onChange={(e) => handleOrganizerChange('email', e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org_additional">Дополнительно</Label>
              <Input 
                id="org_additional" 
                value={formData.organizer_contacts.additional} 
                onChange={(e) => handleOrganizerChange('additional', e.target.value)}
                placeholder="Telegram, WhatsApp и т.д."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle>Дополнительная информация</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea 
            name="additional_info"
            value={formData.additional_info} 
            onChange={handleChange}
            placeholder="Любая дополнительная информация о мероприятии..."
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>

      {/* Submit */}
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
