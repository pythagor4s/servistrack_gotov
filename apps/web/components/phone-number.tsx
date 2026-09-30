"use client";

import type { ReactNode } from "react";
import { Phone } from "@/components/icons";

import { CopyableValue } from "@/components/copyable";
import { EmptyCell } from "@/components/ui/table";

export function PhoneNumber({
  phone,
  icon = true,
  hint,
  empty = <EmptyCell />,
  tone,
  className,
}: {
  phone?: string | null;
  icon?: boolean;
  hint?: boolean;
  empty?: ReactNode;
  tone?: "muted" | "inherit";
  className?: string;
}) {
  return (
    <CopyableValue
      value={phone}
      icon={Phone}
      showIcon={icon}
      hint={hint}
      copiedLabel="Številka kopirana"
      toastId="copy-phone"
      empty={empty}
      tone={tone}
      className={className}
    />
  );
}
