import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { howYouWork } from "../_data/start-here";

export function HowYouWork() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>How you work with this</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm lg:grid-cols-2">
          {howYouWork.map((h) => (
            <li key={h.lead}>
              <span className="font-medium">{h.lead}</span> {h.text}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
