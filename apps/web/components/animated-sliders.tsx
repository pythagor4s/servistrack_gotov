"use client";

import { m } from "motion/react";

import { STROKE } from "@/components/icons";

const KNOB =
  "M-3 0C-3 -0.93 -3 -1.4 -2.85 -1.77C-2.64 -2.26 -2.26 -2.64 -1.77 -2.85C-1.4 -3 -0.93 -3 0 -3C0.93 -3 1.4 -3 1.77 -2.85C2.26 -2.64 2.64 -2.26 2.85 -1.77C3 -1.4 3 -0.93 3 0C3 0.93 3 1.4 2.85 1.77C2.64 2.26 2.26 2.64 1.77 2.85C1.4 3 0.93 3 0 3C-0.93 3 -1.4 3 -1.77 2.85C-2.26 2.64 -2.64 2.26 -2.85 1.77C-3 1.4 -3 0.93 -3 0Z";

const SHIFT = 4;
const EASE = { duration: 0.18, ease: "easeInOut" } as const;

function Row({ y, cx, gapLeft, gapRight }: { y: number; cx: number; gapLeft: number; gapRight: number }) {
  return (
    <>
      <m.line x1={3} y1={y} y2={y} initial={false} animate={{ x2: Math.max(cx - 3 - gapLeft, 3) }} transition={EASE} />
      <m.path d={KNOB} initial={false} animate={{ x: cx, y }} transition={EASE} />
      <m.line x2={21} y1={y} y2={y} initial={false} animate={{ x1: Math.min(cx + 3 + gapRight, 21) }} transition={EASE} />
    </>
  );
}

export function AnimatedSliders({ on, className }: { on: boolean; className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <Row y={7} cx={on ? 9 + SHIFT : 9} gapLeft={0} gapRight={3} />
      <Row y={17} cx={on ? 15 - SHIFT : 15} gapLeft={3} gapRight={0} />
    </svg>
  );
}
