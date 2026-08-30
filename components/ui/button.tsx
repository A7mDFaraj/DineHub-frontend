import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.96]",
  {
    variants: {
      variant: {
        default:
          "bg-white text-black hover:bg-white/90 shadow-[0_0_15px_rgba(255,255,255,0.1)]",
        primary: 
          "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg hover:shadow-amber-500/25 border border-amber-400/20",
        destructive:
          "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20",
        outline:
          "border border-white/10 bg-transparent hover:bg-white/5 text-white",
        secondary:
          "bg-white/10 text-white hover:bg-white/20 border border-white/5",
        ghost: "hover:bg-white/10 text-white",
        glass: "glass-panel text-white hover:bg-white/5",
        link: "text-amber-500 underline-offset-4 hover:underline",
        brand:
          "rounded-full bg-[var(--landing-ink)] text-white shadow-[0_12px_32px_rgba(34,24,42,0.22),inset_0_1px_0_rgba(255,255,255,0.16)] hover:bg-[var(--landing-plum)] hover:shadow-[0_16px_38px_rgba(34,24,42,0.28),inset_0_1px_0_rgba(255,255,255,0.18)] focus-visible:ring-[var(--landing-coral)] focus-visible:ring-offset-[var(--landing-porcelain)]",
        brandOutline:
          "rounded-full border border-black/10 bg-white/60 text-[var(--landing-ink)] shadow-[0_8px_22px_rgba(34,24,42,0.08)] backdrop-blur-md hover:border-black/20 hover:bg-white focus-visible:ring-[var(--landing-coral)] focus-visible:ring-offset-[var(--landing-porcelain)]",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 rounded-md px-4 text-xs",
        lg: "h-14 rounded-lg px-8 text-base",
        icon: "h-11 w-11",
        xl: "h-14 rounded-full px-7 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
