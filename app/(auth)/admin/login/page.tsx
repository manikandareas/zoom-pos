import Link from "next/link";
import { AdminLoginForm } from "@/components/auth/admin-login-form";

export const metadata = {
  title: "Admin Login - Hotel Zoom",
  description: "Masuk ke dashboard admin Hotel Zoom",
};

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-sm">
        <div className="mb-6 space-y-1 text-center">
          <h1 className="text-xl font-semibold">Masuk Admin</h1>
          <p className="text-sm text-muted-foreground">
            Gunakan akun admin Supabase untuk mengelola pemesanan.
          </p>
        </div>
        <AdminLoginForm />
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Butuh akses? Hubungi <Link href="mailto:ops@hotelzoom.com" className="underline">ops@hotelzoom.com</Link>.
        </p>
      </div>
    </main>
  );
}
