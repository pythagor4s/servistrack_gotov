"use client";

import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { CALENDAR_DAY_END, CALENDAR_DAY_START, CALENDAR_STEP } from "@servis-track/shared";

import type { CalendarItem } from "@/components/calendar/task-chip";

export type DragMode = "move" | "resize";

export type DragPreview = {
  taskId: string;
  fromDate: string;
  date: string;
  startMinute: number | null;
  endMinute: number | null;
};

export type DrawPreview = { date: string; startMinute: number; endMinute: number };

export type DrawStart = (e: ReactPointerEvent<HTMLElement>, date: string) => void;

type DragState = {
  item: CalendarItem;
  mode: DragMode;
  x: number;
  y: number;
  started: boolean;
  grab: number;
};

const THRESHOLD = 4;

const snap = (m: number) => Math.round(m / CALENDAR_STEP) * CALENDAR_STEP;
const snapDown = (m: number) => Math.floor(m / CALENDAR_STEP) * CALENDAR_STEP;
const snapUp = (m: number) => Math.ceil(m / CALENDAR_STEP) * CALENDAR_STEP;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function minuteAt(el: HTMLElement, y: number): number {
  const r = el.getBoundingClientRect();
  const start = Number(el.dataset.calStart ?? CALENDAR_DAY_START);
  const end = Number(el.dataset.calEnd ?? CALENDAR_DAY_END);
  return start + ((y - r.top) / (r.height || 1)) * (end - start);
}

function targetAt(x: number, y: number): HTMLElement | null {
  for (const el of document.elementsFromPoint(x, y)) {
    const hit = (el as HTMLElement).closest<HTMLElement>("[data-cal-day]");
    if (hit) return hit;
  }
  return null;
}

const samePreview = (a: DragPreview | null, b: DragPreview | null) =>
  !!a &&
  !!b &&
  a.taskId === b.taskId &&
  a.fromDate === b.fromDate &&
  a.date === b.date &&
  a.startMinute === b.startMinute &&
  a.endMinute === b.endMinute;

const sameDraw = (a: DrawPreview | null, b: DrawPreview | null) =>
  !!a && !!b && a.date === b.date && a.startMinute === b.startMinute && a.endMinute === b.endMinute;

