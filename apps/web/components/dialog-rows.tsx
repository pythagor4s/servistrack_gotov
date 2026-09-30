"use client";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md bg-muted/40 px-3 py-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function DangerZone({
  label,
  description,
  actionLabel,
  onAction,
  disabled,
}: {
  label: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md bg-destructive/10 px-3 py-2">
      <div className="text-destructive">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs opacity-80">{description}</p>
      </div>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={disabled}
        className="shrink-0"
        onClick={onAction}
      >
        {actionLabel}
      </Button>
    </div>
  );
}
