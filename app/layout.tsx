import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getServerSession } from "@/lib/supabase/session";
import { SupabaseProvider } from "@/components/providers/supabase-provider";
import { SupabaseListener } from "@/components/providers/supabase-listener";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hotel Zoom Ordering",
  description: "Dashboard admin dan pemesanan tamu untuk Hotel Zoom.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-background text-foreground antialiased`}
      >
        <SupabaseProvider initialSession={session}>
          <SupabaseListener serverAccessToken={session?.access_token} />
          {children}
        </SupabaseProvider>
      </body>
    </html>
  );
}