export function useCalendarDrag(
  onDrop: (preview: DragPreview, item: CalendarItem) => Promise<unknown>,
  onDraw?: (range: DrawPreview) => void,
) {
  const [preview, setPreviewState] = useState<DragPreview | null>(null);
  const previewRef = useRef<DragPreview | null>(null);
  const [drawing, setDrawingState] = useState<DrawPreview | null>(null);
  const drawingRef = useRef<DrawPreview | null>(null);
  const state = useRef<DragState | null>(null);
  const suppressClick = useRef(false);
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;
  const onDrawRef = useRef(onDraw);
  onDrawRef.current = onDraw;

  const setPreview = (next: DragPreview | null) => {
    if (next === previewRef.current || samePreview(next, previewRef.current)) return;
    previewRef.current = next;
    setPreviewState(next);
  };

  const setDrawing = (next: DrawPreview | null) => {
    if (next === drawingRef.current || sameDraw(next, drawingRef.current)) return;
    drawingRef.current = next;
    setDrawingState(next);
  };

  const swallowNextClick = () => {
    suppressClick.current = true;
    setTimeout(() => {
      suppressClick.current = false;
    }, 0);
  };

  const compute = (x: number, y: number): DragPreview | null => {
    const s = state.current;
    if (!s) return null;
    const { task, occurrence } = s.item;
    const target = targetAt(x, y);
    if (!target) return null;
    const date = target.dataset.calDay!;
    const kind = target.dataset.calKind;
    const base = { taskId: task.id, fromDate: occurrence.date };
    const timed = task.startMinute !== null && task.endMinute !== null;

    if (s.mode === "resize") {
      if (kind !== "time" || date !== occurrence.date || !timed) return null;
      const end = clamp(snap(minuteAt(target, y)), task.startMinute! + CALENDAR_STEP, CALENDAR_DAY_END);
      return { ...base, date, startMinute: task.startMinute, endMinute: end };
    }
    if (kind === "month") return { ...base, date, startMinute: task.startMinute, endMinute: task.endMinute };
    if (kind === "allday") return { ...base, date, startMinute: null, endMinute: null };
    if (kind !== "time") return null;
    const duration = timed ? task.endMinute! - task.startMinute! : 60;
    const start = clamp(
      snap(minuteAt(target, y) - s.grab),
      CALENDAR_DAY_START,
      CALENDAR_DAY_END - duration,
    );
    return { ...base, date, startMinute: start, endMinute: start + duration };
  };

  const begin = useCallback(
    (e: ReactPointerEvent<HTMLElement>, item: CalendarItem, mode: DragMode = "move") => {
      if (e.button !== 0 || e.pointerType === "touch") return;
      e.stopPropagation();
      let grab = 0;
      const column = e.currentTarget.closest<HTMLElement>('[data-cal-kind="time"]');
      if (column && mode === "move" && item.task.startMinute !== null) {
        grab = minuteAt(column, e.clientY) - item.task.startMinute;
      }
      state.current = { item, mode, x: e.clientX, y: e.clientY, started: false, grab };

      const cleanup = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("keydown", key);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
      const move = (ev: PointerEvent) => {
        const s = state.current;
        if (!s) return;
        if (!s.started) {
          if (Math.hypot(ev.clientX - s.x, ev.clientY - s.y) < THRESHOLD) return;
          s.started = true;
          document.body.style.cursor = s.mode === "resize" ? "ns-resize" : "grabbing";
          document.body.style.userSelect = "none";
        }
        const next = compute(ev.clientX, ev.clientY);
        if (next) setPreview(next);
      };
      const up = () => {
        cleanup();
        const s = state.current;
        state.current = null;
        if (!s?.started) return;
        swallowNextClick();
        const p = previewRef.current;
        const { task, occurrence } = s.item;
        if (
          !p ||
          (p.date === occurrence.date && p.startMinute === task.startMinute && p.endMinute === task.endMinute)
        ) {
          setPreview(null);
          return;
        }
        void onDropRef.current(p, s.item).finally(() => setPreview(null));
      };
      const key = (ev: KeyboardEvent) => {
        if (ev.key !== "Escape") return;
        cleanup();
        state.current = null;
        setPreview(null);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("keydown", key);
    },
    [],
  );

  const beginDraw = useCallback<DrawStart>(
    (e, date) => {
      if (e.button !== 0 || e.pointerType === "touch" || !onDrawRef.current) return;
      const column = e.currentTarget.closest<HTMLElement>('[data-cal-kind="time"]');
      if (!column) return;
      const anchor = clamp(
        snapDown(minuteAt(column, e.clientY)),
        CALENDAR_DAY_START,
        CALENDAR_DAY_END - CALENDAR_STEP,
      );
      const x0 = e.clientX;
      const y0 = e.clientY;
      let started = false;
      let cancelled = false;

      const stopListening = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("keydown", key);
      };
      const cleanup = () => {
        stopListening();
        window.removeEventListener("pointerup", up);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
      const move = (ev: PointerEvent) => {
        if (!started) {
          if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < THRESHOLD) return;
          started = true;
          document.body.style.cursor = "cell";
          document.body.style.userSelect = "none";
        }
        const m = minuteAt(column, ev.clientY);
        const range =
          m < anchor
            ? { startMinute: clamp(snapDown(m), CALENDAR_DAY_START, anchor), endMinute: anchor + CALENDAR_STEP }
            : {
                startMinute: anchor,
                endMinute: clamp(snapUp(m), anchor + CALENDAR_STEP, CALENDAR_DAY_END),
              };
        setDrawing({ date, ...range });
      };
      const up = () => {
        cleanup();
        if (!started && !cancelled) return;
        swallowNextClick();
        const drawn = drawingRef.current;
        setDrawing(null);
        if (!cancelled && drawn) onDrawRef.current?.(drawn);
      };
      const key = (ev: KeyboardEvent) => {
        if (ev.key !== "Escape") return;
        cancelled = true;
        stopListening();
        document.body.style.cursor = "";
        setDrawing(null);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("keydown", key);
    },
    [],
  );

  const isClickSuppressed = () => suppressClick.current;

  return { preview, begin, drawing, beginDraw, isClickSuppressed };
}
