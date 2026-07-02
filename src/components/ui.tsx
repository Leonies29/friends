import { Slot } from "@radix-ui/react-slot";
import type { ComponentPropsWithoutRef, ElementRef, HTMLAttributes } from "react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  asChild?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "gold";
  size?: "sm" | "md" | "lg";
};

export const Button = forwardRef<ElementRef<"button">, ButtonProps>(
  ({ className, asChild, variant = "primary", size = "md", ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-full font-bold tracking-tight transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-primary text-primary-foreground hover:opacity-95": variant === "primary",
            "border border-border bg-card text-foreground hover:bg-muted": variant === "secondary",
            "text-foreground hover:bg-muted": variant === "ghost",
            "bg-rose-500 text-white hover:bg-rose-600": variant === "danger",
            "bg-accent text-slate-950 shadow-sm": variant === "gold",
            "h-9 px-4 text-sm": size === "sm",
            "h-11 px-5 text-sm": size === "md",
            "h-13 px-7 text-base": size === "lg"
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[1.5rem] border border-border bg-card p-5 shadow-sm", className)} {...props} />;
}

export function GameCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[1.75rem] border border-border bg-card p-5 shadow-sm", className)} {...props} />;
}

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/15 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-accent",
        className
      )}
      {...props}
    />
  );
}

export function Avatar({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <img
      src={src}
      alt={alt}
      className={cn("h-11 w-11 rounded-full border-2 border-white/70 bg-muted object-cover shadow-lg shadow-slate-950/10", className)}
    />
  );
}

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-3 overflow-hidden rounded-full bg-muted/80 shadow-inner", className)}>
      <div
        className="h-full rounded-full bg-accent transition-all duration-300 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function Field({
  label,
  className,
  ...props
}: ComponentPropsWithoutRef<"input"> & { label: string }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-muted-foreground">
      {label}
      <input
        className={cn(
          "rounded-2xl border border-border bg-background px-4 py-3 text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-accent focus:ring-4 focus:ring-accent/15",
          className
        )}
        {...props}
      />
    </label>
  );
}

export function TextArea({
  label,
  className,
  ...props
}: ComponentPropsWithoutRef<"textarea"> & { label: string }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-muted-foreground">
      {label}
      <textarea
        className={cn(
          "min-h-28 rounded-2xl border border-border bg-background px-4 py-3 text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-accent focus:ring-4 focus:ring-accent/15",
          className
        )}
        {...props}
      />
    </label>
  );
}
