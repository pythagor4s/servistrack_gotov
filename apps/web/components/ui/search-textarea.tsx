"use client";

import * as React from "react";

import type { IconComponent } from "@/components/icons";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function SearchTextarea({
  icon: Icon,
  trailing,
  shortcut = true,
  className,
  ref,
  ...props
}: React.ComponentProps<typeof Textarea> & {
  icon: IconComponent;
  trailing?: React.ReactNode;
  shortcut?: boolean;
}) {
  const hasText = String(props.value ?? "").length > 0;
  const trailingRef = React.useRef<HTMLDivElement>(null);
  const [trailingWidth, setTrailingWidth] = React.useState(0);
  React.useEffect(() => {
    const el = trailingRef.current;
    if (!el) {
      setTrailingWidth(0);
      return;
    }
    const measure = () => setTrailingWidth(el.offsetWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [trailing]);

  const inputRef = React.useRef<HTMLTextAreaElement | null>(null);
  const setRefs = (el: HTMLTextAreaElement | null) => {
    inputRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  };
  React.useEffect(() => {
    if (!shortcut) return;
    const isEditable = (t: EventTarget | null) =>
      t instanceof HTMLElement &&
      (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "f" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.repeat || isEditable(e.target)) return;
      const el = inputRef.current;
      if (!el || el.offsetParent === null) return;
      e.preventDefault();
      el.focus();
      el.select();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcut]);

  return (
    <div
      className={cn("relative", className)}
      style={trailingWidth ? ({ "--search-trailing": `${trailingWidth + 8}px` } as React.CSSProperties) : undefined}
    >
      <Icon
        className={cn(
          "pointer-events-none absolute top-2.5 left-3 z-10 size-4 transition-colors",
          hasText ? "text-primary" : "text-muted-foreground",
        )}
      />
      <Textarea
        {...props}
        ref={setRefs}
        rows={1}
        onKeyDown={(e) => {
          if (shortcut && e.key === "Escape") e.currentTarget.blur();
          props.onKeyDown?.(e);
        }}
        className={cn(
          "max-h-[calc(8lh+1rem)] min-h-9 resize-none bg-field-tinted py-[7px] pl-9 leading-5",
          trailing && "lg:pr-[var(--search-trailing,3rem)]",
        )}
      />
      {shortcut && !hasText && (
        <KbdGroup
          className={cn(
            "pointer-events-none absolute top-2 hidden lg:inline-flex",
            trailing ? "right-[var(--search-trailing,3rem)]" : "right-2",
          )}
        >
          <Kbd>F</Kbd>
        </KbdGroup>
      )}
      {trailing && (
        <div
          ref={trailingRef}
          className="absolute top-0 right-0 hidden h-9 items-center gap-1 pr-1 before:mr-1 before:h-3.5 before:w-px before:bg-border lg:flex"
        >
          {trailing}
        </div>
      )}
    </div>
  );
}
