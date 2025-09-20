import React from "react"
import { cn } from "../lib/utils"

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg"
}

export function Spinner({ size = "md", className, ...props }: SpinnerProps) {
  return (
    <div
      className={cn(
        "animate-spin rounded-full border-current border-t-transparent",
        {
          "h-4 w-4 border-2": size === "sm",
          "h-8 w-8 border-[3px]": size === "md",
          "h-12 w-12 border-4": size === "lg"
        },
        "text-primary",
        className
      )}
      {...props}
    >
      <span className="sr-only">Loading</span>
    </div>
  )
} 