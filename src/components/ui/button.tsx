import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "relative overflow-hidden bg-ink text-white shadow-soft hover:-translate-y-0.5 hover:bg-institut",
        brand: "bg-primary text-white hover:bg-primary-dark",
        secondary:
          "border border-line bg-white text-ink hover:border-primary/30 hover:bg-primary-light/40",
        ghost: "text-ink/70 hover:bg-primary-light/50 hover:text-ink",
        soft: "bg-primary-light text-primary-dark hover:bg-primary/15",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-11 px-5",
        lg: "h-12 px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {children}
      {variant === "primary" ? (
        <span className="pointer-events-none absolute inset-y-0 -left-16 w-10 rotate-12 bg-white/25 blur-md transition-all duration-700 group-hover:left-[120%]" />
      ) : null}
    </button>
  ),
);
Button.displayName = "Button";

export { buttonVariants };
