"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export const DialogPortal = ({
  children,
}: React.ComponentProps<typeof DialogPrimitive.Portal>) => (
  <DialogPrimitive.Portal>{children}</DialogPrimitive.Portal>
);

export const DialogOverlay = ({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) => (
  <DialogPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm",
      className
    )}
    {...props}
  />
);

export const DialogContent = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      className={cn(
        "fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border border-border bg-background p-6 shadow-lg duration-200",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:opacity-100">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
);

export const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);

export const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />
);

export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;
