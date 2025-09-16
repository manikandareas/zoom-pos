import { cn } from "@/lib/utils";

export const Separator = ({ className }: { className?: string }) => (
  <div className={cn("my-4 h-px w-full bg-border", className)} />
);
