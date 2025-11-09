"use server";

import { ensureGuestSession } from "@/lib/auth/guest";
import { getRoomByCode } from "@/lib/data/rooms";
import { createOrderSchema } from "@/lib/validators/order";
import {
  createPaymentIntent,
  updatePaymentInfo,
  checkExternalIdExists,
} from "@/lib/data/payments";
import { createXenditInvoice } from "@/lib/xendit/client";
import type { PaymentMethod } from "@/lib/xendit/types";
import { randomBytes } from "crypto";

export interface SubmitOrderResult {
  success?: boolean;
  orderId?: string;
  paymentUrl?: string;
  error?: string;
}

export const submitOrderAction = async (
  _prev: SubmitOrderResult,
  formData: FormData,
): Promise<SubmitOrderResult> => {
  const payloadRaw = formData.get("payload");

  if (typeof payloadRaw !== "string") {
    return { error: "Order payload tidak valid" };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(payloadRaw);
  } catch (_err) {
    return { error: "Payload tidak bisa diproses" };
  }

  const parsed = createOrderSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return { error: "Data order tidak valid" };
  }

  const guest = await ensureGuestSession();
  if (!guest) {
    return { error: "Sesi tamu tidak ditemukan" };
  }

  const roomData = await getRoomByCode(parsed.data.room_code);
  if (!roomData || roomData.room.id !== parsed.data.room_id) {
    return { error: "Kamar tidak valid" };
  }

  try {
    // Calculate subtotal
    const subTotal = parsed.data.items.reduce(
      (acc, item) => acc + item.unit_price * item.quantity,
      0,
    );

    // Generate unique external_id for idempotency
    const timestamp = Date.now();
    const randomSuffix = randomBytes(4).toString("hex");
    const external_id = `order-${timestamp}-${randomSuffix}`;

    // Check if external_id already exists (unlikely but prevent duplicates)
    const exists = await checkExternalIdExists(external_id);
    if (exists) {
      return { error: "Terjadi kesalahan, silakan coba lagi" };
    }

    // Define payment methods to accept
    const paymentMethods: PaymentMethod[] = [
      "QRIS",
      "VIRTUAL_ACCOUNT",
      "EWALLET",
    ];

    // Normalize phone number if provided
    let normalizedPhone: string | undefined;
    if (parsed.data.guest_phone) {
      const phone = parsed.data.guest_phone.trim();
      if (phone && phone !== "") {
        // Convert to +62 format
        if (phone.startsWith("0")) {
          normalizedPhone = `+62${phone.substring(1)}`;
        } else if (phone.startsWith("62")) {
          normalizedPhone = `+${phone}`;
        } else if (phone.startsWith("+62")) {
          normalizedPhone = phone;
        } else {
          normalizedPhone = `+62${phone}`;
        }
      }
    }

    // Create payment intent and order record
    const orderId = await createPaymentIntent({
      room_id: parsed.data.room_id,
      guest_id: guest.id,
      sub_total: subTotal,
      external_id,
      payment_methods: paymentMethods,
      guest_phone: normalizedPhone,
      note: parsed.data.note ?? undefined,
      items: parsed.data.items.map((item) => ({
        menu_item_id: item.menu_item_id,
        menu_item_name: item.menu_item_name,
        unit_price: item.unit_price,
        quantity: item.quantity,
        note: item.note ?? undefined,
      })),
    });

    // Create Xendit invoice
    console.log("[Order] Creating Xendit invoice for order:", orderId);
    const invoice = await createXenditInvoice({
      external_id,
      amount: subTotal,
      payment_methods: paymentMethods,
      customer_phone: normalizedPhone,
      items: parsed.data.items.map((item) => ({
        name: item.menu_item_name,
        quantity: item.quantity,
        price: item.unit_price,
      })),
    });

    console.log("[Order] Xendit invoice created:", {
      invoiceId: invoice.id,
      hasInvoiceUrl: !!invoice.invoice_url,
      invoiceUrlLength: invoice.invoice_url?.length,
    });

    // Update order with payment information
    try {
      await updatePaymentInfo(
        orderId,
        invoice.id,
        invoice.invoice_url,
        paymentMethods,
      );
    } catch (error) {
      console.error(
        "[Order] Failed to update payment info, but invoice created:",
        error,
      );
      // Continue anyway - invoice already created and URL available
    }

    console.log("[Order] Returning payment URL to client");

    return {
      success: true,
      orderId,
      paymentUrl: invoice.invoice_url,
    };
  } catch (error) {
    console.error("Failed to create order with payment:", error);
    return { error: "Gagal membuat order. Silakan coba lagi." };
  }
};
