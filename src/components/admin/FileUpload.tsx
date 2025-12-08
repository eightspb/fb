import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { Upload, Loader2, X } from 'lucide-react';

interface FileUploadProps {
  onUpload: (url: string) => void;
  folder?: string;
  accept?: string;
  className?: string;
}

export function FileUpload({ onUpload, folder = 'uploads', accept = 'image/*', className }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      // Check for bypass - if bypassing, we can't upload to protected storage easily
      // But we can try uploading anyway, maybe bucket is public.
      // If it fails, we show a specific error.
      const bypassStorage = localStorage.getItem('sb-admin-bypass');
      
      if (bypassStorage === 'true') {
         // Warning: In bypass mode, uploads might fail if RLS is strict.
         console.warn('Attempting upload in bypass mode. This requires the bucket to be public or have anon policies.');
      }

      const { data, error } = await supabase.storage
        .from('public_files') // Assuming a public bucket named 'public_files'
        .upload(filePath, file);

      if (error) {
        // @ts-ignore - statusCode might exist on some error types but not on StorageError definition
        if (bypassStorage === 'true' && (error.message.includes('new row violates row-level security') || (error as any).statusCode === '403')) {
            throw new Error('Cannot upload files in "Bypass Auth" mode unless the storage bucket is public and allows anonymous uploads. Please log in with a real account or configure storage policies.');
        }
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('public_files')
        .getPublicUrl(filePath);

      onUpload(publicUrl);
    } catch (error: any) {
      console.error('Error uploading file:', error);
      alert('Ошибка загрузки файла: ' + (error.message || 'Unknown error'));
    } finally {
      setIsUploading(false);
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

