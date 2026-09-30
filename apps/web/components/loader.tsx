import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

const SPOKES = [
  "M12 2v4",
  "m16.2 7.8 2.9-2.9",
  "M18 12h4",
  "m16.2 16.2 2.9 2.9",
  "M12 18v4",
  "m4.9 19.1 2.9-2.9",
  "M2 12h4",
  "m4.9 4.9 2.9 2.9",
];

const SPOKE_STEP_MS = 200;

export function Loader({
  className,
  label = "Nalaganje…",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      focusable="false"
      className={cn("size-6 shrink-0 select-none opacity-60", className)}
    >
      <g className="origin-center animate-loader-spin [transform-box:view-box]">
        {SPOKES.map((d, i) => (
          <path
            key={d}
            d={d}
            className="animate-loader-spoke"
            style={{ animationDelay: `${(i - SPOKES.length) * SPOKE_STEP_MS}ms` } as CSSProperties}
          />
        ))}
      </g>
    </svg>
  );
}
