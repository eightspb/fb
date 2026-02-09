import Image from 'next/image';
import { Clock, Coffee, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ProgramItem, Speaker } from '@/lib/types/conference';
import { getSpeakerById } from '@/lib/types/conference';

interface ConferenceScheduleProps {
  program: ProgramItem[];
  speakers: Speaker[];
}

/**
 * ConferenceSchedule component - displays structured conference schedule
 * Updated design: Stylish cards with overlapping circle element
 */
export function ConferenceSchedule({ program, speakers }: ConferenceScheduleProps) {
  if (!program || program.length === 0) {
    return null;
  }

  // Sort program by order
  const sortedProgram = [...program].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div className="space-y-8 pl-4">
      {sortedProgram.map((item) => {
        const speaker = item.speaker_id ? getSpeakerById(speakers, item.speaker_id) : null;
        const isBreak = item.type === 'break';
        const isTalk = item.type === 'talk';

        return (
          <div 
            key={item.id} 
            className="group relative flex flex-col sm:flex-row rounded-3xl bg-slate-50 hover:bg-white transition-colors duration-300 shadow-sm hover:shadow-md border border-slate-100"
          >
            {/* Mobile Header Section - Photo + Time */}
            <div className="sm:hidden flex items-center justify-between py-3 px-4 rounded-t-3xl bg-slate-100/30">
              {/* Photo - Left */}
              <div className={`w-20 h-20 rounded-full border-[3px] shadow-md flex items-center justify-center overflow-hidden bg-white ${
                isBreak 
                  ? 'border-slate-200 text-slate-400' 
                  : 'border-teal-500 text-teal-600'
              }`}>
                {isTalk && speaker && speaker.photo ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={speaker.photo}
                      alt={speaker.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  isBreak ? <Coffee className="w-7 h-7" /> : <User className="w-7 h-7" />
                )}
              </div>

              {/* Time - Right */}
              <div className="flex flex-col items-end text-right ml-4">
                <span className={`text-lg font-bold ${isBreak ? 'text-slate-400' : 'text-slate-900'}`}>
                  {item.time_start}
                </span>
                <span className={`text-sm ${isBreak ? 'text-slate-400' : 'text-slate-500'}`}>
                  {item.time_end}
                </span>
              </div>
            </div>

            {/* Desktop Time Section - Left */}
            <div className={`hidden sm:flex w-32 sm:w-40 flex-col items-center justify-center flex-shrink-0 rounded-l-3xl ${
              isBreak ? 'bg-slate-100/50' : 'bg-slate-200/30'
            }`}>
              <span className={`text-2xl sm:text-3xl font-bold ${isBreak ? 'text-slate-400' : 'text-slate-900'}`}>
                {item.time_start}
              </span>
              <span className={`text-sm sm:text-base font-medium ${isBreak ? 'text-slate-400' : 'text-slate-500'} mt-1`}>
                {item.time_end}
              </span>
            </div>

            {/* Desktop Circle Element - Overlapping */}
            <div className="hidden sm:block absolute left-44 sm:left-52 top-1/2 -translate-y-1/2 -translate-x-1/2 z-20">
              <div className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full border-[6px] shadow-xl flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-105 bg-white ${
                isBreak 
                  ? 'border-slate-200 text-slate-400' 
                  : 'border-teal-500 text-teal-600'
              }`}>
                {isTalk && speaker && speaker.photo ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={speaker.photo}
                      alt={speaker.name}
                      fill
                      sizes="(max-width: 640px) 112px, 128px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  isBreak ? <Coffee className="w-10 h-10 sm:w-12 sm:h-12" /> : <User className="w-10 h-10 sm:w-12 sm:h-12" />
                )}
              </div>
            </div>

            {/* Mobile Content Section - Bottom */}
            <div className="sm:hidden flex-1 p-4 pt-2 pb-4 flex flex-col justify-center rounded-b-3xl">
              <div className="flex flex-col gap-1 text-center">
                {/* Title */}
                <h3 className={`text-base font-bold leading-tight ${
                  isBreak ? 'text-slate-500' : 'text-slate-900'
                }`}>
                  {item.title}
                </h3>
                
                {/* Speaker Name */}
                {(speaker || item.speaker_name) && (
                  <p className={`text-sm font-medium ${
                    isBreak ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    {speaker ? speaker.name : item.speaker_name}
                  </p>
                )}

                {/* Description - Optional */}
                {item.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {item.description}
                  </p>
                )}
                
                {/* Type Badge - Optional */}
                {item.type && item.type !== 'talk' && (
                   <div className="flex justify-center mt-1">
                      <Badge variant="outline" className="text-xs text-slate-400 border-slate-200">
                        {item.type === 'break' ? 'Перерыв' : 'Событие'}
                      </Badge>
                   </div>
                )}
              </div>
            </div>

            {/* Desktop Content Section - Right */}
            <div className="hidden sm:flex flex-1 p-6 pl-28 sm:pl-36 flex-col justify-center relative z-0 rounded-r-3xl">
              <div className="flex flex-col gap-1">
                {/* Title */}
                <h3 className={`text-lg sm:text-xl font-bold leading-tight ${
                  isBreak ? 'text-slate-500' : 'text-slate-900'
                }`}>
                  {item.title}
                </h3>
                
                {/* Speaker Name */}
                {(speaker || item.speaker_name) && (
                  <p className={`text-base sm:text-lg font-medium ${
                    isBreak ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    {speaker ? speaker.name : item.speaker_name}
                  </p>
                )}

                {/* Description - Optional */}
                {item.description && (
                  <p className="text-sm text-slate-500 mt-2 line-clamp-2">
                    {item.description}
                  </p>
                )}
                
                {/* Type Badge - Optional */}
                {item.type && item.type !== 'talk' && (
                   <div className="absolute top-4 right-4">
                      <Badge variant="outline" className="text-xs text-slate-400 border-slate-200">
                        {item.type === 'break' ? 'Перерыв' : 'Событие'}
                      </Badge>
                   </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
