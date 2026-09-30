"use client";

import type { ReactNode } from "react";

import { AnimatedFrown } from "@/components/animated-frown";
import { TableCell, TableRow } from "@/components/ui/table";

export function TableEmpty({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <TableRow plain>
      <TableCell colSpan={colSpan} className="py-10 text-center">
        <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
          <AnimatedFrown className="size-8" />
          <span>{children}</span>
        </div>
      </TableCell>
    </TableRow>
  );
}
