import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Summary } from "@/lib/workspace/progress";

function Stat({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
        {note && <p className="text-muted-foreground text-sm">{note}</p>}
      </CardHeader>
    </Card>
  );
}

export function SummaryCards({ summary }: { summary: Summary }) {
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
      <Stat label="Done this week" value={doneThisWeek} note="since Monday" />
    </div>
  );
}
