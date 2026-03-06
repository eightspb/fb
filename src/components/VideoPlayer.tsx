"use client";

interface VideoPlayerProps {
  src: string;
  title?: string;
  duration?: string;
}

export function VideoPlayer({ src }: VideoPlayerProps) {
  return (
    <div className="relative aspect-video bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        src={src}
        className="w-full h-full object-cover"
        controls
        playsInline
        preload="metadata"
      />
    </div>
  );
}

