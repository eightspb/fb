'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, X, Star } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface MultiImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  selectedImageIndex?: number;
  onSelectedImageChange?: (index: number) => void;
  maxFiles?: number;
}

export function MultiImageUpload({ 
  images, 
  onImagesChange,
  selectedImageIndex = 0,
  onSelectedImageChange,
  maxFiles = 10 
}: MultiImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maxSizeBytes = 10 * 1024 * 1024; // 10MB per file

  const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const newImages: string[] = [];
      
      // Check if adding these files would exceed maxFiles
      if (images.length + files.length > maxFiles) {
        alert(`Можно загрузить максимум ${maxFiles} изображений. Сейчас у вас ${images.length} изображений.`);
        setIsUploading(false);
        return;
      }

      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          alert(`Файл "${file.name}" не является изображением и будет пропущен`);
          continue;
        }

        // Validate file size
        if (file.size > maxSizeBytes) {
          alert(`Файл "${file.name}" слишком большой (максимум 10MB) и будет пропущен`);
          continue;
        }

        // Convert to base64
        const base64String = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });

        newImages.push(base64String);
      }

      // Add new images to existing ones
      if (newImages.length > 0) {
        onImagesChange([...images, ...newImages]);
      }

    } catch (error: any) {
      console.error('Error uploading files:', error);
      alert('Ошибка загрузки файлов: ' + (error.message || 'Unknown error'));
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
    
    // Adjust selected index if needed
    if (onSelectedImageChange) {
      if (index === selectedImageIndex && newImages.length > 0) {
        // If removing the selected image, select the first one
        onSelectedImageChange(0);
      } else if (index < selectedImageIndex) {
        // If removing an image before the selected one, adjust the index
        onSelectedImageChange(selectedImageIndex - 1);
      }
    }
  };

  const handleSelectImage = (index: number) => {
    if (onSelectedImageChange) {
      onSelectedImageChange(index);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      <div className="flex items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFilesChange}
          accept="image/*"
          multiple
          className="hidden"
          disabled={isUploading}
        />
        <Button 
          type="button" 
          variant="secondary" 
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || images.length >= maxFiles}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Загрузка...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Загрузить изображения
            </>
          )}
        </Button>
        <span className="text-sm text-slate-500">
          {images.length} / {maxFiles} изображений
        </span>
      </div>

      {/* Images Grid */}
      {images.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Нажмите на звёздочку, чтобы выбрать главное изображение для карточки новости
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {images.map((img, index) => (
              <Card 
                key={index} 
                className={`group relative aspect-video bg-slate-100 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                  index === selectedImageIndex 
                    ? 'border-teal-500 ring-2 ring-teal-500/20' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => handleSelectImage(index)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={img} 
                  alt={`Image ${index + 1}`} 
                  className="w-full h-full object-cover"
                />
                
                {/* Star indicator for main image */}
                <div 
                  className={`absolute top-2 left-2 p-1 rounded-full transition-all ${
                    index === selectedImageIndex
                      ? 'bg-teal-500 text-white'
                      : 'bg-black/50 text-white opacity-0 group-hover:opacity-100'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectImage(index);
                  }}
                  title={index === selectedImageIndex ? 'Главное изображение' : 'Сделать главным'}
                >
                  <Star className={`w-4 h-4 ${index === selectedImageIndex ? 'fill-white' : ''}`} />
                </div>

                {/* Remove button */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    type="button" 
                    variant="destructive" 
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveImage(index);
                    }}
                    className="h-7 w-7"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Image info */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1">
                  <p className="text-[10px] text-white truncate px-1">
                    {index === selectedImageIndex && (
                      <span className="text-teal-400 mr-1">★ Главное</span>
                    )}
                    {img.startsWith('data:') ? `Изображение ${index + 1}` : img.split('/').pop()}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
