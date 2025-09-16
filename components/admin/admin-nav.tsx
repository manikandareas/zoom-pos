"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/catalog", label: "Catalog" },
  { href: "/admin/rooms", label: "Rooms" },
  { href: "/admin/billing", label: "Billing" },
];

export const AdminNav = () => {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-4">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "text-sm font-medium transition-colors hover:text-foreground/80",
              isActive ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
};
