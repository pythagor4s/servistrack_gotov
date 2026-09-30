"use client";

import * as React from "react";
import { Check, ChevronDown, Search, type IconComponent } from "@/components/icons";

import { cn } from "@/lib/utils";
import {
  onTintCursorLeave,
  onTintCursorMovePlate,
} from "@/components/hover-tint";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  POPOVER_LABEL,
  POPOVER_LIST,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

export type ComboboxOption = {
  value: string;
  label: string;
  icon?: IconComponent;
  className?: string;
  keywords?: string;
  group?: string;
  swatchClassName?: string;
};

function Swatch({ className }: { className: string }) {
  return (
    <span className="flex size-4 shrink-0 items-center justify-center" aria-hidden="true">
      <span className={cn("size-2.5 rounded-full", className)} />
    </span>
  );
}

export const INLINE_TRIGGER =
  "-ml-2 h-8 w-auto max-w-[calc(100%+0.5rem)] self-start justify-start gap-2 px-2 font-normal shadow-none";

export function Combobox({
  value,
  onChange,
  options,
  placeholder = "Izberite…",
  className,
  listClassName,
  disabled,
  icon,
  searchable = false,
  searchPlaceholder = "Iskanje…",
  variant = "field",
  emptyValue,
}: {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  className?: string;
  listClassName?: string;
  disabled?: boolean;
  icon?: IconComponent;
  searchable?: boolean;
  searchPlaceholder?: string;
  variant?: "field" | "inline";
  emptyValue?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const selected = options.find((o) => o.value === value);
  const SelectedIcon = selected?.icon ?? icon;

  React.useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const detachWheel = React.useRef<(() => void) | null>(null);
  const listRef = React.useCallback((el: HTMLDivElement | null) => {
    detachWheel.current?.();
    detachWheel.current = null;
    if (!el) return;

    let target = el.scrollTop;
    let current = el.scrollTop;
    let frame = 0;
    const maxScroll = () => Math.max(0, el.scrollHeight - el.clientHeight);

    const step = () => {
      const diff = target - current;
      if (Math.abs(diff) < 0.5) {
        current = target;
        el.scrollTop = target;
        frame = 0;
        return;
      }
      current += diff * 0.18;
      el.scrollTop = current;
      frame = requestAnimationFrame(step);
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        el.scrollTop = Math.min(maxScroll(), Math.max(0, el.scrollTop + e.deltaY));
        return;
      }
      if (!frame) {
        current = el.scrollTop;
        target = current;
      }
      target = Math.min(maxScroll(), Math.max(0, target + e.deltaY));
      if (!frame) frame = requestAnimationFrame(step);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    detachWheel.current = () => {
      if (frame) cancelAnimationFrame(frame);
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  const q = query.trim().toLowerCase();
  const shown =
    searchable && q
      ? options.filter((o) => `${o.label} ${o.keywords ?? ""}`.toLowerCase().includes(q))
      : options;

  const groups = React.useMemo(() => {
    const byGroup = new Map<string, ComboboxOption[]>();
    for (const o of shown) {
      const key = o.group ?? "";
      const bucket = byGroup.get(key);
      if (bucket) bucket.push(o);
      else byGroup.set(key, [o]);
    }
    return [...byGroup.entries()];
  }, [shown]);

  const inline = variant === "inline";
  const empty = emptyValue !== undefined && value === emptyValue;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={inline ? "ghost" : "outline"}
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          data-tint=""
          onPointerMove={onTintCursorMovePlate}
          onPointerLeave={onTintCursorLeave}
          className={cn(inline ? INLINE_TRIGGER : "justify-between bg-field-tinted font-normal", className)}
        >
          <span
            className={cn(
              "flex min-w-0 items-center gap-2",
              selected?.className,
              empty && "text-muted-foreground",
            )}
          >
            {selected?.swatchClassName ? (
              <Swatch className={selected.swatchClassName} />
            ) : (
              SelectedIcon && <SelectedIcon className="size-4 shrink-0" />
            )}
            <span className="truncate">
              {selected ? selected.label : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </span>
          </span>
          {!inline && (
            <ChevronDown
              className={cn(
                "size-4 shrink-0 opacity-50 transition-transform duration-200 ease-out motion-reduce:transition-none",
                open && "rotate-180",
              )}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn(
          "p-1",
          inline ? "w-max min-w-44 max-w-64" : "w-[var(--radix-popover-trigger-width)] min-w-52",
        )}
      >
        {searchable && (
          <div className="mb-1 flex items-center gap-2 border-b px-2 pb-1">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-sm"
            />
          </div>
        )}
        <div ref={listRef} className={cn("max-h-72 overflow-y-auto", listClassName)}>
          {shown.length === 0 ? (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              Ni zadetkov.
            </div>
          ) : (
            groups.map(([group, items], gi) => (
              <div key={group || "_"}>
                {group && gi > 0 && (
                  <div className="mx-2 my-1">
                    <Separator />
                  </div>
                )}
                {group && <div className={POPOVER_LABEL}>{group}</div>}
                <div className={POPOVER_LIST}>
                {items.map((o) => {
                  const Icon = o.icon;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => {
                        onChange(o.value);
                        setOpen(false);
                      }}
                      data-tint=""
                      onPointerMove={onTintCursorMovePlate}
                      onPointerLeave={onTintCursorLeave}
                      aria-current={o.value === value ? "true" : undefined}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:text-accent-foreground",
                        group && "pl-4",
                      )}
                    >
                      {o.swatchClassName ? (
                        <Swatch className={o.swatchClassName} />
                      ) : (
                        Icon && <Icon className={cn("size-4 shrink-0", o.className)} />
                      )}
                      <span className={cn("flex-1 truncate", o.className)}>{o.label}</span>
                      {o.value === value && <Check className="size-4 shrink-0" />}
                    </button>
                  );
                })}
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
