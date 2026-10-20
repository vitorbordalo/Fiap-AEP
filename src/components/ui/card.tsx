import { cn } from "@/lib/utils";

type CardProps = React.ComponentProps<"div"> & {
  /** Card clicável ganha realce no hover. Profundidade vem da cor da superfície, nunca de sombra. */
  interactive?: boolean;
};

export function Card({ className, interactive = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface",
        interactive && "transition-colors hover:bg-surface-elevated",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1 p-5 pb-0", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 className={cn("text-title", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-label font-normal text-muted", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-5", className)} {...props} />;
}
