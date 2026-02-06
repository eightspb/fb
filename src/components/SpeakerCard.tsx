import Image from 'next/image';
import { User, Plus } from 'lucide-react';
import type { Speaker } from '@/lib/types/conference';

interface SpeakerCardProps {
  speaker: Speaker;
  variant?: 'default' | 'compact';
}

/**
 * SpeakerCard component - displays a speaker card in a 4-column grid
 * Updated design: Colored header, overlapping avatar, clean white body
 */
export function SpeakerCard({ speaker, variant = 'default' }: SpeakerCardProps) {
  const isCompact = variant === 'compact';
  
  // Dimensions based on variant
  const headerHeight = isCompact ? 'h-20' : 'h-24';
  const avatarSize = isCompact ? 'w-20 h-20' : 'w-28 h-28';
  const avatarOffset = isCompact ? '-mt-10' : '-mt-14'; // Half of height
  const iconSize = isCompact ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <div className="group h-full bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col">
      {/* Colored Header */}
      <div className={`${headerHeight} bg-teal-500 relative w-full`}>
        {/* Decorative Icon */}
        <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
          <Plus className={`${iconSize} text-white`} />
        </div>
      </div>

      {/* Body Content */}
      <div className="px-4 pb-6 flex flex-col items-center text-center flex-grow">
        {/* Overlapping Avatar */}
        <div className={`relative ${avatarSize} ${avatarOffset} mb-3 flex-shrink-0 z-10`}>
          {speaker.photo ? (
            <div className="relative w-full h-full rounded-full overflow-hidden border-[4px] border-white shadow-sm bg-white">
              <Image
                src={speaker.photo}
                alt={speaker.name}
                fill
                sizes={isCompact ? '80px' : '112px'}
                className="object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center border-[4px] border-white shadow-sm text-slate-300">
              <User className={isCompact ? 'w-8 h-8' : 'w-12 h-12'} />
            </div>
          )}
        </div>

        {/* Name */}
        <h3 className={`font-bold text-slate-900 mb-2 ${isCompact ? 'text-sm' : 'text-lg'} leading-tight`}>
          {speaker.name}
        </h3>

        {/* Credentials */}
        {speaker.credentials && (
          <p className={`text-slate-500 mb-3 ${isCompact ? 'text-xs' : 'text-sm'} leading-relaxed line-clamp-3`}>
            {speaker.credentials}
          </p>
        )}

        {/* Institution */}
        {speaker.institution && (
          <div className="mt-auto pt-2 w-full border-t border-slate-100">
            <p className={`text-teal-600 font-medium ${isCompact ? 'text-xs' : 'text-sm'} py-1`}>
              {speaker.institution}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
