import React from 'react';
import { cn } from '@/lib/utils';
import { GridPattern } from './GridPattern';
import { Newspaper } from 'lucide-react';

interface NewsPlaceholderProps {
  className?: string;
}

export function NewsPlaceholder({ className }: NewsPlaceholderProps) {
  return (
    <div className={cn("relative w-full h-full overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100", className)}>
      {/* Background Pattern */}
      <GridPattern
        width={30}
        height={30}
        x={-1}
        y={-1}
        strokeDasharray={"4 2"}
        className={cn(
          "[mask-image:radial-gradient(300px_circle_at_center,white,transparent)] opacity-40",
        )}
      />
      
      {/* Abstract Shapes */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-gradient-to-br from-teal-100/20 to-purple-100/20 blur-3xl" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-gradient-to-tr from-blue-100/20 to-cyan-100/20 blur-3xl" />
      
      {/* Center Icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-white/50 blur-xl rounded-full" />
          <Newspaper className="relative w-12 h-12 text-slate-300" strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
}










