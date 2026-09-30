"use client";

import type { ReactElement, ReactNode } from "react";
import { toast } from "sonner";

import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";

export function RowContextMenu({ items, children }: { items: ReactNode; children: ReactElement }) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>{items}</ContextMenuContent>
    </ContextMenu>
  );
}

export async function copyValue(value: string, copiedLabel: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(copiedLabel, { id: "row-menu-copy" });
  } catch {
    toast.error("Kopiranje ni uspelo", { id: "row-menu-copy" });
  }
}
