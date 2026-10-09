// "Thu Oct 8" (Canadian order, no comma); the year only when it is not this year.
export function formatDay(iso: string, now: Date = new Date()): string {
  const [y, m, d] = iso.split("-").map(Number);
  const parts = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).formatToParts(
    new Date(y, m - 1, d),
  );
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const text = `${get("weekday")} ${get("month")} ${get("day")}`;
  return y === now.getFullYear() ? text : `${text}, ${y}`;
}

// Honest source age: "just now", "2 min ago", "3 hours ago", "3 days ago".
export function formatAge(minutes: number): string {
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  return `${Math.floor(hours / 24)} days ago`;
}
