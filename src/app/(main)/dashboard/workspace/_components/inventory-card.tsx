import type { ReactNode } from "react";

import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type Row = {
  name: string;
  text: string | null; // what it is for, or where it comes from
  badge?: { label: string; on: boolean }; // on: the good state; off is drawn quieter
  chip?: string | null; // a schedule, shown in its own line because it can be long
};

export function InventoryCard({
  icon: Icon,
  title,
  summary,
  rows,
  footer,
}: {
  icon: LucideIcon;
  title: string;
  summary: string;
  rows: Row[];
  footer?: ReactNode;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" aria-hidden />
          {title}
        </CardTitle>
        <CardDescription>{summary}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ul className="flex flex-col gap-3 text-sm">
          {rows.map((r) => (
            <li key={r.name} className="flex flex-col gap-0.5">
              <span className="flex flex-wrap items-center gap-2 font-medium">
                <span className="break-all">{r.name}</span>
                {r.badge && <Badge variant={r.badge.on ? "secondary" : "outline"}>{r.badge.label}</Badge>}
              </span>
              {r.text && <span className="text-muted-foreground">{r.text}</span>}
              {r.chip && <span className="font-mono text-muted-foreground text-xs">{r.chip}</span>}
            </li>
          ))}
        </ul>
        {footer}
      </CardContent>
    </Card>
  );
}
