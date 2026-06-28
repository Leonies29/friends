import { Slot } from "@radix-ui/react-slot";
import type { ComponentPropsWithoutRef, ElementRef, HTMLAttributes } from "react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  asChild?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

export const Button = forwardRef<ElementRef<"button">, ButtonProps>(
  ({ className, asChild, variant = "primary", size = "md", ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl": variant === "primary",
            "glass text-foreground hover:bg-white/40 dark:hover:bg-white/10": variant === "secondary",
            "text-foreground hover:bg-muted": variant === "ghost",
            "bg-rose-500 text-white hover:bg-rose-600": variant === "danger",
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
  return <div className={cn("glass rounded-[2rem] p-5", className)} {...props} />;
}

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-accent",
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
      className={cn("h-11 w-11 rounded-full border-2 border-white/70 bg-muted object-cover shadow-md", className)}
    />
  );
}

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-3 overflow-hidden rounded-full bg-muted", className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300 transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function Field({
  label,
  textarea,
  className,
  ...props
}: ComponentPropsWithoutRef<"input"> & { label: string; textarea?: false }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-muted-foreground">
      {label}
      <input
        className={cn(
          "rounded-2xl border border-border bg-white/70 px-4 py-3 text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-accent focus:ring-2 focus:ring-accent/20 dark:bg-white/10",
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
    <label className="grid gap-2 text-sm font-semibold text-muted-foreground">
      {label}
      <textarea
        className={cn(
          "min-h-28 rounded-2xl border border-border bg-white/70 px-4 py-3 text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-accent focus:ring-2 focus:ring-accent/20 dark:bg-white/10",
          className
        )}
        {...props}
      />
    </label>
  );
}
