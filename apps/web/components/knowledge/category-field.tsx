"use client";

import { useEffect, useRef, useState } from "react";

import { Shapes, Sparkles } from "@/components/icons";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { NONE } from "@/components/scope-picker";
import { apiPost } from "@/lib/api";
import { FAULT_ICON } from "@/lib/fault-categories";
import type { FaultCategory, KbDiagnoseResponse } from "@/lib/types";

export function useCategorySuggestion(text: string): string | null {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    const t = text.trim();
    if (t.length < 12) {
      setId(null);
      return;
    }
    let stale = false;
    const timer = window.setTimeout(() => {
      apiPost<KbDiagnoseResponse>("/knowledge/diagnose", { description: t.slice(0, 2000) })
        .then((r) => {
          if (!stale) setId(r.categories[0]?.id ?? null);
        })
        .catch(() => {});
    }, 700);
    return () => {
      stale = true;
      window.clearTimeout(timer);
    };
  }, [text]);
  return id;
}

export function CategoryField({
  value,
  onChange,
  categories,
  suggestFrom,
}: {
  value: string;
  onChange: (value: string) => void;
  categories: FaultCategory[];
  suggestFrom: string;
}) {
  const suggestion = useCategorySuggestion(suggestFrom);
  const touched = useRef(value !== NONE);
  const [auto, setAuto] = useState(false);

  useEffect(() => {
    if (!touched.current && suggestion && suggestion !== value) {
      onChange(suggestion);
      setAuto(true);
    }
  }, [suggestion]);

  const options: ComboboxOption[] = [
    { value: NONE, label: "Brez kategorije", icon: Shapes },
    ...categories.map((c) => ({ value: c.id, label: c.name, icon: FAULT_ICON[c.icon] ?? Shapes })),
  ];
  const suggested = categories.find((c) => c.id === suggestion);

  return (
    <div className="flex min-w-0 flex-col items-start">
      <Combobox
        variant="inline"
        value={value}
        onChange={(v) => {
          touched.current = true;
          setAuto(false);
          onChange(v);
        }}
        options={options}
        emptyValue={NONE}
        searchable
        searchPlaceholder="Iskanje kategorij…"
      />
      {auto && value === suggestion && (
        <span className="flex items-center gap-1 pb-1 text-xs text-nav-foreground">
          <Sparkles className="size-3.5" /> Predlagal iskalnik iz podobnih zapisov
        </span>
      )}
      {suggested && suggestion !== value && (
        <button
          type="button"
          onClick={() => {
            touched.current = true;
            setAuto(false);
            onChange(suggested.id);
          }}
          className="flex items-center gap-1 pb-1 text-xs text-nav-foreground transition-colors hover:text-foreground"
        >
          <Sparkles className="size-3.5" /> Predlog: <span className="font-medium">{suggested.name}</span>
        </button>
      )}
    </div>
  );
}
