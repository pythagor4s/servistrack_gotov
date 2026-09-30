import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function safeNextPath(search: string): string {
  const next = new URLSearchParams(search).get("next");
  if (!next || /[\u0000-\u001f\u007f\s]/.test(next)) return "/nadzorna-plosca";
  if (next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")) return next;
  return "/nadzorna-plosca";
}
