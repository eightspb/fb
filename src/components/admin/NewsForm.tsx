'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Plus, X, Sparkles } from 'lucide-react';
import { FileUpload } from '@/components/admin/FileUpload';
import { MultiImageUpload } from '@/components/admin/MultiImageUpload';
import { getCsrfToken, refreshCsrfToken } from '@/lib/csrf-client';

interface NewsFormProps {
  initialData?: any;
  isEditing?: boolean;
}

export function NewsForm({ initialData, isEditing = false }: NewsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
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
    tags: initialData?.tags || [],
    imageFocalPoint: initialData?.imageFocalPoint || 'center 30%'
  });

  // Track which image is selected as the main image for the card
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Варианты позиционирования изображения
  const focalPointOptions = [
    { value: 'top', label: 'Верх', description: 'Лица/головы сверху' },
    { value: 'center 20%', label: 'Верхняя часть', description: 'Ближе к верху' },
    { value: 'center 30%', label: 'По умолчанию', description: 'Оптимально для людей' },
    { value: 'center', label: 'Центр', description: 'Объект в центре' },
    { value: 'center 70%', label: 'Нижняя часть', description: 'Ближе к низу' },
    { value: 'bottom', label: 'Низ', description: 'Важное внизу' },
  ];

  const [newTag, setNewTag] = useState('');
  const [newImage, setNewImage] = useState('');
  const [newVideo, setNewVideo] = useState('');
  const [newDoc, setNewDoc] = useState('');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await fetch('/api/news/filters');
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        }
      } catch (error) {
        console.error('Failed to load categories', error);
      }
    }
    loadCategories();
  }, []);

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

  const handleImproveDescription = async () => {
    if (!formData.fullDescription.trim()) {
      alert('Сначала введите текст в поле "Полное описание"');
      return;
    }
    
    setIsImproving(true);
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch('/api/admin/ai/improve', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ text: formData.fullDescription })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to improve text');
      }

      const data = await response.json();
      if (data.improvedText) {
        setFormData(prev => ({ ...prev, fullDescription: data.improvedText }));
        console.log('[NewsForm] Текст успешно улучшен');
      } else {
        throw new Error('Пустой ответ от сервера');
      }
    } catch (error: any) {
      console.error('Error improving text:', error);
      alert(`Ошибка при улучшении текста: ${error.message}`);
    } finally {
      setIsImproving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = isEditing ? `/api/news/${initialData.id}` : '/api/news';
      const method = isEditing ? 'PUT' : 'POST';

      // Calculate approximate payload size for logging
      const payloadSize = JSON.stringify(formData).length;
      const sizeMB = payloadSize / (1024 * 1024);
      console.log(`[NewsForm] Отправка данных: ${sizeMB.toFixed(2)}MB, изображений: ${formData.images?.length || 0}`);

      // Client-side validation
      if (formData.images && formData.images.length > 15) {
        throw new Error('Слишком много изображений. Максимум 15 изображений для одной новости.');
      }

      if (sizeMB > 35) { // Leave margin for server overhead
        throw new Error('Слишком большой размер данных. Попробуйте уменьшить количество или размер изображений.');
      }

      let csrfToken = await getCsrfToken();
      let response = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify(formData)
      });

      // Если ошибка CSRF, пробуем обновить токен и повторить запрос
      if (response.status === 403) {
        console.warn('[NewsForm] CSRF error, refreshing token and retrying...');
        csrfToken = await refreshCsrfToken();
        response = await fetch(url, {
          method,
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
          body: JSON.stringify(formData)
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle specific error cases
        if (response.status === 413) {
          throw new Error('Слишком большой размер данных. Попробуйте уменьшить количество или размер изображений (максимум 15 шт.).');
        }
        if (response.status === 503) {
          throw new Error('Сервер перегружен. Попробуйте сохранить через несколько минут.');
        }
        
        throw new Error(errorData.error || `Ошибка ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[NewsForm] Новость успешно сохранена:', result.id);
      
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
            <div className="flex items-center justify-between">
              <Label htmlFor="fullDescription">Полное описание</Label>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={handleImproveDescription}
                disabled={isImproving || !formData.fullDescription}
                className="gap-2 h-8"
              >
                {isImproving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-purple-600" />}
                Улучшить описание (AI)
              </Button>
            </div>
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
            <Input 
              id="category" 
              name="category" 
              value={formData.category} 
              onChange={handleChange} 
              list="categories-list"
              placeholder="Выберите или введите новую"
            />
            <datalist id="categories-list">
              {!categories.includes('Конференции') && <option value="Конференции" />}
              {categories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
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
            <Label className="mb-4 block text-base font-semibold">Изображения</Label>
            
            {/* Multi-image upload component */}
            <MultiImageUpload
              images={formData.images}
              onImagesChange={(newImages) => {
                setFormData(prev => ({ ...prev, images: newImages }));
                // Reset selected index if it's out of bounds
                if (selectedImageIndex >= newImages.length && newImages.length > 0) {
                  setSelectedImageIndex(0);
                }
              }}
              selectedImageIndex={selectedImageIndex}
              onSelectedImageChange={(index) => {
                setSelectedImageIndex(index);
                // Reorder images so selected one is first
                if (index !== 0 && formData.images.length > 0) {
                  const newImages = [...formData.images];
                  const selectedImage = newImages[index];
                  newImages.splice(index, 1);
                  newImages.unshift(selectedImage);
                  setFormData(prev => ({ ...prev, images: newImages }));
                  setSelectedImageIndex(0);
                }
              }}
            />

            {/* Add image by URL option */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <Label className="mb-2 block text-sm">Или добавить изображение по URL</Label>
              <div className="flex gap-2">
                <Input 
                  value={newImage} 
                  onChange={(e) => setNewImage(e.target.value)} 
                  placeholder="/images/... или https://..." 
                  className="flex-1"
                />
                <Button 
                  type="button" 
                  onClick={() => handleArrayAdd('images', newImage, setNewImage)}
                  variant="outline"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {/* Focal Point Selection - показываем если есть изображения */}
            {formData.images.length > 0 && (
              <div className="mt-6 p-4 bg-slate-50 rounded-lg border">
                <Label className="mb-3 block font-medium">Точка фокуса (для карточки новости)</Label>
                <p className="text-xs text-slate-500 mb-3">
                  Выберите, какая часть главного изображения будет видна в карточке новости
                </p>
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Preview */}
                  <div className="relative w-full md:w-48 aspect-[4/3] bg-slate-200 rounded-lg overflow-hidden border-2 border-slate-300">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={formData.images[0]} 
                      alt="Preview"
                      className="w-full h-full object-cover transition-all duration-300"
                      style={{ objectPosition: formData.imageFocalPoint }}
                    />
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded">
                      Превью карточки
                    </div>
                  </div>
                  
                  {/* Options */}
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-2">
                    {focalPointOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, imageFocalPoint: option.value }))}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          formData.imageFocalPoint === option.value
                            ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-500/20'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`block text-sm font-medium ${
                          formData.imageFocalPoint === option.value ? 'text-teal-700' : 'text-slate-700'
                        }`}>
                          {option.label}
                        </span>
                        <span className="block text-[10px] text-slate-500">{option.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
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
