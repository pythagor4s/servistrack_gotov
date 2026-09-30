"use client"

import * as React from "react"
import { Ellipsis, type IconComponent } from "@/components/icons"

import { cn } from "@/lib/utils"

export function EmptyCell({ className }: { className?: string }) {
  return (
    <span className={cn("inline select-none", className)}>
      <Ellipsis aria-hidden className="size-4 align-middle text-muted-foreground/55" />
      <span className="sr-only">Ni podatka</span>
    </span>
  )
}

export const TABLE_FRAME = "overflow-hidden border rounded-lg shadow-md  shadow-black/5"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto overflow-y-hidden"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        "[&_tr]:h-11 [&_tr]:border-b [&_tr]:border-b-border [&_tr]:bg-table-head [&_tr:hover]:bg-table-head",
        className,
      )}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({
  className,
  zebra,
  plain,
  ...props
}: React.ComponentProps<"tr"> & {
  zebra?: number
  plain?: boolean
  "data-row-tint"?: "neutral"
}) {
  const tinted = props["data-row-tint"] !== undefined
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "h-12 border-b border-transparent transition-colors",
        !plain && !tinted && "hover:bg-surface-hover",
        !plain &&
          "has-aria-expanded:bg-surface-hover data-[state=selected]:bg-surface-selected",
        zebra !== undefined && "border-b-border/50",
        zebra !== undefined && zebra % 2 === 1 && "bg-table-stripe",
        className
      )}
      {...props}
    />
  )
}

export const TABLE_HEAD_TEXT = "text-sm font-medium text-foreground"

const COLUMN_RULE = "border-r border-r-border/50 last:border-r-0"

function TableHead({
  className,
  icon: Icon,
  children,
  ...props
}: React.ComponentProps<"th"> & {
  icon?: IconComponent
}) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        TABLE_HEAD_TEXT,
        COLUMN_RULE,
        "h-11 px-3 text-left align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    >
      {Icon ? (
        <span className="inline-flex items-center gap-1.5 align-middle">
          <Icon className="size-[1.125rem] shrink-0 text-muted-foreground" />
          {children}
        </span>
      ) : (
        children
      )}
    </th>
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        COLUMN_RULE,
        "px-3 py-1.5 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
