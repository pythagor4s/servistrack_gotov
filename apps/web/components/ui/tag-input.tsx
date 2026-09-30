"use client";

import { useState, type KeyboardEvent } from "react";
import { KB_TAG_MAX, KB_TAGS_MAX } from "@servis-track/shared";

import { X } from "@/components/icons";
import { cn } from "@/lib/utils";

export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = "Dodaj oznako…",
  className,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState("");
  const full = value.length >= KB_TAGS_MAX;

  function add(raw: string) {
    const tag = raw.trim().toLowerCase().slice(0, KB_TAG_MAX);
    if (!tag || value.includes(tag) || full) return;
    onChange([...value, tag]);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === "," || (e.key === "Tab" && draft.trim())) && draft.trim()) {
      e.preventDefault();
      add(draft);
      setDraft("");
    } else if (e.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  const needle = draft.trim().toLowerCase();
  const matching = needle
    ? suggestions.filter((s) => s.startsWith(needle) && !value.includes(s)).slice(0, 6)
    : [];

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <div className="flex min-h-8 flex-wrap items-center gap-1.5">
        {value.map((t) => (
          <span
            key={t}
            className="inline-flex h-6 max-w-full items-center gap-1 rounded-full border bg-field-tinted pr-1 pl-2 text-xs"
          >
            <span className="text-nav-foreground">#</span>
            <span className="truncate">{t}</span>
            <button
              type="button"
              aria-label={`Odstrani oznako ${t}`}
              onClick={() => onChange(value.filter((x) => x !== t))}
              className="flex size-4 items-center justify-center rounded-full text-nav-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        {!full && (
          <input
            aria-label="Nova oznaka"
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(",", ""))}
            onKeyDown={onKeyDown}
            onBlur={() => {
              if (draft.trim()) {
                add(draft);
                setDraft("");
              }
            }}
            placeholder={value.length === 0 ? placeholder : "Še ena…"}
            maxLength={KB_TAG_MAX}
            className="h-7 min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        )}
      </div>
      {matching.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {matching.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                add(s);
                setDraft("");
              }}
              className="inline-flex h-6 items-center rounded-full border border-dashed px-2 text-xs text-nav-foreground transition-colors hover:border-border-row-hover hover:text-foreground"
            >
              #{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
