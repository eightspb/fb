import Image from 'next/image';
import { User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Speaker } from '@/lib/types/conference';

interface SpeakerCardProps {
  speaker: Speaker;
  variant?: 'default' | 'compact';
}

/**
 * SpeakerCard component - displays a speaker card in a 4-column grid
 * Shows: photo (circular), name, credentials, institution
 * Does NOT show report title/time (those are in the schedule)
 */
export function SpeakerCard({ speaker, variant = 'default' }: SpeakerCardProps) {
  const isCompact = variant === 'compact';

  return (
    <Card className="h-full hover:shadow-lg transition-shadow duration-300 group">
      <CardContent className={`flex flex-col items-center text-center ${isCompact ? 'p-4' : 'p-6'}`}>
        {/* Circular Photo */}
        <div className={`relative ${isCompact ? 'w-20 h-20' : 'w-28 h-28'} mb-4 flex-shrink-0`}>
          {speaker.photo ? (
            <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-slate-100 group-hover:border-teal-100 transition-colors">
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
            <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center border-4 border-slate-100 group-hover:border-teal-100 transition-colors">
              <User className={`${isCompact ? 'w-8 h-8' : 'w-12 h-12'} text-slate-300`} />
            </div>
          )}
        </div>

        {/* Name */}
        <h3 className={`font-bold text-slate-900 mb-2 ${isCompact ? 'text-sm' : 'text-base'}`}>
          {speaker.name}
        </h3>

        {/* Credentials */}
        {speaker.credentials && (
          <p className={`text-slate-500 mb-2 ${isCompact ? 'text-xs' : 'text-sm'} leading-snug`}>
            {speaker.credentials}
          </p>
        )}

        {/* Institution */}
        {speaker.institution && (
          <p className={`text-teal-600 font-medium ${isCompact ? 'text-xs' : 'text-sm'}`}>
            {speaker.institution}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
