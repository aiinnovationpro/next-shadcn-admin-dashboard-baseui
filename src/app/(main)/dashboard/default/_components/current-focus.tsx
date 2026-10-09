import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { BoldText } from "../../_workspace/bold-text";

export function CurrentFocus({ text }: { text: string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Current focus</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        {text.split("\n\n").map((p) => (
          <p key={p}>
            <BoldText text={p} />
          </p>
        ))}
      </CardContent>
    </Card>
  );
}
