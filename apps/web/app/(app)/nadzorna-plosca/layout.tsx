import type { Metadata } from "next";

export const metadata: Metadata = { title: "Nadzorna plošča" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
