import { keyToDate, toKey } from './format';

// Per-user color (same golden-angle hue as the web calendar).
export const userColor = (id) => {
  const hue = Math.round((Number(id) * 137.508) % 360);
  return { background: `hsl(${hue}, 70%, 88%)`, color: `hsl(${hue}, 55%, 25%)`, dot: `hsl(${hue}, 60%, 50%)` };
};

export const typeIcon = { vacation: '🏖️', sick: '🤒', other: '📌' };

// Monday-first grid of one month, padded with the neighbouring days.
export const monthGrid = (year, month) => {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  const cells = [];
  const last = new Date(year, month + 1, 0);
  const totalDays = offset + last.getDate();
  const weeks = Math.ceil(totalDays / 7);
  for (let i = 0; i < weeks * 7; i += 1) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    cells.push({
      key: toKey(d),
      day: d.getDate(),
      inMonth: d.getMonth() === month,
      weekend: d.getDay() === 0 || d.getDay() === 6,
    });
  }
  return cells;
};

// Mon-Fri days between two keys, minus holidays; a half day counts 0.5.
export const workingDays = (start, end, halfDay, holidayMap = {}) => {
  if (!start || !end || end < start) return 0;
  let days = 0;
  for (let d = keyToDate(start); toKey(d) <= end; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0 && d.getDay() !== 6 && !holidayMap[toKey(d)]) days += 1;
  }
  return halfDay ? Math.min(days, 0.5) : days;
};

export const entriesOn = (entries, key) => entries.filter((e) => e.start_date <= key && e.end_date >= key);

export const fmtDays = (n) => (Number.isInteger(Number(n)) ? String(Number(n)) : Number(n).toFixed(1));

const pad = (n) => String(n).padStart(2, '0');
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

// Easter Sunday (anonymous Gregorian algorithm) -- same as the web modal.
const easter = (y) => {
  const a = y % 19;
  const b = Math.floor(y / 100);
  const c = y % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day);
};

export const swissHolidays = (y) => {
  const e = easter(y);
  const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return [
    { date: `${y}-01-01`, name: 'Neujahr' },
    { date: `${y}-01-02`, name: 'Berchtoldstag' },
    { date: key(addDays(e, -2)), name: 'Karfreitag' },
    { date: key(addDays(e, 1)), name: 'Ostermontag' },
    { date: key(addDays(e, 39)), name: 'Auffahrt' },
    { date: key(addDays(e, 50)), name: 'Pfingstmontag' },
    { date: `${y}-08-01`, name: 'Bundesfeier' },
    { date: `${y}-12-25`, name: 'Weihnachten' },
    { date: `${y}-12-26`, name: 'Stephanstag' },
  ];
};
