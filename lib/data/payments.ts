import "server-only";

import { createSupabaseServerClient } from "../supabase/server";
import { getSupabaseServiceRoleClient } from "../supabase/service";
import type { PaymentMethod, PaymentStatus } from "../xendit/types";

export interface CreatePaymentIntentPayload {
  room_id: string;
  guest_id: string;
  sub_total: number;
  external_id: string;
  payment_methods: PaymentMethod[];
  guest_phone?: string;
  note?: string;
  items: Array<{
    menu_item_id: string;
    menu_item_name: string;
    unit_price: number;
    quantity: number;
    note?: string;
  }>;
}

export interface UpdatePaymentPayload {
  payment_status: PaymentStatus;
  payment_id: string;
  payment_method?: string;
  payment_channel?: string;
  paid_at?: string;
}

/**
 * Create payment intent and order record (before payment)
 * Order created with PENDING status and payment_status PENDING
 */
export async function createPaymentIntent(
  payload: CreatePaymentIntentPayload,
): Promise<string> {
  if (!payload.items.length) {
    throw new Error("Order requires at least one item");
  }

  const supabase = await createSupabaseServerClient();

  // Insert order with payment fields
  const { data, error } = await supabase
    .from("orders")
    .insert({
      room_id: payload.room_id,
      guest_id: payload.guest_id,
      note: payload.note ?? null,
      sub_total: payload.sub_total,
      status: "PENDING", // Order status stays PENDING until admin accepts
      payment_status: "PENDING", // Payment not yet confirmed
      external_id: payload.external_id,
      guest_phone: payload.guest_phone ?? null,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  const orderId = data.id as string;

  // Insert order items
  const { error: orderItemsError } = await supabase.from("order_items").insert(
    payload.items.map((item) => ({
      order_id: orderId,
      menu_item_id: item.menu_item_id,
      menu_item_name: item.menu_item_name,
      unit_price: item.unit_price,
      quantity: item.quantity,
      note: item.note ?? null,
    })),
  );

  if (orderItemsError) {
    throw orderItemsError;
  }

  return orderId;
}

/**
 * Update payment information after invoice created
 * Uses service role client because guest users don't have UPDATE permission
 */
export async function updatePaymentInfo(
  orderId: string,
  paymentId: string,
  paymentUrl: string,
  paymentMethods: PaymentMethod[],
): Promise<void> {
  // Use service role client to bypass RLS - guest users can't update orders
  const service = getSupabaseServiceRoleClient();

  const { error } = await service
    .from("orders")
    .update({
      payment_id: paymentId,
      payment_url: paymentUrl,
      payment_method: paymentMethods[0], // Store primary payment method
    })
    .eq("id", orderId);

  if (error) {
    console.error("Failed to update payment info:", error);
    throw error;
  }

  console.log("[Payment] Payment info updated successfully:", {
    orderId,
    paymentId,
    hasPaymentUrl: !!paymentUrl,
  });
}

/**
 * Update payment status from webhook
 */
export async function updatePaymentStatus(
  externalId: string,
  payload: UpdatePaymentPayload,
): Promise<string | null> {
  const service = getSupabaseServiceRoleClient();

  const { data, error } = await service
    .from("orders")
    .update({
      payment_status: payload.payment_status,
      payment_method: payload.payment_method ?? null,
      paid_at: payload.paid_at ?? null,
    })
    .eq("external_id", externalId)
    .select("id, room_id")
    .single();

  if (error) {
    console.error("Failed to update payment status:", error);
    throw error;
  }

  return data ? (data.id as string) : null;
}

/**
 * Get order by external_id (for webhook processing)
 */
export async function getOrderByExternalId(externalId: string) {
  const service = getSupabaseServiceRoleClient();

  const { data, error } = await service
    .from("orders")
    .select("id, room_id, guest_id, payment_status, sub_total")
    .eq("external_id", externalId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Get payment status for an order
 */
export async function getPaymentStatus(orderId: string) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, payment_status, payment_method, payment_id, payment_url, paid_at, external_id",
    )
    .eq("id", orderId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Mark payment as expired (for cleanup)
 */
export async function markPaymentExpired(orderId: string): Promise<void> {
  const service = getSupabaseServiceRoleClient();

  const { error } = await service
    .from("orders")
    .update({
      payment_status: "EXPIRED",
    })
    .eq("id", orderId);

  if (error) {
    throw error;
  }
}

/**
 * Check if external_id already exists (for idempotency)
 */
export async function checkExternalIdExists(
  externalId: string,
): Promise<boolean> {
  const service = getSupabaseServiceRoleClient();

  const { data, error } = await service
    .from("orders")
    .select("id")
    .eq("external_id", externalId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return !!data;
}
