'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { NewsImage } from "@/components/NewsImage";
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NewsGalleryProps {
  images: string[];
  title: string;
}

export function NewsGallery({ images, title }: NewsGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleOpen = (index: number) => {
    setSelectedIndex(index);
  };

  const handleClose = () => {
    setSelectedIndex(null);
  };

  const handleNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (selectedIndex === null) return;
    setSelectedIndex((prev) => (prev !== null ? (prev + 1) % images.length : null));
  }, [selectedIndex, images.length]);

  const handlePrev = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (selectedIndex === null) return;
    setSelectedIndex((prev) => (prev !== null ? (prev - 1 + images.length) % images.length : null));
  }, [selectedIndex, images.length]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (selectedIndex === null) return;

    if (e.key === 'ArrowRight') {
      handleNext();
    } else if (e.key === 'ArrowLeft') {
      handlePrev();
    } else if (e.key === 'Escape') {
      handleClose();
    }
  }, [selectedIndex, handleNext, handlePrev]);

  useEffect(() => {
    if (selectedIndex !== null) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedIndex, handleKeyDown]);

  if (!images || images.length === 0) return null;

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Фотогалерея</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {images.map((image, index) => {
          const imagePath = image.startsWith('/') ? image : `/${image}`;
          return (
            <div 
              key={`${image}-${index}`} 
              className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
              onClick={() => handleOpen(index)}
            >
              <NewsImage
                src={imagePath}
                alt={`${title} - фото ${index + 1}`}
                index={index}
              />
            </div>
          );
        })}
      </div>

      <Dialog open={selectedIndex !== null} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto h-auto bg-transparent border-0 shadow-none p-0 focus:outline-none flex items-center justify-center overflow-hidden">
          <DialogTitle className="sr-only">Галерея изображений</DialogTitle>
          <DialogDescription className="sr-only">
             Просмотр изображения {selectedIndex !== null ? selectedIndex + 1 : 0} из {images.length}
          </DialogDescription>
          
          {selectedIndex !== null && (
            <div className="relative w-[90vw] h-[85vh] md:w-[80vw] md:h-[90vh] flex items-center justify-center outline-none">
              <div className="relative w-full h-full">
                <Image
                  src={images[selectedIndex].startsWith('/') ? images[selectedIndex] : `/${images[selectedIndex]}`}
                  alt={`${title} - фото ${selectedIndex + 1}`}
                  fill
                  className="object-contain"
                  priority
                  sizes="90vw"
                  quality={90}
                />
              </div>

              {/* Controls */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-between px-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="pointer-events-auto h-12 w-12 rounded-full bg-black/20 text-white hover:bg-black/40 backdrop-blur-sm border-0"
                  onClick={handlePrev}
                >
                  <ChevronLeft className="h-8 w-8" />
                  <span className="sr-only">Назад</span>
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="pointer-events-auto h-12 w-12 rounded-full bg-black/20 text-white hover:bg-black/40 backdrop-blur-sm border-0"
                  onClick={handleNext}
                >
                  <ChevronRight className="h-8 w-8" />
                  <span className="sr-only">Вперед</span>
                </Button>
              </div>

              {/* Close button - custom positioning if needed, but DialogContent has one by default. 
                  However, the default one might be hard to see or positioned wrong with bg-transparent.
                  The default close button in DialogContent is absolute right-4 top-4.
                  Let's see if it works. If not, I can hide it via CSS and add my own.
              */}
              
              <div className="absolute top-2 right-2 md:-right-12 md:-top-2 pointer-events-auto z-50">
                 <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-black/20 text-white hover:bg-black/40 backdrop-blur-sm border-0"
                  onClick={handleClose}
                >
                  <X className="h-6 w-6" />
                  <span className="sr-only">Закрыть</span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

