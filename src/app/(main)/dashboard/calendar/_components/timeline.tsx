"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";

import "./agenda.css";
import { assignLanes, dayFrame, formatClock, formatLength, freeGaps, type Slot, statusAt, toSlot } from "./day-layout";

const GUTTER = 52; // px, the hour labels
const TARGET = 560; // px, the axis height for a 10-hour day, so Calendar stays on one screen
const MIN_PPM = 0.7; // px per minute: a long day grows past TARGET rather than crushing the blocks
const MAX_PPM = 1.6;
const WIDE = "(min-width: 640px)"; // Tailwind's sm

type Layout = { from: number; to: number; ppm: number; gaps: Slot[] };

const minutesNow = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

// Draws the server-rendered agenda fragment as a day timeline. It only reads data-time / data-end from the
// <li class="ev"> elements and positions them; the fragment itself is never rewritten. Today's agenda only:
// the caller does not render this for an old cache.
export function Timeline({ html }: { html: string }) {
  const list = useRef<HTMLUListElement>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [wide, setWide] = useState(false); // false on the server and first paint: the plain list
  const [now, setNow] = useState<number | null>(null);
  const [events, setEvents] = useState<(Slot & { reminder: boolean })[]>([]);

  // Below 640px the overlap lanes are too narrow to hold a title and its briefing button: plain list there.
  useEffect(() => {
    const query = window.matchMedia(WIDE);
    const sync = () => setWide(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // Layout: positions follow the fragment, so they are recomputed only when it changes (or the width class does).
  // biome-ignore lint/correctness/useExhaustiveDependencies: html is the trigger; the effect reads the DOM it produced
  useEffect(() => {
    const ul = list.current;
    if (!ul) return;
    if (!wide) {
      setLayout(null);
      setEvents([]);
      return;
    }
    const lis = [...ul.querySelectorAll<HTMLElement>(":scope > li.ev")];
    const timed = lis.flatMap((li) => {
      const slot = toSlot(li.dataset.time, li.dataset.end);
      return slot ? [{ li, slot, hasEnd: Boolean(li.dataset.end) }] : [];
    });
    // With fewer than half the end times a drawn timeline would invent its gaps: keep the plain list.
    if (timed.length === 0 || timed.filter((t) => t.hasEnd).length < timed.length / 2) {
      setLayout(null);
      setEvents([]);
      return;
    }
    const slots = timed.map((t) => t.slot);
    const { from, to } = dayFrame(slots);
    const ppm = Math.min(MAX_PPM, Math.max(MIN_PPM, TARGET / (to - from)));
    const y = (m: number) => Math.round((m - from) * ppm);
    const lanes = assignLanes(slots);
    timed.forEach(({ li, slot }, i) => {
      const { lane, lanes: n } = lanes[i];
      const height = Math.max(y(slot.end) - y(slot.start) - 3, 20);
      li.style.top = `${y(slot.start)}px`;
      li.style.height = `${height}px`;
      li.style.left = `calc(${GUTTER}px + ${lane} * (100% - ${GUTTER}px) / ${n})`;
      li.style.width = `calc((100% - ${GUTTER}px) / ${n} - 4px)`;
      li.classList.toggle("tight", height < 46);
      li.dataset.dur = formatLength(slot.end - slot.start);
    });
    setEvents(timed.map((t) => ({ ...t.slot, reminder: t.li.classList.contains("rem") })));
    setLayout({ from, to, ppm, gaps: freeGaps(slots) });
    setNow(minutesNow());
    return () => {
      for (const { li } of timed) {
        li.removeAttribute("style");
        li.removeAttribute("data-dur");
        li.classList.remove("tight", "past", "running", "next");
      }
    };
  }, [html, wide]);

  // The clock: dims what is over and moves the marker and the now line, once a minute.
  useEffect(() => {
    const timer = setInterval(() => setNow(minutesNow()), 30_000);
    return () => clearInterval(timer);
  }, []);

  // Status classes follow the clock (and the layout, which resets them).
  useEffect(() => {
    const ul = list.current;
    if (!ul || !layout || now === null) return;
    const timed = [...ul.querySelectorAll<HTMLElement>(":scope > li.ev")].filter((li) => li.dataset.dur);
    const { past, marker } = statusAt(events, now);
    timed.forEach((li, i) => {
      li.classList.toggle("past", past[i] ?? false);
      li.classList.toggle("running", marker?.index === i && marker.kind === "running");
      li.classList.toggle("next", marker?.index === i && marker.kind === "next");
    });
  }, [layout, events, now]);

  const y = (m: number) => (layout ? Math.round((m - layout.from) * layout.ppm) : 0);
  const hours: number[] = [];
  if (layout) for (let m = layout.from; m <= layout.to; m += 60) hours.push(m);

  return (
    <div
      className="morning-agenda"
      style={layout ? ({ "--tl-h": `${y(layout.to)}px`, "--tl-gutter": `${GUTTER}px` } as CSSProperties) : undefined}
    >
      {layout && (
        <div className="tl-grid" aria-hidden="true">
          {hours.map((m) => (
            <div key={m} className="tl-hr" style={{ top: y(m) }}>
              {/* the now label would sit on top of an hour label within ~15 minutes of it */}
              <span className={now !== null && Math.abs(m - now) < 15 ? "invisible" : undefined}>{formatClock(m)}</span>
            </div>
          ))}
          {layout.gaps.map((g) => (
            <div key={g.start} className="tl-free" style={{ top: y(g.start) + 2, height: y(g.end) - y(g.start) - 4 }}>
              <span>{formatLength(g.end - g.start)} free</span>
            </div>
          ))}
          {now !== null && now >= layout.from && now <= layout.to && (
            <div className="tl-now" style={{ top: y(now) }}>
              <span>{formatClock(now)}</span>
            </div>
          )}
        </div>
      )}
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: escaped fragment written by /morning, see the spec */}
      <ul data-timeline={layout ? "" : undefined} ref={list} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
