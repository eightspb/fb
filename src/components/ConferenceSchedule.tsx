import Image from 'next/image';
import { Clock, Coffee, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ProgramItem, Speaker } from '@/lib/types/conference';
import { getSpeakerById, formatTimeRange } from '@/lib/types/conference';

interface ConferenceScheduleProps {
  program: ProgramItem[];
  speakers: Speaker[];
}

/**
 * ConferenceSchedule component - displays structured conference schedule
 * Supports multiple talks by the same speaker
 * Shows: time, speaker (with photo), talk title, description
 */
export function ConferenceSchedule({ program, speakers }: ConferenceScheduleProps) {
  if (!program || program.length === 0) {
    return null;
  }

  // Sort program by order
  const sortedProgram = [...program].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div className="space-y-4">
      {sortedProgram.map((item) => {
        const speaker = item.speaker_id ? getSpeakerById(speakers, item.speaker_id) : null;
        const isBreak = item.type === 'break';
        const isTalk = item.type === 'talk';

        return (
          <Card 
            key={item.id} 
            className={`overflow-hidden border-0 transition-all duration-300 ${
              isBreak 
                ? 'bg-gradient-to-r from-slate-50 to-slate-100 shadow-sm hover:shadow-md' 
                : 'bg-white shadow-md hover:shadow-xl hover:-translate-y-1'
            }`}
          >
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row">
                {/* Time Column */}
                <div className={`relative flex items-center justify-center md:justify-start p-6 md:w-40 flex-shrink-0 ${
                  isBreak 
                    ? 'bg-gradient-to-br from-slate-100 to-slate-200' 
                    : 'bg-gradient-to-br from-teal-500 to-teal-600'
                }`}>
                  {/* Decorative element */}
                  <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-30 ${
                    isBreak ? 'bg-slate-300' : 'bg-teal-300'
                  }`} />
                  
                  <div className="text-center md:text-left relative z-10">
                    <div className={`flex items-center justify-center md:justify-start gap-2 mb-2 ${
                      isBreak ? 'text-slate-500' : 'text-teal-100'
                    }`}>
                      {isBreak ? (
                        <Coffee className="w-5 h-5" />
                      ) : (
                        <Clock className="w-5 h-5" />
                      )}
                    </div>
                    <div className={`text-2xl font-bold mb-1 ${
                      isBreak ? 'text-slate-700' : 'text-white'
                    }`}>
                      {item.time_start}
                    </div>
                    <div className={`text-sm font-medium ${
                      isBreak ? 'text-slate-500' : 'text-teal-100'
                    }`}>
                      {item.time_end}
                    </div>
                  </div>
                </div>

                {/* Content Column */}
                <div className="flex-1 p-6">
                  <div className="flex items-start gap-5">
                    {/* Speaker Photo (only for talks with speaker) */}
                    {isTalk && speaker && (
                      <div className="hidden sm:block flex-shrink-0">
                        {speaker.photo ? (
                          <div className="relative w-16 h-16 rounded-full overflow-hidden ring-4 ring-teal-100 shadow-lg">
                            <Image
                              src={speaker.photo}
                              alt={speaker.name}
                              fill
                              sizes="64px"
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-100 to-teal-200 flex items-center justify-center ring-4 ring-teal-50 shadow-lg">
                            <User className="w-8 h-8 text-teal-600" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Talk/Event Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h3 className={`text-lg font-bold leading-tight ${
                          isBreak ? 'text-slate-700' : 'text-slate-900'
                        }`}>
                          {item.title}
                        </h3>
                        {item.type && (
                          <Badge 
                            variant={isBreak ? 'secondary' : 'default'}
                            className={`flex-shrink-0 px-3 py-1 text-xs font-semibold ${
                              isBreak 
                                ? 'bg-slate-200 text-slate-700 border-0' 
                                : 'bg-gradient-to-r from-teal-500 to-teal-600 text-white border-0 shadow-sm'
                            }`}
                          >
                            {item.type === 'talk' ? 'Доклад' : item.type === 'break' ? 'Перерыв' : 'Событие'}
                          </Badge>
                        )}
                      </div>

                      {/* Speaker Name */}
                      {speaker && (
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-1 h-4 bg-teal-500 rounded-full" />
                          <p className="text-sm text-slate-700 font-semibold">
                            {speaker.name}
                          </p>
                        </div>
                      )}
                      {!speaker && item.speaker_name && (
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-1 h-4 bg-teal-500 rounded-full" />
                          <p className="text-sm text-slate-700 font-semibold">
                            {item.speaker_name}
                          </p>
                        </div>
                      )}

                      {/* Description */}
                      {item.description && (
                        <p className="text-sm text-slate-600 leading-relaxed mt-3 pl-3 border-l-2 border-slate-200">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
