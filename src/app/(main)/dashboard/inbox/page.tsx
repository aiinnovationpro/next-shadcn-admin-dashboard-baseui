import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDay } from "@/lib/workspace/dates";
import { getSnapshot } from "@/lib/workspace/snapshot";

import { ExpandRow } from "../_workspace/expand-row";
import { StaleMark } from "../_workspace/stale-mark";
import { WorkspacePage } from "../_workspace/workspace-page";

export default async function Page() {
  const snap = await getSnapshot();

  return (
    <WorkspacePage snap={snap} title="Inbox" needs={["STATUS.md"]}>
      {snap.inbox.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Mail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {snap.inbox.map((item) => (
              <ExpandRow key={`${item.source}-${item.headline}`} colSpan={5} detail={item.context || null}>
                <TableCell className="max-w-xl whitespace-normal">
                  {item.stale && (
                    <>
                      <StaleMark />{" "}
                    </>
                  )}
                  {item.headline}
                </TableCell>
                <TableCell className="text-muted-foreground">{item.source}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{item.age}</TableCell>
                <TableCell className="whitespace-nowrap">{item.due && formatDay(item.due)}</TableCell>
                <TableCell>
                  {item.mailUrl && (
                    <a href={item.mailUrl} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                      Open mail
                    </a>
                  )}
                </TableCell>
              </ExpandRow>
            ))}
          </TableBody>
        </Table>
      )}
    </WorkspacePage>
  );
}
