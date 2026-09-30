"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export function FadeText({
  lines = 1,
  className,
  style,
  children,
}: {
  lines?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [over, setOver] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () =>
      setOver(lines === 1 ? el.scrollWidth > el.clientWidth + 1 : el.scrollHeight > el.clientHeight + 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  });

  const title = over && typeof children === "string" ? children : undefined;

  if (lines === 1) {
    return (
      <span
        ref={ref}
        title={title}
        style={style}
        className={cn(
          "block min-w-0 overflow-hidden whitespace-nowrap",
          over && "mask-r-from-[calc(100%-2rem)]",
          className,
        )}
      >
        {children}
      </span>
    );
  }
  return (
    <span
      ref={ref}
      title={title}
      style={{ ...style, maxHeight: `${lines}lh`, ["--fade-lines" as string]: lines }}
      className={cn("block min-w-0 overflow-hidden", over && "fade-last-line", className)}
    >
      {children}
    </span>
  );
}
