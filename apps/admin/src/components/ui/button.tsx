import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[var(--frox-brand)]/50 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-[linear-gradient(135deg,var(--frox-brand-strong),var(--frox-plum))] text-white shadow-[0_16px_32px_rgba(97,80,210,0.26)] hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(97,80,210,0.32)] active:translate-y-0 active:shadow-[0_14px_24px_rgba(97,80,210,0.24)]",
        destructive:
          "bg-[var(--frox-red)] text-white shadow-[0_12px_28px_rgba(226,55,56,0.2)] hover:-translate-y-0.5 hover:opacity-95",
        outline:
          "border border-[rgba(115,100,219,0.12)] bg-white/90 text-[var(--frox-gray-700)] shadow-[0_10px_24px_rgba(52,40,121,0.06)] hover:border-[rgba(115,100,219,0.24)] hover:bg-[var(--frox-brand-softer)]",
        secondary:
          "bg-[var(--frox-brand-soft)] text-[var(--frox-brand-strong)] hover:bg-[rgba(115,100,219,0.18)]",
        ghost:
          "text-[var(--frox-gray-600)] hover:bg-[var(--frox-brand-softer)] hover:text-[var(--frox-brand-strong)]",
        link: "text-[var(--frox-brand)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
