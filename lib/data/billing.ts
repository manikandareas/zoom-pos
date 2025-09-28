import "server-only";

import { createSupabaseServerClient } from "../supabase/server";
import { getSupabaseServiceRoleClient } from "../supabase/service";
import type { BillingSummaryRow, OrderStatus } from "../supabase/types";

export interface RoomBillingSummary {
  room_id: string;
  room_label: string;
  room_number: string;
  order_count: number;
  delivered_count: number;
  total_amount: number;
}

export const getUnbilledOrdersByRoom = async (): Promise<RoomBillingSummary[]> => {
  const service = getSupabaseServiceRoleClient();

  const { data, error } = await service
    .from("orders")
    .select(
      `room_id, room:rooms ( id, label, number ), status, sub_total`
    )
    .neq("status", "BILLED");

  if (error) {
    throw error;
  }

  const summaryMap = new Map<string, RoomBillingSummary>();

  for (const row of data ?? []) {
    const room = Array.isArray(row.room) ? row.room[0] : row.room;
    if (!room) continue;

    const current = summaryMap.get(row.room_id) ?? {
      room_id: room.id,
      room_label: room.label,
      room_number: room.number,
      order_count: 0,
      delivered_count: 0,
      total_amount: 0,
    };

    current.order_count += 1;
    if (row.status === "DELIVERED") {
      current.delivered_count += 1;
    }
    current.total_amount += Number(row.sub_total ?? 0);

    summaryMap.set(row.room_id, current);
  }

  return Array.from(summaryMap.values()).sort((a, b) =>
    a.room_number.localeCompare(b.room_number)
  );
};

export const getBillingRows = async (
  status: OrderStatus | "ALL" = "ALL"
): Promise<BillingSummaryRow[]> => {
  const service = getSupabaseServiceRoleClient();
  let query = service
    .from("orders")
    .select(
      `id, room_id, guest_id, status, sub_total, note, rejection_reason, created_at, updated_at,
       room:rooms ( label, number )`
    )
    .order("created_at", { ascending: true });

  if (status !== "ALL") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map((order) => {
    const room = Array.isArray(order.room) ? order.room[0] : order.room;
    return {
      order_id: order.id,
      room_id: order.room_id,
      room_label: room?.label ?? "",
      room_number: room?.number ?? "",
      guest_id: order.guest_id,
      sub_total: Number(order.sub_total ?? 0),
      status: order.status,
      created_at: order.created_at,
      updated_at: order.updated_at,
    } satisfies BillingSummaryRow;
  });
};

export const markOrdersBilledByRoom = async (roomId: string) => {
  const service = getSupabaseServiceRoleClient();
  const { error } = await service
    .from("orders")
    .update({ status: "BILLED" })
    .eq("room_id", roomId)
    .neq("status", "BILLED");

  if (error) {
    throw error;
  }
};

export const markOrderBilled = async (orderId: string) => {
  const service = getSupabaseServiceRoleClient();
  const { error } = await service
    .from("orders")
    .update({ status: "BILLED" })
    .eq("id", orderId);

  if (error) {
    throw error;
  }
};
