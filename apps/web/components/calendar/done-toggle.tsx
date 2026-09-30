"use client";

import { useEffect, useRef, useState } from "react";
import type { Variants } from "motion/react";
import { m, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";
import {
  onTintCursorLeave,
  onTintCursorMovePlate,
  TINT_SHAPE_FIELD,
} from "@/components/hover-tint";

const CIRCLE: Variants = {
  on: { pathLength: 1, pathOffset: 0 },
  off: { pathLength: 1, pathOffset: 0 },
  draw: {
    pathLength: [0, 1],
    pathOffset: [2, 0],
    transition: { duration: 0.4, ease: "easeIn" },
  },
};

const CHECK: Variants = {
  on: { opacity: 1, pathLength: 1, pathOffset: 0 },
  off: { opacity: 0, pathLength: 0, pathOffset: 0, transition: { duration: 0.2, ease: "easeOut" } },
  draw: {
    opacity: [0, 1],
    pathLength: [0, 1],
    transition: { duration: 0.3, ease: "easeOut", delay: 0.5 },
  },
};

type CheckState = "on" | "off" | "draw";

export function AnimatedCircleCheck({ checked, className }: { checked: boolean; className?: string }) {
  const reduced = useReducedMotion();
  const [state, setState] = useState<CheckState>(checked ? "on" : "off");
  const previous = useRef(checked);

  useEffect(() => {
    if (previous.current === checked) return;
    previous.current = checked;
    setState(checked ? (reduced ? "on" : "draw") : "off");
  }, [checked, reduced]);

  return (
    <m.svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      initial={false}
      animate={state}
    >
      <m.circle cx="12" cy="12" r="10" pathLength={1} variants={CIRCLE} />
      <m.path d="m9 12 2 2 4-4" pathLength={1} variants={CHECK} />
    </m.svg>
  );
}

export function DoneToggle({
  done,
  description,
  onToggle,
}: {
  done: boolean;
  description?: string;
  onToggle: (done: boolean) => Promise<unknown>;
}) {
  const [pending, setPending] = useState<boolean | null>(null);
  const checked = pending ?? done;

  return (
    <button
      type="button"
      aria-pressed={checked}
      data-tint=""
      onPointerMove={onTintCursorMovePlate}
      onPointerLeave={onTintCursorLeave}
      disabled={pending !== null}
      onClick={() => {
        const next = !checked;
        setPending(next);
        void onToggle(next).finally(() => setPending(null));
      }}
      className={cn(
        TINT_SHAPE_FIELD,
        "flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left outline-none hover:border-border-row-hover focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-100",
      )}
    >
      <AnimatedCircleCheck
        checked={checked}
        className={cn(
          "size-7 shrink-0 transition-colors",
          checked ? "text-foreground" : "text-muted-foreground",
        )}
      />
      <span className="flex min-w-0 flex-col">
        <span className="text-sm font-medium">{checked ? "Opravljeno" : "Označi kot opravljeno"}</span>
        {description && <span className="text-xs text-muted-foreground">{description}</span>}
      </span>
    </button>
  );
}
