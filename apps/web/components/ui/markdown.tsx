"use client";

import ReactMarkdown, { type Options } from "react-markdown";

import { cn } from "@/lib/utils";

export function Markdown({
  children,
  className,
  rehypePlugins,
}: {
  children: string;
  className?: string;
  rehypePlugins?: Options["rehypePlugins"];
}) {
  return (
    <div className={cn("markdown", className)}>
      <ReactMarkdown
        rehypePlugins={rehypePlugins}
        components={{
          a: ({ ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

export { stripMarkdown } from "@servis-track/shared";
