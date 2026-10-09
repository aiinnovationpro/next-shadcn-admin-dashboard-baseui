import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Read-only: a ticked item is shown struck through, nothing here can be ticked.
export function DayPlan({ lines }: { lines: string[] }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Day plan</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-1 text-sm">
          {lines.map((l) => (
            <li key={l} className={/^- \[x\] /i.test(l) ? "text-muted-foreground line-through" : undefined}>
              {l.replace(/^- \[[ xX]\] /, "")}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
