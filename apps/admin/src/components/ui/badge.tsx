import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full px-3 py-0.5 text-xs font-semibold w-fit whitespace-nowrap shrink-0 gap-1 transition-colors overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-[#eeebfb] text-[var(--frox-brand)]",
        secondary:
          "bg-[var(--frox-slate-soft)] text-[var(--frox-gray-700)]",
        destructive:
          "bg-red-50 text-[var(--frox-red)]",
        outline:
          "border border-[var(--frox-neutral-border)] text-[var(--frox-gray-600)] bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
