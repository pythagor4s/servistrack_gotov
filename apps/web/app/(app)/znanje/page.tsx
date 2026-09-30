"use client";

import { Suspense } from "react";

import { KnowledgeWorkspace } from "@/components/knowledge/kb-workspace";

export default function KnowledgePage() {
  return (
    <Suspense fallback={null}>
      <KnowledgeWorkspace />
    </Suspense>
  );
}
