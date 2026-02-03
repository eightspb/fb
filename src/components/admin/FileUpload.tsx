'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Loader2 } from 'lucide-react';

interface FileUploadProps {
  onUpload: (result: string) => void;
  folder?: string;
  accept?: string;
  className?: string;
  mode?: 'upload' | 'base64';
}

export function FileUpload({ onUpload, accept = 'image/*', className }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        onUpload(base64String);
        setIsUploading(false);
      };
      reader.onerror = () => {
        throw new Error('Failed to read file');
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error('Error uploading file:', error);
      alert('Ошибка загрузки файла: ' + (error.message || 'Unknown error'));
      setIsUploading(false);
    } finally {
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={accept}
          className="hidden"
          disabled={isUploading}
        />
        <Button 
          type="button" 
          variant="secondary" 
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
          {isUploading ? 'Загрузка...' : 'Загрузить файл'}
        </Button>
      </div>
    </div>
  );
}
