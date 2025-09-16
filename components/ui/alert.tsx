import { cn } from "@/lib/utils";

export const Alert = ({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "destructive" | "success" }) => (
  <div
    role="alert"
    className={cn(
      "rounded-lg border p-4 text-sm",
      variant === "default" && "bg-muted",
      variant === "destructive" && "border-destructive/30 bg-destructive/10 text-destructive",
      variant === "success" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
      className
    )}
    {...props}
  />
);
