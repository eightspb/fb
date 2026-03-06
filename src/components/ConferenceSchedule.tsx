import Image from 'next/image';
import { Coffee, User, UtensilsCrossed, Wine, ClipboardCheck } from 'lucide-react';
import type { ProgramItem, Speaker } from '@/lib/types/conference';
import { getSpeakerById } from '@/lib/types/conference';

interface ConferenceScheduleProps {
  program: ProgramItem[];
  speakers: Speaker[];
}

type SpecialCardType = 'registration' | 'coffee' | 'lunch' | 'banquet' | 'talk';

function getSpecialType(item: ProgramItem, isLast: boolean): SpecialCardType {
  if (item.type === 'other') return 'registration';
  if (item.type !== 'break') return 'talk';

  // Last break in the program is the banquet/reception
  if (isLast) return 'banquet';

  // Long break (45+ min) is lunch
  const [sh, sm] = item.time_start.split(':').map(Number);
  const [eh, em] = item.time_end.split(':').map(Number);
  const duration = (eh * 60 + em) - (sh * 60 + sm);
  if (duration >= 45) return 'lunch';

  return 'coffee';
}

const specialStyles: Record<SpecialCardType, {
  bg: string;
  border: string;
  timeBg: string;
  titleColor: string;
  timeColor: string;
  label: string;
  icon: typeof Coffee;
  iconColor: string;
  iconBg: string;
}> = {
  registration: {
    bg: 'bg-blue-50 hover:bg-blue-50/80',
    border: 'border-blue-200',
    timeBg: 'bg-blue-100/50',
    titleColor: 'text-blue-800',
    timeColor: 'text-blue-600',
    label: 'Регистрация',
    icon: ClipboardCheck,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-100',
  },
  coffee: {
    bg: 'bg-amber-50 hover:bg-amber-50/80',
    border: 'border-amber-200',
    timeBg: 'bg-amber-100/50',
    titleColor: 'text-amber-800',
    timeColor: 'text-amber-600',
    label: 'Кофе-брейк',
    icon: Coffee,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-100',
  },
  lunch: {
    bg: 'bg-orange-50 hover:bg-orange-50/80',
    border: 'border-orange-200',
    timeBg: 'bg-orange-100/50',
    titleColor: 'text-orange-800',
    timeColor: 'text-orange-600',
    label: 'Обед',
    icon: UtensilsCrossed,
    iconColor: 'text-orange-500',
    iconBg: 'bg-orange-100',
  },
  banquet: {
    bg: 'bg-purple-50 hover:bg-purple-50/80',
    border: 'border-purple-200',
    timeBg: 'bg-purple-100/50',
    titleColor: 'text-purple-800',
    timeColor: 'text-purple-600',
    label: 'Фуршет',
    icon: Wine,
    iconColor: 'text-purple-500',
    iconBg: 'bg-purple-100',
  },
  talk: {
    bg: 'bg-slate-50 hover:bg-white',
    border: 'border-slate-100',
    timeBg: 'bg-slate-200/30',
    titleColor: 'text-slate-900',
    timeColor: 'text-slate-900',
    label: '',
    icon: User,
    iconColor: 'text-teal-600',
    iconBg: 'bg-teal-50',
  },
};

/**
 * ConferenceSchedule component - displays structured conference schedule
 * Card types: registration, coffee break, lunch, banquet, talk
 */
