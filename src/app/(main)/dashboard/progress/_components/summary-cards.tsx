import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Summary } from "@/lib/workspace/progress";

// null means the number could not be read: a dash, never a zero that looks like "nothing done".
function Stat({ label, value, note }: { label: string; value: number | null; note?: string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value ?? "–"}</CardTitle>
        {note && <p className="text-muted-foreground text-sm">{note}</p>}
      </CardHeader>
    </Card>
  );
}

export function SummaryCards({ summary, doneReadable }: { summary: Summary; doneReadable: boolean }) {
  const { open, urgent, overdue, oldestOverdueDays, doneThisWeek } = summary;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label="Open" value={open} />
      <Stat label="Urgent" value={urgent} note="overdue or due in 7 days" />
      <Stat
        label="Behind"
        value={overdue}
        note={
          oldestOverdueDays === null
            ? "overdue"
            : `overdue, oldest ${oldestOverdueDays} ${oldestOverdueDays === 1 ? "day" : "days"}`
        }
      />
      <Stat label="Done this week" value={doneReadable ? doneThisWeek : null} note="since Monday" />
    </div>
  );
}
