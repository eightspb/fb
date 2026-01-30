"use client";

import { useState, useRef } from "react";
import { PlayCircle } from "lucide-react";

interface VideoPlayerProps {
  src: string;
  title?: string;
  duration?: string;
}

export function VideoPlayer({ src, title = "Демонстрация работы системы DK-B-MS", duration }: VideoPlayerProps) {
  const [hasStarted, setHasStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleOverlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (videoRef.current && !hasStarted) {
      videoRef.current.play().catch(console.error);
      setHasStarted(true);
      setIsPlaying(true);
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
    if (!hasStarted) {
      setHasStarted(true);
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleEnded = () => {
    setIsPlaying(false);
  };

  return (
    <div className="relative aspect-video bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl group">
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-cover"
        controls={hasStarted}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        playsInline
        preload="metadata"
      />
      
      {!hasStarted && (
        <>
          <div 
            className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors cursor-pointer z-10"
            onClick={handleOverlayClick}
          >
            <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <PlayCircle className="w-10 h-10 text-white fill-white/20" />
            </div>
          </div>
          <div className="absolute bottom-4 left-4 right-4 p-4 bg-black/60 backdrop-blur-sm rounded-xl pointer-events-none z-10">
            <p className="text-white font-medium">{title}</p>
            {duration && (
              <p className="text-slate-300 text-sm">{duration}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

