"use client";

import type { Variants } from "motion/react";
import { m, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

const BOB: Variants = {
  initial: { y: 0 },
  animate: {
    y: [0, 1, 0],
    transition: { duration: 2, ease: "easeOut", repeat: Infinity, repeatType: "loop" },
  },
};

const FACE: Variants = {
  initial: { x: 0, y: 0 },
  animate: {
    x: [0, 0, 0, 1, -1, 1, 0, 0, 0],
    y: [0, 1.5, 0],
    transition: { duration: 2, ease: "easeOut", repeat: Infinity, repeatType: "loop" },
  },
};

export function AnimatedFrown({ className }: { className?: string }) {
  const reduced = useReducedMotion();
  const animate = reduced ? "initial" : "animate";

  return (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-7 overflow-visible", className)}
    >
      <m.circle cx="12" cy="12" r="10" variants={BOB} initial="initial" animate={animate} />
      <m.g variants={FACE} initial="initial" animate={animate}>
        <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
        <line x1="9" x2="9.01" y1="9" y2="9" />
        <line x1="15" x2="15.01" y1="9" y2="9" />
      </m.g>
    </svg>
  );
}
