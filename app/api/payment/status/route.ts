import { NextRequest, NextResponse } from "next/server";
import { getPaymentStatus } from "@/lib/data/payments";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const orderId = searchParams.get("orderId");

  if (!orderId) {
    return NextResponse.json(
      { error: "orderId is required" },
      { status: 400 },
    );
  }

  try {
    const payment = await getPaymentStatus(orderId);

    return NextResponse.json({
      payment_status: payment.payment_status,
      payment_method: payment.payment_method,
      paid_at: payment.paid_at,
    });
  } catch (error) {
    console.error("Failed to get payment status:", error);
    return NextResponse.json(
      { error: "Failed to get payment status" },
      { status: 500 },
    );
  }
}
