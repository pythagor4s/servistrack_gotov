"use client";

import { useEffect, useState } from "react";

import { processedMachinePhoto } from "@/lib/machine-photo";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function MachinePhoto({
  machine,
  className,
  imgClassName,
}: {
  machine: { id: string; image?: { updatedAt: string } | null };
  className?: string;
  imgClassName?: string;
}) {
  const { theme } = useTheme();
  const [url, setUrl] = useState<string | null>(null);
  const src = machine.image
    ? `/api/machines/${machine.id}/image?v=${machine.image.updatedAt}`
    : null;

  useEffect(() => {
    if (!src) return;
    let live = true;
    void processedMachinePhoto(src, theme).then((u) => live && setUrl(u));
    return () => {
      live = false;
    };
  }, [src, theme]);

  if (!src) return null;
  return (
    <div className={cn("aspect-3/2", className)}>
      {url && (
        <img
          src={url}
          alt=""
          draggable={false}
          className={cn("block size-full animate-in object-contain fade-in duration-300 select-none", imgClassName)}
        />
      )}
    </div>
  );
}
