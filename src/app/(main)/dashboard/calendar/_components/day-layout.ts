// Time-pure logic for the Calendar timeline: minutes since midnight in, positions and labels out.
// No DOM here, so node can test it. Ported from the old dashboard's dayAxis (context/today_template.html).

export type Slot = { start: number; end: number };

export const DAY_FROM = 8 * 60; // the fixed day frame, 08:00 to 18:00; it only stretches for events outside it
export const DAY_TO = 18 * 60;
export const MIN_GAP = 45; // shorter gaps are not worth a label
const DEFAULT_LENGTH = 30; // a meeting without an end time is assumed to take 30 minutes
const MIN_LENGTH = 10; // an end at or before the start still gets a visible block

// "09:30" -> 570. Anything that is not a clock time is null, never a guess.
export function toMinutes(text: string | undefined): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((text ?? "").trim());
  if (!m) return null;
  const [h, min] = [Number(m[1]), Number(m[2])];
  return h < 24 && min < 60 ? h * 60 + min : null;
}

export function formatClock(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

// null when there is no usable start time (all-day items live outside the axis).
export function toSlot(time: string | undefined, end: string | undefined): Slot | null {
  const start = toMinutes(time);
  if (start === null) return null;
  const stop = toMinutes(end) ?? start + DEFAULT_LENGTH;
  return { start, end: Math.max(stop, start + MIN_LENGTH) };
}

// "45 min", "1 hr", "2 hrs", "1 hr 30 min"
export function formatLength(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} ${h === 1 ? "hr" : "hrs"}${m ? ` ${m} min` : ""}`;
}

// The frame never moves with the time of day, only for events that fall outside 08:00-18:00.
export function dayFrame(slots: Slot[]): { from: number; to: number } {
  if (slots.length === 0) return { from: DAY_FROM, to: DAY_TO };
  const first = Math.min(...slots.map((s) => s.start));
  const last = Math.max(...slots.map((s) => s.end));
  return {
    from: Math.min(DAY_FROM, Math.floor(first / 60) * 60),
    to: Math.min(Math.max(DAY_TO, Math.ceil(last / 60) * 60), 24 * 60),
  };
}

// Lanes are counted per overlap group, so one double booking does not squeeze the rest of the day.
// Returns one entry per input slot, in input order.
export function assignLanes(slots: Slot[]): { lane: number; lanes: number }[] {
  const order = slots.map((_, i) => i).sort((a, b) => slots[a].start - slots[b].start || slots[a].end - slots[b].end);
  const out = slots.map(() => ({ lane: 0, lanes: 1 }));
  let group: number[] = [];
  let groupEnd = -1;
  const close = () => {
    const laneEnd: number[] = [];
    for (const i of group) {
      let lane = laneEnd.findIndex((e) => e <= slots[i].start);
      if (lane === -1) lane = laneEnd.push(slots[i].end) - 1;
      else laneEnd[lane] = slots[i].end;
      out[i].lane = lane;
    }
    for (const i of group) out[i].lanes = laneEnd.length;
  };
  for (const i of order) {
    if (group.length > 0 && slots[i].start >= groupEnd) {
      close();
      group = [];
    }
    group.push(i);
    groupEnd = group.length === 1 ? slots[i].end : Math.max(groupEnd, slots[i].end);
  }
  if (group.length > 0) close();
  return out;
}

// Free time between the merged busy intervals, long enough to label.
export function freeGaps(slots: Slot[], minGap = MIN_GAP): Slot[] {
  const busy: [number, number][] = [];
  for (const s of [...slots].sort((a, b) => a.start - b.start || a.end - b.end)) {
    const last = busy[busy.length - 1];
    if (last && s.start <= last[1]) last[1] = Math.max(last[1], s.end);
    else busy.push([s.start, s.end]);
  }
  const gaps: Slot[] = [];
  for (let i = 0; i < busy.length - 1; i++) {
    if (busy[i + 1][0] - busy[i][1] >= minGap) gaps.push({ start: busy[i][1], end: busy[i + 1][0] });
  }
  return gaps;
}

export type Marker = "running" | "next";

// Past = already over. The marker goes to the first meeting not yet over; reminders are
// your own deadlines, not something you head towards, so they never get one.
export function statusAt(
  items: (Slot & { reminder: boolean })[],
  now: number,
): { past: boolean[]; marker: { index: number; kind: Marker } | null } {
  const past = items.map((i) => i.end <= now);
  let index = -1;
  items.forEach((it, i) => {
    if (it.reminder || it.end <= now) return;
    if (index === -1 || it.start < items[index].start) index = i;
  });
  return { past, marker: index === -1 ? null : { index, kind: items[index].start <= now ? "running" : "next" } };
}
