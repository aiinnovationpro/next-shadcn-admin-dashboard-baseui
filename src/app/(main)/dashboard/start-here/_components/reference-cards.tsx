import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { alreadyHere, alsoYours, commands, pluginCount, plugins } from "../_data/start-here";
import { ItemList } from "./item-list";

export function ReferenceCards() {
  return (
    <div className="flex flex-col gap-3">
      <Card size="sm">
        <CardHeader>
          <CardTitle>The plugins, one by one</CardTitle>
          <CardDescription>{pluginCount}, and what each one is actually for.</CardDescription>
        </CardHeader>
        <CardContent>
          <ItemList items={plugins} />
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Already in the folder</CardTitle>
          <CardDescription>Nothing to install, nothing to decide.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <ul className="flex flex-wrap gap-1.5" aria-label="Commands">
            {commands.map((c) => (
              <li key={c}>
                <Badge variant="outline" className="font-mono">
                  {c}
                </Badge>
              </li>
            ))}
          </ul>
          <ItemList items={alreadyHere} />
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Also yours, one sentence away</CardTitle>
          <CardDescription>Curated and documented, set up whenever you want it.</CardDescription>
        </CardHeader>
        <CardContent>
          <ItemList items={alsoYours} />
        </CardContent>
      </Card>
    </div>
  );
}
