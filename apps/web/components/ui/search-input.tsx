import * as React from "react";
import { Search } from "@/components/icons";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Kbd, KbdGroup } from "@/components/ui/kbd";

export function SearchInput({
  className,
  trailing,
  shortcut = true,
  ref,
  placeholder = "Išči",
  ...props
}: React.ComponentProps<typeof Input> & {
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

  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const setRefs = (el: HTMLInputElement | null) => {
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
      style={
        trailingWidth
          ? ({ "--search-trailing": `${trailingWidth + 8}px` } as React.CSSProperties)
          : undefined
      }
    >
      <Search
        className={cn(
          "pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 transition-colors",
          hasText ? "text-primary" : "text-muted-foreground",
        )}
      />
      <Input
        {...props}
        ref={setRefs}
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (shortcut && e.key === "Escape") e.currentTarget.blur();
          props.onKeyDown?.(e);
        }}
        className={cn("w-full bg-field-tinted pl-9", trailing && "lg:pr-[var(--search-trailing,3rem)]")}
      />
      {shortcut && !hasText && (
        <KbdGroup
          className={cn(
            "pointer-events-none absolute top-1/2 hidden -translate-y-1/2 lg:inline-flex",
            trailing ? "right-[var(--search-trailing,3rem)]" : "right-2",
          )}
        >
          <Kbd>F</Kbd>
        </KbdGroup>
      )}
      {trailing && (
        <div
          ref={trailingRef}
          className="absolute inset-y-0 right-0 hidden cursor-default items-center gap-1 pr-1 lg:flex"
        >
          <span aria-hidden className="mr-0.5 h-3.5 w-px bg-border" />
          {trailing}
        </div>
      )}
    </div>
  );
}
