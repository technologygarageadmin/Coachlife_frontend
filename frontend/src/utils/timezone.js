/*
 * Slot times are stored as plain IST (Asia/Kolkata) weekday + HH:MM. To show them in the
 * viewer's own zone (IST, or US Central with the right CST/CDT for that date) a time has to be
 * converted using the real calendar date - the offset to Chicago is 10.5h in summer and 11.5h in
 * winter, and an early-morning IST time lands on the *previous* day in Chicago.
 */
export const IST = 'Asia/Kolkata';
const IST_OFFSET_MS = 330 * 60000;

const cache = {};
const formatterFor = (tz) => cache[tz] || (cache[tz] = new Intl.DateTimeFormat('en-US', {
  timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: false,
}));

// Calendar parts of an instant in a zone. `m` is 0-based like JS dates.
export const partsIn = (ms, tz) => {
  const parts = formatterFor(tz).formatToParts(new Date(ms));
  const get = (t) => Number(parts.find(p => p.type === t).value);
  return { y: get('year'), m: get('month') - 1, d: get('day'), h: get('hour') % 24, min: get('minute') };
};

const offsetMs = (ms, tz) => {
  const p = partsIn(ms, tz);
  return Date.UTC(p.y, p.m, p.d, p.h, p.min) - Math.floor(ms / 60000) * 60000;
};

// The instant a calendar day starts in a zone.
export const localMidnight = (y, m, d, tz) => {
  const guess = Date.UTC(y, m, d);
  const first = guess - offsetMs(guess, tz);
  return guess - offsetMs(first, tz);
};

const istInstant = (y, m, d, minutes) => Date.UTC(y, m, d, 0, minutes) - IST_OFFSET_MS;
const weekdayIdx = (y, m, d) => (new Date(Date.UTC(y, m, d)).getUTCDay() + 6) % 7; // Mon = 0
const minutesInDay = (ms, tz) => { const p = partsIn(ms, tz); return p.h * 60 + p.min; };

export const systemZone = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || IST; } catch { return IST; }
};

export const isIst = (tz) => tz === IST || tz === 'Asia/Calcutta';

// "IST", "CST", "CDT", ... for a zone on a given date.
export const tzLabel = (tz, ms = Date.now()) => {
  if (isIst(tz)) return 'IST';
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' }).formatToParts(new Date(ms)).find(p => p.type === 'timeZoneName');
    return part ? part.value : tz;
  } catch { return tz; }
};

export const nowIn = (tz) => {
  const p = partsIn(Date.now(), tz);
  return { key: `${p.y}-${p.m}-${p.d}`, mins: p.h * 60 + p.min };
};

/*
 * Everything that happens on one calendar day (y, m, d) in `tz`, taken from the IST weekly
 * schedule. `itemsForWeekday(idx)` returns the IST items ({ start, end } in minutes) for a
 * weekday (Mon = 0). A session that straddles midnight is split across the two days.
 * Returns [{ item, start, end }] with start/end as minutes from midnight in `tz`.
 */
export const projectDay = (y, m, d, tz, itemsForWeekday) => {
  const dayStart = localMidnight(y, m, d, tz);
  const dayEnd = localMidnight(y, m, d + 1, tz);
  const a = partsIn(dayStart, IST);
  const z = partsIn(dayEnd - 60000, IST);
  const istDates = [[a.y, a.m, a.d]];
  if (z.y !== a.y || z.m !== a.m || z.d !== a.d) istDates.push([z.y, z.m, z.d]);

  const out = [];
  istDates.forEach(([iy, im, id]) => {
    itemsForWeekday(weekdayIdx(iy, im, id)).forEach((item) => {
      const s = istInstant(iy, im, id, item.start);
      const e = istInstant(iy, im, id, item.end);
      const cs = Math.max(s, dayStart);
      const ce = Math.min(e, dayEnd);
      if (ce <= cs) return;
      out.push({ item, start: minutesInDay(cs, tz), end: ce === dayEnd ? 1440 : minutesInDay(ce, tz) });
    });
  });
  return out;
};
