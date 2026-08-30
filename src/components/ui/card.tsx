import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border bg-surface shadow-[0_1px_2px_rgba(24,32,29,0.03)]", className)} {...props} />;
}
