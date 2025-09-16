import Link from "next/link";
import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AdminNav } from "@/components/admin/admin-nav";
import { getAuthContext } from "@/lib/supabase/auth";
import { logoutAction } from "@/app/(auth)/admin/login/actions";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = await getAuthContext();

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-8">
            <Link href="/admin/orders" className="text-lg font-semibold">
              Hotel Zoom Admin
            </Link>
            <AdminNav />
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground md:block">
              {user?.email ?? "Admin"}
            </span>
            <form action={logoutAction}>
              <Button variant="ghost" size="sm" type="submit">
                Logout
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
