'use client';

import Image from 'next/image';
import { useState } from 'react';
import { NewsPlaceholder } from '@/components/NewsPlaceholder';

interface NewsImageProps {
  src: string;
  alt: string;
}

export function NewsImage({ src, alt }: NewsImageProps) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="relative aspect-square rounded-lg overflow-hidden">
        <NewsPlaceholder />
      </div>
    );
  }

  return (
    <div className="relative aspect-square bg-[#e0e0e0] rounded-lg overflow-hidden neumorphic-inset cursor-pointer group">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover group-hover:scale-105 transition-transform duration-300"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        unoptimized={process.env.NODE_ENV === 'development'}
        onError={() => {
          console.error('Image failed to load:', src);
          setError(true);
        }}
      />
    </div>
  );
}


