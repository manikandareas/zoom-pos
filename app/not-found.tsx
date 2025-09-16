import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-3xl font-semibold">Halaman tidak ditemukan</h1>
      <p className="max-w-sm text-muted-foreground">
        QR atau tautan yang kamu akses tidak tersedia. Silakan hubungi resepsionis
        untuk memastikan kode kamar terbaru.
      </p>
      <Button asChild>
        <Link href="/">Kembali ke beranda</Link>
      </Button>
    </main>
  );
}