export function ConferenceSchedule({ program, speakers }: ConferenceScheduleProps) {
  if (!program || program.length === 0) {
    return null;
  }

  const sortedProgram = [...program].sort((a, b) => (a.order || 0) - (b.order || 0));

  // Find the last break item to mark it as banquet
  const lastBreakIndex = sortedProgram.reduce((last, item, i) =>
    item.type === 'break' ? i : last, -1);

  return (
    <div className="space-y-5 pl-4">
      {sortedProgram.map((item, index) => {
        const speaker = item.speaker_id ? getSpeakerById(speakers, item.speaker_id) : null;
        const isTalk = item.type === 'talk';
        const hasAvatar = isTalk && speaker;
        const specialType = getSpecialType(item, index === lastBreakIndex);
        const isSpecial = specialType !== 'talk';
        const style = specialStyles[specialType];
        const IconComponent = style.icon;

        // Special card (registration, coffee, lunch, banquet)
        if (isSpecial) {
          return (
            <div
              key={item.id}
              className={`group relative flex flex-col sm:flex-row rounded-3xl ${style.bg} transition-colors duration-300 shadow-sm hover:shadow-md border ${style.border}`}
            >
              {/* Mobile layout */}
              <div className="sm:hidden flex items-center gap-4 py-4 px-5 rounded-3xl">
                <div className={`w-14 h-14 rounded-2xl ${style.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <IconComponent className={`w-7 h-7 ${style.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${style.titleColor} uppercase tracking-wide`}>
                    {style.label}
                  </p>
                  {item.title && (
                    <p className={`text-sm ${style.titleColor} opacity-70 truncate`}>{item.title}</p>
                  )}
                </div>
                <div className="flex flex-col items-end text-right flex-shrink-0">
                  <span className={`text-lg font-bold ${style.timeColor}`}>{item.time_start}</span>
                  <span className={`text-sm ${style.timeColor} opacity-60`}>{item.time_end}</span>
                </div>
              </div>

              {/* Desktop layout */}
              <div className={`hidden sm:flex w-32 sm:w-40 flex-col items-center justify-center flex-shrink-0 rounded-l-3xl ${style.timeBg}`}>
                <span className={`text-2xl sm:text-3xl font-bold ${style.timeColor}`}>{item.time_start}</span>
                <span className={`text-sm sm:text-base font-medium ${style.timeColor} opacity-60 mt-1`}>{item.time_end}</span>
              </div>
              <div className="hidden sm:flex flex-1 p-6 items-center gap-5 rounded-r-3xl">
                <div className={`w-16 h-16 rounded-2xl ${style.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <IconComponent className={`w-8 h-8 ${style.iconColor}`} />
                </div>
                <div>
                  <h3 className={`text-xl font-bold ${style.titleColor}`}>
                    {style.label}
                  </h3>
                  {item.title && item.title !== style.label && (
                    <p className={`text-sm ${style.titleColor} opacity-70 mt-0.5`}>{item.title}</p>
                  )}
                </div>
              </div>
            </div>
          );
        }

        // Talk card (unchanged structure)
        return (
          <div
            key={item.id}
            className={`group relative flex flex-col sm:flex-row rounded-3xl ${style.bg} transition-colors duration-300 shadow-sm hover:shadow-md border ${style.border}`}
          >
            {/* Mobile Header */}
            <div className="sm:hidden flex items-center justify-between py-3 px-4 rounded-t-3xl bg-slate-100/30">
              {hasAvatar ? (
                <div className="w-16 h-16 rounded-full border-[3px] border-teal-500 shadow-md flex items-center justify-center overflow-hidden bg-white flex-shrink-0">
                  {speaker.photo ? (
                    <div className="relative w-full h-full">
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
                    <User className="w-6 h-6 text-teal-600" />
                  )}
                </div>
              ) : null}
              <div className="flex flex-col items-end text-right ml-auto">
                <span className="text-lg font-bold text-slate-900">{item.time_start}</span>
                <span className="text-sm text-slate-500">{item.time_end}</span>
              </div>
            </div>

            {/* Desktop Time */}
            <div className="hidden sm:flex w-32 sm:w-40 flex-col items-center justify-center flex-shrink-0 rounded-l-3xl bg-slate-200/30">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900">{item.time_start}</span>
              <span className="text-sm sm:text-base font-medium text-slate-500 mt-1">{item.time_end}</span>
            </div>

            {/* Desktop Circle - Only for talks with speakers */}
            {hasAvatar && (
              <div className="hidden sm:block absolute left-40 sm:left-44 top-1/2 -translate-y-1/2 -translate-x-1/2 z-20">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-[4px] border-teal-500 shadow-lg flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-105 bg-white">
                  {speaker.photo ? (
                    <div className="relative w-full h-full">
                      <Image
                        src={speaker.photo}
                        alt={speaker.name}
                        fill
                        sizes="96px"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <User className="w-8 h-8 sm:w-10 sm:h-10 text-teal-600" />
                  )}
                </div>
              </div>
            )}

            {/* Mobile Content */}
            <div className="sm:hidden flex-1 p-4 pt-2 pb-4 flex flex-col justify-center rounded-b-3xl">
              <div className="flex flex-col gap-1 text-center">
                <h3 className="text-base font-bold leading-tight text-slate-900">{item.title}</h3>
                {(speaker || item.speaker_name) && (
                  <p className="text-sm font-medium text-slate-600">
                    {speaker ? speaker.name : item.speaker_name}
                  </p>
                )}
                {item.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                )}
              </div>
            </div>

            {/* Desktop Content */}
            <div className={`hidden sm:flex flex-1 p-6 ${hasAvatar ? 'pl-20 sm:pl-24' : 'pl-6'} flex-col justify-center relative z-0 rounded-r-3xl`}>
              <div className="flex flex-col gap-1">
                <h3 className="text-lg sm:text-xl font-bold leading-tight text-slate-900">{item.title}</h3>
                {(speaker || item.speaker_name) && (
                  <p className="text-base sm:text-lg font-medium text-slate-600">
                    {speaker ? speaker.name : item.speaker_name}
                  </p>
                )}
                {item.description && (
                  <p className="text-sm text-slate-500 mt-2 line-clamp-2">{item.description}</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
