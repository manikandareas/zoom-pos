"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;
export const SelectTrigger = ({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>) => (
  <SelectPrimitive.Trigger
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    {children}
    <ChevronDown className="h-4 w-4 opacity-50" />
  </SelectPrimitive.Trigger>
);

export const SelectContent = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      className={cn(
        "relative z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md",
        className
      )}
      {...props}
    >
      <SelectPrimitive.Viewport className="p-1" />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
);

export const SelectItem = ({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>) => (
  <SelectPrimitive.Item
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm px-3 py-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground",
      className
    )}
    {...props}
  >
    <span className="absolute right-3 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
);
