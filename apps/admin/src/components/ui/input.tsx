import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl border border-[var(--frox-neutral-border)] bg-[var(--frox-gray-100)] px-3 py-2 text-sm text-[var(--frox-gray-800)] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--frox-gray-400)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frox-brand)]/40 focus-visible:bg-white transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
















