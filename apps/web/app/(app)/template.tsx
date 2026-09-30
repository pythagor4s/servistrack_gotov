import type { ReactNode } from "react";

export default function Template({ children }: { children: ReactNode }) {
  return <div className="animate-page-enter lg:flex lg:flex-1 lg:flex-col">{children}</div>;
}
