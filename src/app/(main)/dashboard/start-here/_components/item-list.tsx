import { Badge } from "@/components/ui/badge";

import type { Item } from "../_data/start-here";

export function ItemList({ items }: { items: Item[] }) {
  return (
    <ul className="flex flex-col gap-3 text-sm">
      {items.map((i) => (
        <li key={i.name} className="flex flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-2 font-medium">
            {i.name}
            {i.tag && <Badge variant="secondary">{i.tag}</Badge>}
          </span>
          <span className="text-muted-foreground">{i.text}</span>
        </li>
      ))}
    </ul>
  );
}
