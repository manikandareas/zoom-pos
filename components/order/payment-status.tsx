"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";

interface PaymentStatusClientProps {
  orderId: string;
  roomCode: string;
  paymentUrl: string;
  paymentStatus: string;
  paymentMethod: string;
  externalId: string;
}

export default function PaymentStatusClient({
  orderId,
  roomCode,
  paymentUrl,
  paymentStatus: initialStatus,
  paymentMethod,
  externalId,
}: PaymentStatusClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [isPolling, setIsPolling] = useState(true);
  const [countdown, setCountdown] = useState(3600); // 1 hour in seconds

  // Poll payment status every 3 seconds
  useEffect(() => {
    if (!isPolling || status === "PAID" || status === "EXPIRED") {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/payment/status?orderId=${orderId}`,
        );
        if (response.ok) {
          const data = await response.json();
          if (data.payment_status !== status) {
            setStatus(data.payment_status);

            // Redirect to order page when paid
            if (data.payment_status === "PAID") {
              setIsPolling(false);
              setTimeout(() => {
                router.push(`/order/${roomCode}`);
              }, 2000);
            }

            // Stop polling if expired or failed
            if (
              data.payment_status === "EXPIRED" ||
              data.payment_status === "FAILED"
            ) {
              setIsPolling(false);
            }
          }
        }
      } catch (error) {
        console.error("Failed to poll payment status:", error);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [isPolling, status, orderId, roomCode, router]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0 || status === "PAID") {
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, status]);

  // Format countdown as HH:MM:SS
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Render status icon
  const renderStatusIcon = () => {
    switch (status) {
      case "PAID":
        return <CheckCircle2 className="h-16 w-16 text-green-500" />;
      case "EXPIRED":
      case "FAILED":
        return <XCircle className="h-16 w-16 text-red-500" />;
      case "PENDING":
      default:
        return <Clock className="h-16 w-16 text-blue-500 animate-pulse" />;
    }
  };

  // Render status message
  const renderStatusMessage = () => {
    switch (status) {
      case "PAID":
        return {
          title: "Pembayaran Berhasil!",
          description:
            "Pembayaran Anda telah dikonfirmasi. Order Anda akan segera diproses.",
        };
      case "EXPIRED":
        return {
          title: "Pembayaran Kedaluwarsa",
          description:
            "Waktu pembayaran telah habis. Silakan buat order baru.",
        };
      case "FAILED":
        return {
          title: "Pembayaran Gagal",
          description: "Pembayaran Anda gagal diproses. Silakan coba lagi.",
        };
      case "PENDING":
      default:
        return {
          title: "Menunggu Pembayaran",
          description:
            "Silakan selesaikan pembayaran Anda melalui metode yang dipilih.",
        };
    }
  };

  const statusMessage = renderStatusMessage();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Status Pembayaran</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Icon */}
          <div className="flex justify-center">{renderStatusIcon()}</div>

          {/* Status Message */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">{statusMessage.title}</h2>
            <p className="text-muted-foreground">{statusMessage.description}</p>
          </div>

          {/* Countdown Timer */}
          {status === "PENDING" && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Waktu tersisa:
              </p>
              <p className="text-3xl font-mono font-bold">
                {formatTime(countdown)}
              </p>
            </div>
          )}

          {/* Payment Method Info */}
          {paymentMethod && status === "PENDING" && (
            <div className="text-center text-sm text-muted-foreground">
              <p>Metode Pembayaran: {paymentMethod}</p>
            </div>
          )}

          {/* Transaction ID */}
          <div className="text-center text-xs text-muted-foreground">
            <p>ID Transaksi: {externalId}</p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Payment button - only show if URL exists */}
            {status === "PENDING" && paymentUrl && paymentUrl.length > 0 && (
              <Button asChild className="w-full" size="lg">
                <a
                  href={paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Buka Halaman Pembayaran
                </a>
              </Button>
            )}

            {/* Fallback if payment URL not available */}
            {status === "PENDING" && (!paymentUrl || paymentUrl.length === 0) && (
              <div className="space-y-3">
                <div className="rounded-lg bg-destructive/10 p-4 text-center">
                  <p className="text-sm text-destructive font-medium mb-2">
                    Link pembayaran belum tersedia
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Silakan refresh halaman atau kembali ke menu untuk membuat order baru
                  </p>
                </div>
                <Button
                  onClick={() => router.refresh()}
                  className="w-full"
                  size="lg"
                >
                  Refresh Halaman
                </Button>
              </div>
            )}

            {(status === "EXPIRED" || status === "FAILED") && (
              <Button
                onClick={() => router.push(`/order/${roomCode}`)}
                className="w-full"
                size="lg"
              >
                Kembali ke Menu
              </Button>
            )}

            {status === "PENDING" && paymentUrl && paymentUrl.length > 0 && (
              <Button
                onClick={() => router.push(`/order/${roomCode}`)}
                variant="outline"
                className="w-full"
              >
                Kembali ke Menu
              </Button>
            )}
          </div>

          {/* Auto-refresh indicator */}
          {isPolling && status === "PENDING" && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Memeriksa status pembayaran...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions Card */}
      {status === "PENDING" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cara Pembayaran</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <h4 className="font-semibold mb-2">QRIS:</h4>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Buka aplikasi e-wallet Anda (GoPay, OVO, Dana, dll)</li>
                <li>Scan QR code pada halaman pembayaran</li>
                <li>Konfirmasi pembayaran</li>
              </ol>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Virtual Account:</h4>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Salin nomor Virtual Account</li>
                <li>Transfer melalui mobile banking / ATM</li>
                <li>Pembayaran akan otomatis terkonfirmasi</li>
              </ol>
            </div>
            <div>
              <h4 className="font-semibold mb-2">E-Wallet:</h4>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Pilih metode e-wallet (GoPay, OVO, ShopeePay, dll)</li>
                <li>Login ke akun e-wallet Anda</li>
                <li>Konfirmasi pembayaran</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
