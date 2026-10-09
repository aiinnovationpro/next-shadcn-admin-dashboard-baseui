import { assignLanes, dayFrame, formatLength, freeGaps, statusAt, toMinutes, toSlot } from "./day-layout.ts";
import assert from "node:assert/strict";
import { test } from "node:test";

const at = (h: number, m = 0) => h * 60 + m;
const slot = (a: [number, number], b: [number, number]) => ({ start: at(...a), end: at(...b) });

test("clock times parse strictly; anything else is null, not a guess", () => {
  assert.equal(toMinutes("09:30"), 570);
  assert.equal(toMinutes("9:05"), 545);
  for (const bad of ["", undefined, "24:00", "12:60", "noon", "9", "09:30pm"]) assert.equal(toMinutes(bad), null);
});

test("a missing end is 30 minutes, an end before the start still shows a block, no start is null", () => {
  assert.deepEqual(toSlot("10:00", undefined), { start: 600, end: 630 });
  assert.deepEqual(toSlot("10:00", "garbage"), { start: 600, end: 630 });
  assert.deepEqual(toSlot("10:00", "09:00"), { start: 600, end: 610 });
  assert.equal(toSlot(undefined, "11:00"), null);
});

test("lengths read as '45 min', '1 hr', '2 hrs', '1 hr 30 min'", () => {
  assert.equal(formatLength(45), "45 min");
  assert.equal(formatLength(60), "1 hr");
  assert.equal(formatLength(120), "2 hrs");
  assert.equal(formatLength(90), "1 hr 30 min");
});

test("overlapping meetings share a day-width only within their own group", () => {
  const slots = [
    slot([9, 0], [10, 0]), // alone
    slot([11, 0], [12, 0]), // overlaps the next one
    slot([11, 30], [12, 30]),
    slot([12, 30], [13, 0]), // starts exactly when the previous ends: not an overlap
  ];
  assert.deepEqual(assignLanes(slots), [
    { lane: 0, lanes: 1 },
    { lane: 0, lanes: 2 },
    { lane: 1, lanes: 2 },
    { lane: 0, lanes: 1 },
  ]);
});

test("three at once take three lanes, and a freed lane is reused", () => {
  const slots = [slot([9, 0], [11, 0]), slot([9, 30], [10, 0]), slot([9, 45], [10, 30]), slot([10, 0], [10, 45])];
  const lanes = assignLanes(slots);
  assert.deepEqual(
    lanes.map((l) => l.lanes),
    [3, 3, 3, 3],
  );
  assert.deepEqual(
    lanes.map((l) => l.lane),
    [0, 1, 2, 1],
  );
});

test("lanes come back in input order even when the input is not sorted", () => {
  const lanes = assignLanes([slot([11, 30], [12, 30]), slot([11, 0], [12, 0])]);
  assert.deepEqual(lanes, [
    { lane: 1, lanes: 2 },
    { lane: 0, lanes: 2 },
  ]);
});

test("gaps are measured between merged busy time and need 45 minutes to count", () => {
  const slots = [slot([9, 0], [10, 0]), slot([9, 30], [10, 30]), slot([11, 0], [11, 30]), slot([14, 0], [15, 0])];
  // 10:30-11:00 is 30 min: too short. 11:30-14:00 is 2.5 hrs.
  assert.deepEqual(freeGaps(slots), [slot([11, 30], [14, 0])]);
  assert.deepEqual(freeGaps([slot([9, 0], [10, 0])]), []);
});

test("the frame is 08:00-18:00 and only stretches for events outside it", () => {
  assert.deepEqual(dayFrame([]), { from: 480, to: 1080 });
  assert.deepEqual(dayFrame([slot([9, 0], [10, 0])]), { from: 480, to: 1080 });
  assert.deepEqual(dayFrame([slot([7, 30], [8, 30]), slot([17, 0], [19, 15])]), { from: 420, to: 1200 });
  assert.equal(dayFrame([slot([22, 0], [23, 59])]).to, 1440);
});

test("past, running and up next: a 14:00-15:00 meeting is not over at 14:30", () => {
  const items = [
    { ...slot([9, 0], [10, 0]), reminder: false },
    { ...slot([14, 0], [15, 0]), reminder: false },
    { ...slot([16, 0], [16, 30]), reminder: false },
  ];
  assert.deepEqual(statusAt(items, at(14, 30)), {
    past: [true, false, false],
    marker: { index: 1, kind: "running" },
  });
  assert.deepEqual(statusAt(items, at(11, 0)).marker, { index: 1, kind: "next" });
  assert.equal(statusAt(items, at(15, 0)).past[1], true); // ends exactly now: over
  assert.equal(statusAt(items, at(17, 0)).marker, null);
});

test("reminders never take the marker, and an overlapping pair marks the earlier start", () => {
  const items = [
    { ...slot([9, 30], [9, 45]), reminder: true },
    { ...slot([10, 30], [11, 30]), reminder: false },
    { ...slot([10, 0], [11, 0]), reminder: false },
  ];
  assert.deepEqual(statusAt(items, at(9, 0)).marker, { index: 2, kind: "next" });
});
