import Image from 'next/image';
import { User, Briefcase, Building2 } from 'lucide-react';

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
  const avatarSize = isCompact ? 'w-[104px] h-[104px]' : 'w-[146px] h-[146px]';
  const avatarOffset = isCompact ? '-mt-[52px]' : '-mt-[73px]'; // Half of height

  return (
    <div className="group h-full bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col">
      {/* Colored Header */}
      <div className={`${headerHeight} bg-teal-500 relative w-full`} />

      {/* Body Content */}
      <div className="px-4 pb-6 flex flex-col items-start text-left flex-grow">
        {/* Overlapping Avatar */}
        <div className={`relative ${avatarSize} ${avatarOffset} mb-3 flex-shrink-0 z-10 self-center`}>
          {speaker.photo ? (
            <div className="relative w-full h-full rounded-full overflow-hidden border-[4px] border-white ring-[4px] ring-teal-500 shadow-lg shadow-teal-500/20 bg-white">
              <Image
                src={speaker.photo}
                alt={speaker.name}
                fill
                sizes={isCompact ? '104px' : '146px'}
                className="object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center border-[4px] border-white ring-[4px] ring-teal-500 shadow-lg shadow-teal-500/20 text-slate-300">
              <User className={isCompact ? 'w-8 h-8' : 'w-12 h-12'} />
            </div>
          )}
        </div>

        {/* Name */}
        <h3 className={`font-bold text-slate-900 mb-2 ${isCompact ? 'text-sm' : 'text-lg'} leading-tight`}>
          {speaker.name}
        </h3>

        {/* Credentials (должность) */}
        {speaker.credentials && (
          <div className={`flex items-start gap-1.5 text-slate-500 mb-2 ${isCompact ? 'text-xs' : 'text-sm'}`}>
            <Briefcase className={`${isCompact ? 'w-3 h-3' : 'w-4 h-4'} mt-0.5 flex-shrink-0 text-slate-400`} />
            <span className="leading-snug">{speaker.credentials}</span>
          </div>
        )}

        {/* Institution (место работы) */}
        {speaker.institution && (
          <div className={`flex items-start gap-1.5 mt-auto pt-2 w-full ${isCompact ? 'text-xs' : 'text-sm'}`}>
            <Building2 className={`${isCompact ? 'w-3 h-3' : 'w-4 h-4'} mt-0.5 flex-shrink-0 text-teal-500`} />
            <span className="text-teal-600 font-medium leading-snug">{speaker.institution}</span>
          </div>
        )}
      </div>
    </div>
  );
}
