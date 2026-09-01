import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-ink/8 bg-surface shadow-[0_1px_2px_rgba(39,34,79,0.025),0_12px_40px_rgba(39,34,79,0.035)]", className)} {...props} />;
}
