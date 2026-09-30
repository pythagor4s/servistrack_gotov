"use client";

import { useState, type ReactNode } from "react";
import { SlidersHorizontal } from "@/components/icons";

import { ClearFiltersButton } from "@/components/filter-bar";
import { BarCircle } from "@/components/mobile-action-bar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function MobileFilters({
  title,
  activeCount,
  onClear,
  children,
  className,
}: {
  title: string;
  activeCount: number;
  onClear: () => void;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <BarCircle
        label={title}
        badge={activeCount}
        onClick={() => setOpen(true)}
        className={className}
      >
        <SlidersHorizontal />
      </BarCircle>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SlidersHorizontal className="size-5 shrink-0" />
              {title}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Izbira velja takoj; seznam se posodobi za dialogom.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 [&>*]:w-full">{children}</div>
          <DialogFooter>
            <ClearFiltersButton
              active={activeCount > 0}
              onClear={onClear}
              className="mr-auto"
            />
            <Button type="button" onClick={() => setOpen(false)}>
              Zapri
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
