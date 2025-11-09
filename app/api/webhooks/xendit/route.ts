import { NextRequest, NextResponse } from "next/server";
import { verifyCallbackToken } from "@/lib/xendit/webhook-validator";
import type { XenditInvoiceWebhook } from "@/lib/xendit/types";
import {
  updatePaymentStatus,
  getOrderByExternalId,
} from "@/lib/data/payments";
import { broadcastRoomStatus } from "@/lib/realtime";

/**
 * Xendit Invoice Webhook Handler
 * Receives payment confirmation callbacks from Xendit
 *
 * Webhook Documentation: https://developers.xendit.co/api-reference/#invoice-callback
 */
export async function POST(request: NextRequest) {
  try {
    // Get callback token from header
    const callbackToken = request.headers.get("x-callback-token");

    console.log("[Xendit Webhook] Received webhook request", {
      hasToken: !!callbackToken,
      tokenPrefix: callbackToken?.substring(0, 10) + "...",
    });

    // Validate webhook token (Xendit uses simple token comparison)
    if (!verifyCallbackToken(callbackToken)) {
      console.error("[Xendit Webhook] Token validation failed");
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 },
      );
    }

    console.log("[Xendit Webhook] Token validated successfully");

    // Get request body and parse payload
    const body = await request.text();
    const payload: XenditInvoiceWebhook = JSON.parse(body);

    console.log("Xendit webhook received:", {
      external_id: payload.external_id,
      status: payload.status,
      payment_method: payload.payment_method,
    });

    // Check if order exists
    const order = await getOrderByExternalId(payload.external_id);
    if (!order) {
      console.error("Order not found for external_id:", payload.external_id);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Map Xendit status to our payment status
    let paymentStatus: "PENDING" | "PAID" | "FAILED" | "EXPIRED";
    switch (payload.status) {
      case "PAID":
      case "SETTLED":
        paymentStatus = "PAID";
        break;
      case "EXPIRED":
        paymentStatus = "EXPIRED";
        break;
      case "PENDING":
        paymentStatus = "PENDING";
        break;
      default:
        paymentStatus = "FAILED";
    }

    // Update payment status in database
    await updatePaymentStatus(payload.external_id, {
      payment_status: paymentStatus,
      payment_id: payload.id,
      payment_method: payload.payment_method,
      payment_channel: payload.payment_channel,
      paid_at: payload.paid_at,
    });

    // Broadcast payment status update to guest
    if (paymentStatus === "PAID") {
      await broadcastRoomStatus(order.room_id, {
        type: "payment-confirmed",
        order_id: order.id,
        status: "PAID",
      });

      console.log("Payment confirmed for order:", order.id);
    } else if (paymentStatus === "EXPIRED" || paymentStatus === "FAILED") {
      await broadcastRoomStatus(order.room_id, {
        type: "payment-failed",
        order_id: order.id,
        status: paymentStatus,
      });

      console.log("Payment failed/expired for order:", order.id);
    }

    // Return 200 OK to acknowledge receipt
    return NextResponse.json({
      success: true,
      order_id: order.id,
      payment_status: paymentStatus,
    });
  } catch (error) {
    console.error("Webhook processing error:", error);

    // Return 500 but don't expose internal error details
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Handle GET requests (for webhook verification in Xendit dashboard)
 */
export async function GET() {
  return NextResponse.json({
    message: "Xendit webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}
