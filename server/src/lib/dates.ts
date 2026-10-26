const DAY_MS = 24 * 60 * 60 * 1000;

/** Parses YYYY-MM-DD as midnight UTC. */
export function parseDay(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function toDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

/** Every YYYY-MM between start (inclusive) and end (exclusive). */
export function monthsBetween(start: Date, end: Date): string[] {
  const months: string[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  while (cursor < end) {
    months.push(monthKey(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}
