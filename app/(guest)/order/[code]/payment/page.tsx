import { ensureGuestSession } from "@/lib/auth/guest";
import { getPaymentStatus } from "@/lib/data/payments";
import { redirect } from "next/navigation";
import PaymentStatusClient from "@/components/order/payment-status";

// Disable caching to always fetch fresh payment data
export const revalidate = 0;

interface PaymentPageProps {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ orderId?: string }>;
}

export default async function PaymentPage({
  params,
  searchParams,
}: PaymentPageProps) {
  const { code } = await params;
  const { orderId } = await searchParams;

  if (!orderId) {
    redirect(`/order/${code}`);
  }

  // Ensure guest session
  const guest = await ensureGuestSession();
  if (!guest) {
    redirect(`/order/${code}`);
  }

  try {
    // Get payment status from database
    const payment = await getPaymentStatus(orderId);

    console.log("[Payment Page] Loaded payment data:", {
      orderId,
      hasPaymentUrl: !!payment.payment_url,
      paymentUrlLength: payment.payment_url?.length,
      paymentStatus: payment.payment_status,
    });

    // If already paid, redirect to order page
    if (payment.payment_status === "PAID") {
      redirect(`/order/${code}`);
    }

    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <PaymentStatusClient
            orderId={orderId}
            roomCode={code}
            paymentUrl={payment.payment_url ?? ""}
            paymentStatus={payment.payment_status ?? "PENDING"}
            paymentMethod={payment.payment_method ?? ""}
            externalId={payment.external_id ?? ""}
          />
        </div>
      </div>
    );
  } catch (error) {
    console.error("[Payment Page] Failed to load payment status:", error);
    redirect(`/order/${code}`);
  }
}
