"use client";

import type { ReactNode } from "react";
import type { Variants } from "motion/react";
import { m, useReducedMotion } from "motion/react";

import type { TicketStatus } from "@servis-track/shared";
import { useDeferred } from "@/lib/use-deferred";
import { cn } from "@/lib/utils";

const HOVER_DELAY = 0.6;

const CENTRE_12 = { transformBox: "view-box", originX: "12px", originY: "12px" } as const;

export type StatusIconProps = { className?: string; animate?: boolean };

function StatusIcon({
  className,
  animate,
  clip,
  strokeWidth = 2,
  children,
}: StatusIconProps & { clip?: boolean; strokeWidth?: number; children: ReactNode }) {
  const reduced = useReducedMotion();
  const on = useDeferred(animate, HOVER_DELAY * 1000);
  return (
    <m.svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      overflow={clip ? "hidden" : "visible"}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      initial="initial"
      animate={on && !reduced ? "animate" : "initial"}
    >
      {children}
    </m.svg>
  );
}

const PULSE: Variants = {
  initial: { scale: 1 },
  animate: { scale: [1, 1.15, 1], transition: { duration: 0.4, ease: "easeInOut" } },
};

function AnimatedCircleIcon({ className, animate }: StatusIconProps) {
  return (
    <StatusIcon className={className} animate={animate}>
      <m.circle cx="12" cy="12" r="10" variants={PULSE} style={CENTRE_12} />
    </StatusIcon>
  );
}

const CENTRE_TIMER = { transformBox: "view-box", originX: "12px", originY: "14px" } as const;

const SWEEP = { duration: 0.7, ease: "easeOut" } as const;

const HAND_SWEEP: Variants = {
  initial: { rotate: 0 },
  animate: { rotate: [-360, 0], transition: SWEEP },
};

const DIAL_DRAW: Variants = {
  initial: { rotate: 0, pathLength: 1, pathOffset: 0 },
  animate: {
    rotate: [360, 0],
    pathLength: [0, 1],
    pathOffset: [2, 0],
    transition: SWEEP,
  },
};

function AnimatedTimerIcon({ className, animate }: StatusIconProps) {
  return (
    <StatusIcon
      className={cn(className, "size-[1.1875rem] -translate-y-px")}
      animate={animate}
      strokeWidth={2 * (16 / 19)}
    >
      <line x1="10" x2="14" y1="2" y2="2" />
      <m.g variants={HAND_SWEEP} style={CENTRE_TIMER}>
        <line x1="12" x2="15" y1="14" y2="11" />
        <m.circle
          cx="12"
          cy="14"
          r="8"
          pathLength={1}
          variants={DIAL_DRAW}
          style={CENTRE_TIMER}
        />
      </m.g>
    </StatusIcon>
  );
}

const BODY_ROCK: Variants = {
  initial: { x: 0 },
  animate: {
    x: [0, -1, 1, 0],
    transition: { duration: 0.8, ease: "linear", repeat: Infinity, repeatType: "loop" },
  },
};

const BODY_BOB: Variants = {
  initial: { y: 0 },
  animate: {
    y: [0, -0.6, 0],
    transition: { duration: 0.2, ease: "easeOut", repeat: Infinity, repeatType: "loop" },
  },
};

const SPEED_LINE: Variants = {
  initial: { x: 0, opacity: 0 },
  animate: {
    x: [0, -40],
    opacity: [1, 0],
    transition: { duration: 0.3, ease: "easeOut", repeat: Infinity, repeatType: "loop" },
  },
};

const TRUCK_256 =
  "M255.14,115.54l-14-35A19.89,19.89,0,0,0,222.58,68H196V64a12,12,0,0,0-12-12H32A20,20,0,0,0,12,72V184a20,20,0,0,0,20,20H46.06a36,36,0,0,0,67.88,0h44.12a36,36,0,0,0,67.88,0H236a20,20,0,0,0,20-20V120A21.7,21.7,0,0,0,255.14,115.54ZM196,92h23.88l6.4,16H196ZM80,204a12,12,0,1,1,12-12A12,12,0,0,1,80,204Zm92-41.92A36.32,36.32,0,0,0,158.06,180H113.94a36,36,0,0,0-67.88,0H36V140H172ZM172,116H36V76H172Zm20,88a12,12,0,1,1,12-12A12,12,0,0,1,192,204Zm40-24h-6.06A36.09,36.09,0,0,0,196,156.23V132h36Z";
const TRUCK_SCALE = "translate(0.5 0) scale(0.086)";

function AnimatedTruckIcon({ className, animate }: StatusIconProps) {
  return (
    <StatusIcon className={cn(className, "translate-y-[1.5px]")} animate={animate} clip>
      <m.g variants={BODY_ROCK}>
        <m.g variants={BODY_BOB}>
          <path d={TRUCK_256} transform={TRUCK_SCALE} fill="currentColor" stroke="none" />
        </m.g>
      </m.g>
      <m.path d="M24 22h7" variants={SPEED_LINE} />
    </StatusIcon>
  );
}

export function StaticTruckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={TRUCK_256} transform={TRUCK_SCALE} fill="currentColor" stroke="none" />
    </svg>
  );
}

const RING_DRAW: Variants = {
  initial: { pathLength: 1, pathOffset: 0 },
  animate: {
    pathLength: [0, 1],
    pathOffset: [2, 0],
    transition: { duration: 0.4, ease: "easeIn" },
  },
};

const TICK_DRAW: Variants = {
  initial: { opacity: 1, pathLength: 1 },
  animate: {
    opacity: [0, 1],
    pathLength: [0, 1],
    transition: { duration: 0.15, ease: "easeOut", delay: 0.5 },
  },
};

export function AnimatedCircleCheckIcon({ className, animate }: StatusIconProps) {
  return (
    <StatusIcon className={className} animate={animate}>
      <m.circle cx="12" cy="12" r="10" pathLength={1} variants={RING_DRAW} />
      <m.path d="m9 12 2 2 4-4" pathLength={1} variants={TICK_DRAW} />
    </StatusIcon>
  );
}

export const ANIMATED_STATUS_ICON: Record<
  TicketStatus,
  (props: StatusIconProps) => ReactNode
> = {
  OPEN: AnimatedCircleIcon,
  IN_PROGRESS: AnimatedTimerIcon,
  SERVICER_COMING: AnimatedTruckIcon,
  RESOLVED: AnimatedCircleCheckIcon,
};
