import type { Metadata } from "next";

export const metadata: Metadata = { title: "Serviserji" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
