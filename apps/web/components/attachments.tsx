"use client";

import { useRef, useState, type ReactNode } from "react";
import { FileText, FilePdf, Download, Trash2, Upload } from "@/components/icons";

import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import type { Attachment as AttachmentRowType } from "@/lib/types";
import { Progress } from "@/components/ui/progress";
import { IconAction } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

const MAX_BYTES = 5 * 1024 * 1024;

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function displayName(filename: string): string {
  return filename.replace(/\.pdf$/i, "");
}

export function Attachments({
  heading,
  ticketId,
  attachments,
  canManage,
  busy,
  onUpload,
  onRemove,
}: {
  heading: (action: ReactNode) => ReactNode;
  ticketId: string;
  attachments: AttachmentRowType[];
  canManage: boolean;
  busy: boolean;
  onUpload: (file: File, onProgress: (p: number) => void) => Promise<void>;
  onRemove: (a: AttachmentRowType) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [queue, setQueue] = useState<{ at: number; of: number } | null>(null);
  const [rejected, setRejected] = useState<string[]>([]);

  async function accept(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);

    const bad: string[] = [];
    const good: File[] = [];
    for (const file of list) {
      if (file.type !== "application/pdf") {
        bad.push(`„${file.name}“ ni PDF.`);
      } else if (file.size > MAX_BYTES) {
        bad.push(`„${file.name}“ meri ${fmtBytes(file.size)}, omejitev je 5.0 MB.`);
      } else {
        good.push(file);
      }
    }
    setRejected(bad);
    if (good.length === 0) return;

    try {
      for (let i = 0; i < good.length; i++) {
        setQueue({ at: i + 1, of: good.length });
        setProgress(0);
        await onUpload(good[i]!, setProgress);
      }
    } finally {
      setProgress(null);
      setQueue(null);
    }
  }

  const href = (a: AttachmentRowType) => `/api/tickets/${ticketId}/attachments/${a.id}/download`;

  const hasFiles = attachments.length > 0;

  return (
    <div
      className="relative flex flex-1 flex-col gap-4"
      onDragOver={
        canManage
          ? (e) => {
              e.preventDefault();
              setDragging(true);
            }
          : undefined
      }
      onDragLeave={
        canManage
          ? (e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
            }
          : undefined
      }
      onDrop={
        canManage
          ? (e) => {
              e.preventDefault();
              setDragging(false);
              void accept(e.dataTransfer.files);
            }
          : undefined
      }
    >
      {canManage && (
        <input
          ref={input}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            void accept(e.target.files);
            e.target.value = "";
          }}
        />
      )}

      {heading(null)}

      {progress !== null && (
        <div className="space-y-1.5">
          <Progress value={progress} />
          <p className="text-xs text-nav-foreground">
            {queue && queue.of > 1 ? `Datoteka ${queue.at} od ${queue.of} | ` : ""}
            {progress < 100 ? `Nalaganje… ${progress}%` : "Obdelava…"}
          </p>
        </div>
      )}

      {rejected.length > 0 && (
        <div className="space-y-0.5">
          {rejected.map((r) => (
            <p key={r} className="text-sm text-destructive">
              {r}
            </p>
          ))}
        </div>
      )}

      {canManage ? (
        <div
          className={cn(
            "flex min-h-40 flex-1 flex-col rounded-lg border border-dashed border-input transition-colors",
            hasFiles ? "px-3 pt-2 pb-1" : "p-0",
            dragging && "border-ring bg-surface-hover",
          )}
        >
          {hasFiles && (
            <ul>
              {attachments.map((a) => (
                <AttachmentRow
                  key={a.id}
                  attachment={a}
                  href={href(a)}
                  canManage={canManage}
                  busy={busy}
                  onRemove={onRemove}
                />
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => input.current?.click()}
            className={cn(
              "group/add flex flex-1 text-sm text-nav-foreground transition-colors hover:text-foreground",
              hasFiles
                ? "mt-3 items-end justify-center gap-2 pt-2 pb-3"
                : "flex-col items-center justify-center gap-3 rounded-lg px-6 py-6 text-center hover:bg-surface-hover",
            )}
          >
            {hasFiles ? (
              <span className="flex items-center gap-2">
                <Upload className="size-4" />
                {dragging ? "Spustite PDF" : "Povlecite še datoteke sem ali kliknite"}
              </span>
            ) : (
              <>
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-inset text-nav-foreground">
                  <Upload className="size-6" />
                </span>
                <span>
                  <span className="block font-medium text-foreground">
                    {dragging ? "Spustite PDF" : "Ni prilog"}
                  </span>
                  <span className="block">Povlecite delovni nalog sem ali kliknite</span>
                  <span className="mt-1 block text-xs text-foreground-faint">PDF do 5 MB</span>
                </span>
              </>
            )}
          </button>
        </div>
      ) : hasFiles ? (
        <ul>
          {attachments.map((a) => (
            <AttachmentRow
              key={a.id}
              attachment={a}
              href={href(a)}
              canManage={canManage}
              busy={busy}
              onRemove={onRemove}
            />
          ))}
        </ul>
      ) : (
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-inset text-nav-foreground">
            <FileText className="size-5" />
          </span>
          <span className="min-w-0 text-sm">
            <span className="block font-medium">Ni prilog</span>
            <span className="block text-nav-foreground">Naloženi delovni nalogi se prikažejo tukaj.</span>
          </span>
        </div>
      )}
    </div>
  );
}

function AttachmentRow({
  attachment: a,
  href,
  canManage,
  busy,
  onRemove,
}: {
  attachment: AttachmentRowType;
  href: string;
  canManage: boolean;
  busy: boolean;
  onRemove: (a: AttachmentRowType) => void;
}) {
  return (
    <li className="group/att relative -mx-2 flex h-14 items-center gap-3 rounded-lg px-2 transition-colors hover:bg-surface-hover">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-inset text-nav-foreground transition-colors group-hover/att:text-foreground">
        <FilePdf className="size-5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{displayName(a.filename)}</p>
        <p className="truncate text-xs text-nav-foreground tabular-nums">
          {fmtBytes(a.size)} · {formatDate(a.createdAt)}
        </p>
      </div>

      <div className="z-20 flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover/att:opacity-100 focus-within:opacity-100">
        <IconAction label="Prenos">
          <Button asChild size="icon-sm" variant="ghost" className="text-nav-foreground">
            <a href={href} download={a.filename} aria-label="Prenos">
              <Download className="size-4" />
            </a>
          </Button>
        </IconAction>
        {canManage && (
          <IconAction label="Odstrani">
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Odstrani prilogo"
              disabled={busy}
              className="text-nav-foreground hover:text-destructive"
              onClick={() => onRemove(a)}
            >
              <Trash2 className="size-4" />
            </Button>
          </IconAction>
        )}
      </div>

      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        title={a.filename}
        aria-label={`Odpri ${a.filename}`}
        className="absolute inset-0 z-10 rounded-lg"
      />
    </li>
  );
}
