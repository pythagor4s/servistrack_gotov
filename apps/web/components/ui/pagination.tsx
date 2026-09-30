"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "@/components/icons";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { IconAction } from "@/components/ui/tooltip";

export function useClientPage<T>(
  rows: T[],
  pageSize: number,
): { page: number; setPage: (page: number) => void; pageCount: number; paged: T[] } {
  const [page, setPage] = React.useState(0);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  return {
    page: safePage,
    setPage,
    pageCount,
    paged: rows.slice(safePage * pageSize, (safePage + 1) * pageSize),
  };
}

function pageItems(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i);
  const items: (number | "gap")[] = [0];
  const start = Math.max(1, page - 1);
  const end = Math.min(pageCount - 2, page + 1);
  if (start > 1) items.push("gap");
  for (let i = start; i <= end; i++) items.push(i);
  if (end < pageCount - 2) items.push("gap");
  items.push(pageCount - 1);
  return items;
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
  className,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  if (pageCount <= 1) return null;

  return (
    <nav
      aria-label="Oštevilčenje strani"
      className={cn("flex items-center justify-center gap-1", className)}
    >
      <IconAction label="Prejšnja stran">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Prejšnja stran"
          disabled={page <= 0}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
      </IconAction>

      {pageItems(page, pageCount).map((item, i) =>
        item === "gap" ? (
          <span key={`gap-${i}`} className="px-1 text-sm text-muted-foreground">
            …
          </span>
        ) : (
          <Button
            key={item}
            variant={item === page ? "outline" : "ghost"}
            size="icon-sm"
            aria-label={`Stran ${item + 1}`}
            aria-current={item === page ? "page" : undefined}
            className={cn("tabular-nums", item === page && "bg-field-tinted")}
            onClick={() => onPageChange(item)}
          >
            {item + 1}
          </Button>
        ),
      )}

      <IconAction label="Naslednja stran">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Naslednja stran"
          disabled={page >= pageCount - 1}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </IconAction>
    </nav>
  );
}

export function PageStep({
  direction,
  page,
  pageCount,
  onPageChange,
  bare = false,
  className,
}: {
  direction: "prev" | "next";
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  bare?: boolean;
  className?: string;
}) {
  const prev = direction === "prev";
  const label = prev ? "Prejšnja stran" : "Naslednja stran";
  const disabled = prev ? page <= 0 : page >= pageCount - 1;

  if (bare) {
    return (
      <IconAction label={label}>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          disabled={disabled}
          onClick={() => onPageChange(prev ? page - 1 : page + 1)}
          className="size-8 shrink-0"
        >
          {prev ? <ChevronLeft className="size-4.5" /> : <ChevronRight className="size-4.5" />}
        </Button>
      </IconAction>
    );
  }

  return (
    <IconAction label={label}>
      <Button
        variant="outline"
        size="icon"
        aria-label={label}
        disabled={disabled}
        className={cn("bg-field-tinted", className)}
        onClick={() => onPageChange(prev ? page - 1 : page + 1)}
      >
        {prev ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
      </Button>
    </IconAction>
  );
}
