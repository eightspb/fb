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
    <div className="space-y-3">
      {sortedProgram.map((item) => {
        const speaker = item.speaker_id ? getSpeakerById(speakers, item.speaker_id) : null;
        const isBreak = item.type === 'break';
        const isTalk = item.type === 'talk';

        return (
          <Card 
            key={item.id} 
            className={`overflow-hidden ${isBreak ? 'bg-slate-50 border-slate-200' : 'hover:shadow-md transition-shadow'}`}
          >
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row">
                {/* Time Column */}
                <div className={`flex items-center justify-center md:justify-start p-4 md:w-32 flex-shrink-0 ${
                  isBreak ? 'bg-slate-100' : 'bg-teal-50'
                }`}>
                  <div className="text-center md:text-left">
                    <div className="flex items-center gap-2 text-slate-600 mb-1">
                      {isBreak ? (
                        <Coffee className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                    </div>
                    <div className={`font-bold ${isBreak ? 'text-slate-600' : 'text-teal-700'}`}>
                      {item.time_start}
                    </div>
                    <div className="text-xs text-slate-500">
                      {item.time_end}
                    </div>
                  </div>
                </div>

                {/* Content Column */}
                <div className="flex-1 p-4">
                  <div className="flex items-start gap-4">
                    {/* Speaker Photo (only for talks with speaker) */}
                    {isTalk && speaker && (
                      <div className="hidden sm:block flex-shrink-0">
                        {speaker.photo ? (
                          <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-slate-200">
                            <Image
                              src={speaker.photo}
                              alt={speaker.name}
                              fill
                              sizes="48px"
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center border-2 border-slate-200">
                            <User className="w-6 h-6 text-slate-400" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Talk/Event Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className={`font-semibold ${
                          isBreak ? 'text-slate-600' : 'text-slate-900'
                        }`}>
                          {item.title}
                        </h3>
                        {item.type && (
                          <Badge 
                            variant={isBreak ? 'secondary' : 'default'}
                            className={`flex-shrink-0 ${
                              isBreak ? 'bg-slate-200 text-slate-600' : 'bg-teal-100 text-teal-700 border-0'
                            }`}
                          >
                            {item.type === 'talk' ? 'Доклад' : item.type === 'break' ? 'Перерыв' : 'Событие'}
                          </Badge>
                        )}
                      </div>

                      {/* Speaker Name */}
                      {speaker && (
                        <p className="text-sm text-slate-600 mb-1 font-medium">
                          {speaker.name}
                        </p>
                      )}
                      {!speaker && item.speaker_name && (
                        <p className="text-sm text-slate-600 mb-1 font-medium">
                          {item.speaker_name}
                        </p>
                      )}

                      {/* Description */}
                      {item.description && (
                        <p className="text-sm text-slate-500 mt-2">
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
