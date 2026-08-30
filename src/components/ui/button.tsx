import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  return <button className={cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2",
    size === "sm" ? "h-8 px-3 text-sm" : "h-10 px-4 text-sm",
    variant === "primary" && "bg-accent text-white hover:bg-accent-strong",
    variant === "secondary" && "border bg-surface text-foreground hover:bg-surface-muted",
    variant === "ghost" && "text-muted hover:bg-surface-muted hover:text-foreground",
    variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
    className,
  )} {...props} />;
}
