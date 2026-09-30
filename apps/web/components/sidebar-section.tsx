"use client";

import { useEffect, useId, useState, type ReactNode } from "react";

import { ChevronDown } from "@/components/icons";
import { cn } from "@/lib/utils";
import { POPOVER_LABEL } from "@/components/ui/popover";

const storageKey = (id: string) => `servis-track:sidebar:${id}`;

export function SidebarSection({
  label,
  action,
  collapsibleId,
  labelClassName,
  children,
}: {
  label: string;
  action?: ReactNode;
  collapsibleId?: string;
  labelClassName?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const [animated, setAnimated] = useState(false);
  const contentId = useId();

  useEffect(() => {
    if (!collapsibleId) return;
    try {
      setOpen(window.localStorage.getItem(storageKey(collapsibleId)) !== "closed");
    } catch {
    }
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setAnimated(true));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [collapsibleId]);

  const toggle = () => {
    if (!collapsibleId) return;
    const next = !open;
    setOpen(next);
    try {
      window.localStorage.setItem(storageKey(collapsibleId), next ? "open" : "closed");
    } catch {
    }
  };

  const labelClass = cn(POPOVER_LABEL, "px-3 text-xs font-bold tracking-wider text-foreground-faint", labelClassName);

  if (!collapsibleId) {
    return (
      <section>
        <div className="flex items-center justify-between gap-2">
          <h2 className={labelClass}>{label}</h2>
          {action}
        </div>
        {children}
      </section>
    );
  }

  return (
    <section>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={toggle}
        className="group/head flex w-full items-center justify-between gap-2 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <h2 className={cn(labelClass, "transition-colors group-hover/head:text-foreground")}>{label}</h2>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "mr-2 size-4 shrink-0 text-foreground-faint group-hover/head:text-foreground motion-reduce:transition-none",
            animated && "transition-[rotate,color] duration-200 ease-out",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        id={contentId}
        inert={!open}
        className={cn(
          "grid motion-reduce:transition-none",
          animated && "transition-[grid-template-rows] duration-200 ease-out",
        )}
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div
          className={cn(
            "min-h-0 overflow-hidden motion-reduce:transition-none",
            animated && "transition-opacity duration-200 ease-out",
            open ? "opacity-100" : "opacity-0",
          )}
        >
          {children}
        </div>
      </div>
    </section>
  );
}
