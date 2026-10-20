import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl text-label font-semibold whitespace-nowrap transition-colors select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-accent-fill text-white hover:bg-accent-pressed active:bg-accent-pressed",
        secondary: "border border-border bg-transparent text-foreground hover:bg-surface-elevated",
        ghost: "bg-transparent text-muted hover:bg-surface-elevated hover:text-foreground",
        link: "h-auto px-0 text-accent-text underline-offset-4 hover:underline",
      },
      size: {
        /** Ações compactas no desktop (ex.: botão dentro de um card). */
        sm: "h-9 px-3",
        md: "h-12 px-5",
        /** Botão principal das telas mobile (52px, DESIGN.md). */
        lg: "h-13 px-6 text-body font-semibold",
        icon: "size-12",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Renderiza o filho (ex.: um Link) com o visual do botão. */
    asChild?: boolean;
    /** Mostra um spinner e desabilita o botão. */
    loading?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  fullWidth,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size, fullWidth }), className);

  if (asChild) {
    return (
      <Slot className={classes} {...props}>
        {children}
      </Slot>
    );
  }

  return (
    <button className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading && <Loader2 className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export { buttonVariants };
