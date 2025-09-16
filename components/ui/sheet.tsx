"use client";

import * as SheetPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetPortal = SheetPrimitive.Portal;
const SheetOverlay = SheetPrimitive.Overlay;

const SheetContent = ({
  className,
  children,
  side = "right",
  ...props
}: React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> & {
  side?: "top" | "bottom" | "left" | "right";
}) => (
  <SheetPortal>
    <SheetOverlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
    <SheetPrimitive.Content
      className={cn(
        "fixed z-50 flex h-full flex-col bg-background shadow-xl transition-transform",
        side === "right" && "inset-y-0 right-0 w-full max-w-sm border-l",
        side === "left" && "inset-y-0 left-0 w-full max-w-sm border-r",
        side === "top" && "inset-x-0 top-0 h-1/2 border-b",
        side === "bottom" && "inset-x-0 bottom-0 h-1/2 border-t",
        className
      )}
      {...props}
    >
      <div className="flex-1 overflow-y-auto p-6">{children}</div>
      <SheetPrimitive.Close className="absolute right-4 top-4 rounded-md opacity-70 ring-offset-background transition-opacity focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:opacity-100">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </SheetPrimitive.Close>
    </SheetPrimitive.Content>
  </SheetPortal>
);

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("space-y-1.5", className)} {...props} />
);

const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-6 space-y-2", className)} {...props} />
);

const SheetTitle = SheetPrimitive.Title;
const SheetDescription = SheetPrimitive.Description;

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
