const MOSCOW_TIME_ZONE = 'Europe/Moscow';
const MOSCOW_OFFSET_MS = 3 * 60 * 60 * 1000;

type DateParts = {
  day: number;
  month: number;
  year: number;
};

function parseConferenceDateParts(dateStr: string): DateParts {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return { day, month, year };
  }

  const parts = dateStr.split('.');
  if (parts.length === 3) {
    const [day, month, year] = parts.map(Number);
    return { day, month, year };
  }

  throw new Error(`Unsupported conference date format: ${dateStr}`);
}

function getMoscowMonthLabel(parts: DateParts, month: 'short' | 'long'): string {
  const moscowDate = parseConferenceDateInMoscow(
    `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
  );

  return new Intl.DateTimeFormat('ru-RU', {
    month,
    timeZone: MOSCOW_TIME_ZONE,
  }).format(moscowDate);
}

export function getConferenceDateSortKey(dateStr: string): number {
  const { day, month, year } = parseConferenceDateParts(dateStr);
  return year * 10000 + month * 100 + day;
}

export function parseConferenceDateInMoscow(dateStr: string): Date {
  const { day, month, year } = parseConferenceDateParts(dateStr);
  return new Date(Date.UTC(year, month - 1, day) - MOSCOW_OFFSET_MS);
}

export function getTodayMoscowSortKey(now = new Date()): number {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: MOSCOW_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(now);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);

  return year * 10000 + month * 100 + day;
}

export function isConferenceUpcoming(date: string, dateEnd?: string, now = new Date()): boolean {
  const endSortKey = getConferenceDateSortKey(dateEnd ?? date);
  return endSortKey >= getTodayMoscowSortKey(now);
}

export function formatConferenceDateRange(
  start: string,
  end?: string,
  options: { month?: 'short' | 'long' } = {}
): string {
  const month = options.month ?? 'long';
  const startParts = parseConferenceDateParts(start);
  const startMonthLabel = getMoscowMonthLabel(startParts, month);

  if (!end) {
    return `${startParts.day} ${startMonthLabel} ${startParts.year}`;
  }

  const endParts = parseConferenceDateParts(end);
  const endMonthLabel = getMoscowMonthLabel(endParts, month);

  if (startParts.year === endParts.year && startParts.month === endParts.month) {
    return `${startParts.day}-${endParts.day} ${endMonthLabel} ${endParts.year}`;
  }

  if (startParts.year === endParts.year) {
    return `${startParts.day} ${startMonthLabel} - ${endParts.day} ${endMonthLabel} ${endParts.year}`;
  }

  return `${startParts.day} ${startMonthLabel} ${startParts.year} - ${endParts.day} ${endMonthLabel} ${endParts.year}`;
}
