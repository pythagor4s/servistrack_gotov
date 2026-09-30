"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

import { useTheme } from "@/lib/theme"
import { Loader } from "@/components/loader"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()
  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-[1.125rem] text-status-progress" />,
        info: <InfoIcon className="size-[1.125rem] text-status-open" />,
        warning: <TriangleAlertIcon className="size-[1.125rem] text-status-servicer" />,
        error: <OctagonXIcon className="size-[1.125rem] text-destructive" />,
        loading: <Loader className="size-5" label="" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "left-0! right-0! mx-auto! w-fit! max-w-[var(--width)]! gap-2.5! rounded-[1.5rem]! py-3! pr-5! pl-4! text-sm! shadow-xl! shadow-halo-strong!",
          title: "font-medium!",
          actionButton: "rounded-full! px-3!",
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--success-bg": "var(--popover)",
          "--success-text": "var(--popover-foreground)",
          "--success-border": "var(--border)",
          "--info-bg": "var(--popover)",
          "--info-text": "var(--popover-foreground)",
          "--info-border": "var(--border)",
          "--warning-bg": "var(--popover)",
          "--warning-text": "var(--popover-foreground)",
          "--warning-border": "var(--border)",
          "--error-bg": "var(--popover)",
          "--error-text": "var(--destructive)",
          "--error-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
