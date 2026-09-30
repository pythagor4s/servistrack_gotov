"use client";

import type { PointerEvent } from "react";

import { cn } from "@/lib/utils";

const TINT_TRAVEL_CARD = 0.3;

const TINT_TRAVEL_PLATE = 0.4;

const TINT_REST_X_PLATE = 0.3;

const TINT_TRAVEL_ROW = 0.4;

export const TINT_CURSOR =
  "hover-tint-cursor [--hover-tint-hold:0%] [--hover-tint-mid:45%] [--hover-tint-fade:110%] [--hover-tint-x:50%] [--hover-tint-y:50%]";

export const TINT_CURSOR_CARD = "[--hover-tint-shape:circle_14.93rem]";

function makeTintCursorMove(travel: number, restX = 0.5) {
  return function onTintCursorMove(e: PointerEvent<HTMLElement>): void {
    if (e.pointerType !== "mouse") return;
    const el = e.currentTarget;
    const box = el.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;

    const nx = Math.min(Math.max((e.clientX - box.left) / box.width, 0), 1);
    const ny = Math.min(Math.max((e.clientY - box.top) / box.height, 0), 1);
    const pct = (n: number, rest: number) => `${((rest + (n - 0.5) * travel) * 100).toFixed(2)}%`;

    el.style.setProperty("--hover-tint-x", pct(nx, restX));
    el.style.setProperty("--hover-tint-y", pct(ny, 0.5));
  };
}

export const onTintCursorMove = makeTintCursorMove(TINT_TRAVEL_CARD);

export const onTintCursorMoveRow = makeTintCursorMove(TINT_TRAVEL_ROW);

export const onTintCursorMovePlate = makeTintCursorMove(
  TINT_TRAVEL_PLATE,
  TINT_REST_X_PLATE,
);

export const TINT_SHAPE_FIELD = "[--tint-shape:ellipse_150%_400%]";

export const TINT_SHAPE_AREA = "[--tint-shape:ellipse_150%_150%]";

export const onTintCursorMoveCentered = makeTintCursorMove(TINT_TRAVEL_PLATE, 0.5);

export function onTintCursorLeave(e: PointerEvent<HTMLElement>): void {
  if (e.pointerType !== "mouse") return;
  const { style } = e.currentTarget;
  style.removeProperty("--hover-tint-x");
  style.removeProperty("--hover-tint-y");
}

export function HoverTint({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("hover-tint pointer-events-none absolute -z-10", className)}
    />
  );
}

export const plateTintProps = () => ({
  "data-tint": "",
  onPointerMove: onTintCursorMovePlate,
  onPointerLeave: onTintCursorLeave,
});
