"use client";

import { useRef, useState } from "react";
import { Bold, Italic, List, Code, Link2 } from "@/components/icons";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { IconAction } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/ui/markdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Mark = {
  icon: typeof Bold;
  label: string;
  wrap?: [string, string];
  linePrefix?: string;
  placeholder: string;
};

const MARKS: Mark[] = [
  { icon: Bold, label: "Krepko", wrap: ["**", "**"], placeholder: "krepko besedilo" },
  { icon: Italic, label: "Ležeče", wrap: ["*", "*"], placeholder: "ležeče besedilo" },
  { icon: List, label: "Seznam", linePrefix: "- ", placeholder: "postavka" },
  { icon: Code, label: "Koda", wrap: ["`", "`"], placeholder: "koda" },
  { icon: Link2, label: "Povezava", wrap: ["[", "](https://)"], placeholder: "oznaka" },
];

export function MarkdownEditor({
  id,
  value,
  onChange,
  placeholder,
  maxLength,
  invalid,
  rows = 8,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  invalid?: boolean;
  rows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState("write");

  function apply(mark: Mark) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);
    const body = selected || mark.placeholder;

    let inserted: string;
    let selectFrom: number;
    let selectTo: number;

    if (mark.linePrefix) {
      inserted = body
        .split("\n")
        .map((line) => `${mark.linePrefix}${line}`)
        .join("\n");
      selectFrom = start + mark.linePrefix.length;
      selectTo = start + inserted.length;
    } else {
      const [open, close] = mark.wrap!;
      inserted = `${open}${body}${close}`;
      selectFrom = start + open.length;
      selectTo = selectFrom + body.length;
    }

    onChange(value.slice(0, start) + inserted + value.slice(end));
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(selectFrom, selectTo);
    }, 0);
  }

  const over = maxLength !== undefined && value.length > maxLength;

  return (
    <Tabs value={tab} onValueChange={setTab} className="gap-2">
      <div className="flex items-center justify-between gap-2">
        <TabsList>
          <TabsTrigger value="write">Pisanje</TabsTrigger>
          <TabsTrigger value="preview">Predogled</TabsTrigger>
        </TabsList>
        {tab === "write" && (
          <div className="flex items-center gap-0.5">
            {MARKS.map((m) => (
              <IconAction key={m.label} label={m.label}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={m.label}
                  className="text-muted-foreground"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    apply(m);
                  }}
                >
                  <m.icon className="size-3.5" />
                </Button>
              </IconAction>
            ))}
          </div>
        )}
      </div>

      <TabsContent value="write">
        <Textarea
          id={id}
          ref={ref}
          rows={rows}
          className="min-h-44 font-mono text-sm"
          placeholder={placeholder}
          value={value}
          aria-invalid={invalid || over}
          onChange={(e) => onChange(e.target.value)}
        />
      </TabsContent>

      <TabsContent value="preview">
        <div className="min-h-44 rounded-md border bg-muted/20 px-3 py-2">
          {value.trim() ? (
            <Markdown>{value}</Markdown>
          ) : (
            <p className="text-sm text-muted-foreground">Ni vsebine za predogled.</p>
          )}
        </div>
      </TabsContent>

      {maxLength !== undefined && (
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>**krepko** | *ležeče* | `koda` | - seznam | ## naslov</span>
          <span className={cn("tabular-nums", over && "text-destructive")}>
            {value.length} / {maxLength}
          </span>
        </div>
      )}
    </Tabs>
  );
}
