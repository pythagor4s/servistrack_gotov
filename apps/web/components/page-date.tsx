"use client";

import { useEffect, useState, type ReactNode } from "react";

import { formatDayWithWeekday, todayLocal } from "@/lib/calendar";
import { cn } from "@/lib/utils";

export function PageDate({
  children,
  as: Tag = "p",
  className,
}: {
  children?: ReactNode;
  as?: "p" | "h1";
  className?: string;
}) {
  return (
    <Tag className={cn("min-w-0 truncate text-sm leading-9 font-normal text-nav-foreground first-letter:uppercase", className)}>
      {children ?? <Today />}
    </Tag>
  );
}

function Today() {
  const [today, setToday] = useState(todayLocal);
  useEffect(() => {
    const id = setInterval(() => setToday(todayLocal()), 60_000);
    return () => clearInterval(id);
  }, []);
  return <>{formatDayWithWeekday(today)}</>;
}
