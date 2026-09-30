"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Upload } from "@/components/icons";

import { apiDelete, apiUpload, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export async function checkImageFile(
  file: File,
  rules: {
    mimeTypes: readonly string[];
    maxBytes: number;
    typeMessage: string;
    dimensions: (size: { width: number; height: number }) => string | null;
  },
): Promise<string | null> {
  if (!rules.mimeTypes.includes(file.type)) {
    return rules.typeMessage;
  }
  if (file.size > rules.maxBytes) {
    return `Slika je prevelika (največ ${rules.maxBytes / 1024 / 1024} MB).`;
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return "Datoteke ni bilo mogoče prebrati kot sliko.";
  }
  const { width, height } = bitmap;
  bitmap.close();
  return rules.dimensions({ width, height });
}

export function ImageField({
  label,
  resource,
  id,
  initialHasImage,
  accept,
  hint,
  frameClassName,
  fit,
  placeholder,
  check,
  onPick,
  onChanged,
}: {
  label: string;
  resource: string;
  id: string | null;
  initialHasImage: boolean;
  accept: string;
  hint: ReactNode;
  frameClassName: string;
  fit: "contain" | "cover";
  placeholder: ReactNode;
  check: (file: File) => Promise<string | null>;
  onPick: (file: File | null) => void;
  onChanged: () => void;
}) {
  const [hasImage, setHasImage] = useState(initialHasImage);
  const [version, setVersion] = useState(0);
  const [pending, setPending] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!pending) return setPreviewUrl(null);
    const url = URL.createObjectURL(pending);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pending]);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError(null);
    const problem = await check(file);
    if (problem) {
      setError(problem);
      return;
    }
    if (id) {
      setBusy(true);
      try {
        await apiUpload(`/${resource}/${id}/image`, file);
        setHasImage(true);
        setVersion((v) => v + 1);
        onChanged();
        toast.success("Slika naložena");
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Slike ni bilo mogoče naložiti");
      } finally {
        setBusy(false);
      }
    } else {
      setPending(file);
      onPick(file);
    }
  }

  async function remove() {
    setError(null);
    if (id) {
      setBusy(true);
      try {
        await apiDelete(`/${resource}/${id}/image`);
        setHasImage(false);
        setVersion((v) => v + 1);
        onChanged();
        toast.success("Slika odstranjena");
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Slike ni bilo mogoče odstraniti");
      } finally {
        setBusy(false);
      }
    } else {
      setPending(null);
      onPick(null);
    }
  }

  const shown = previewUrl ?? (hasImage ? `/api/${resource}/${id}/image?v=${version}` : null);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex shrink-0 items-center justify-center overflow-hidden border",
            frameClassName,
          )}
        >
          {shown ? (
            <img
              src={shown}
              alt=""
              className={cn("size-full", fit === "cover" ? "object-cover" : "object-contain")}
            />
          ) : (
            placeholder
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm text-muted-foreground">{hint}</p>
          <div className="flex flex-wrap gap-2">
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              className="hidden"
              onChange={(e) => {
                void pick(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="size-3.5" /> {shown ? "Zamenjaj sliko" : "Naloži sliko"}
            </Button>
            {shown && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                className="text-muted-foreground"
                onClick={() => void remove()}
              >
                Odstrani sliko
              </Button>
            )}
          </div>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
