'use client';

import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  targetDate: Date;
}

export function CountdownTimer({ targetDate }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = targetDate.getTime();
      const difference = target - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  const formatNumber = (num: number) => {
    return num.toString().padStart(2, '0');
  };

  const TimeUnit = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="bg-white text-slate-900 rounded-xl shadow-sm border border-slate-100 w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center mb-2">
        <span className="text-3xl sm:text-4xl font-bold font-mono tracking-tighter">
          {formatNumber(value)}
        </span>
      </div>
      <span className="text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider">{label}</span>
    </div>
  );

  return (
    <div className="mb-12">
      <div className="flex flex-wrap justify-center gap-4 sm:gap-8">
        <TimeUnit value={timeLeft.days} label="Дней" />
        <TimeUnit value={timeLeft.hours} label="Часов" />
        <TimeUnit value={timeLeft.minutes} label="Минут" />
        <TimeUnit value={timeLeft.seconds} label="Секунд" />
      </div>
    </div>
  );
}
