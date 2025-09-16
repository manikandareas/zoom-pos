import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-6 py-16">
      <section className="space-y-4 text-center">
        <h1 className="text-3xl font-semibold sm:text-4xl">
          Hotel Zoom Food Ordering
        </h1>
        <p className="text-muted-foreground">
          Solusi pemesanan makanan berbasis QR untuk tamu hotel dan dashboard realtime untuk tim operasional.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href="/admin/login">
              Masuk Admin <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="https://supabase.com">
              Lihat Dokumentasi Supabase
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Untuk tamu</CardTitle>
            <CardDescription>Scan QR kamar dan akses menu tanpa login.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Format URL: <code className="rounded bg-muted px-1">/order/&lt;kode&gt;</code></p>
            <p>Contoh: <code className="rounded bg-muted px-1">/order/ROOM301-A</code></p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Untuk tim hotel</CardTitle>
            <CardDescription>Kelola order, katalog, kamar, dan penagihan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Dashboard berada di <code className="rounded bg-muted px-1">/admin</code></p>
            <p>Gunakan akun Supabase admin untuk login.</p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
