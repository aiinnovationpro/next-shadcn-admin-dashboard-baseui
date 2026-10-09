"use client";

import { type ReactNode, useState } from "react";

import { cn } from "cn";

import { TableCell, TableRow } from "@/components/ui/table";

// A table row that shows its detail line on click. A row with no detail stays plain.
export function ExpandRow({
  children,
  detail,
  colSpan,
}: {
  children: ReactNode;
  detail: ReactNode | null;
  colSpan: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow
        className={cn(detail && "cursor-pointer")}
        aria-expanded={detail ? open : undefined}
        onClick={detail ? (e) => !(e.target as HTMLElement).closest("a") && setOpen(!open) : undefined}
      >
        {children}
      </TableRow>
      {open && detail && (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={colSpan} className="whitespace-normal text-muted-foreground">
            {detail}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
