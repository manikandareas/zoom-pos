import "server-only";

import { createSupabaseServerClient } from "../supabase/server";
import { getSupabaseServiceRoleClient } from "../supabase/service";
import type {
  Order,
  OrderItem,
  OrderStatus,
  OrderWithItems,
  Room,
} from "../supabase/types";

export interface OrderItemInput {
  menu_item_id: string;
  quantity: number;
  note?: string;
  menu_item_name: string;
  unit_price: number;
}

export interface CreateOrderPayload {
  room_id: string;
  note?: string;
  items: OrderItemInput[];
}

export interface AdminOrderFilter {
  status?: OrderStatus | "ALL";
  roomId?: string;
  search?: string;
}

export interface AdminOrderRow extends Order {
  room: Room;
  items: OrderItem[];
}

export const getOrdersByRoom = async (
  roomId: string,
  opts: { excludeStatus?: OrderStatus[] } = {}
): Promise<Order[]> => {
  const service = getSupabaseServiceRoleClient();
  let query = service
    .from("orders")
    .select(
      "id, room_id, guest_id, status, note, sub_total, rejection_reason, created_at, updated_at"
    )
    .eq("room_id", roomId);

  if (opts.excludeStatus?.length) {
    for (const status of opts.excludeStatus) {
      query = query.neq("status", status);
    }
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as Order[];
};

export const getGuestOrders = async (
  guestId: string,
  roomId: string
): Promise<(Order & { items: OrderItem[] })[]> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      `id, room_id, guest_id, status, note, sub_total, rejection_reason, created_at, updated_at,
       items:order_items ( id, order_id, menu_item_id, menu_item_name, unit_price, quantity, note, created_at )`
    )
    .eq("guest_id", guestId)
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((order) => ({
    ...(order as Order),
    items: (order.items as OrderItem[] | null) ?? [],
  }));
};

export const getOrderWithItems = async (orderId: string): Promise<OrderWithItems | null> => {
  const service = getSupabaseServiceRoleClient();
  const { data, error } = await service
    .from("orders")
    .select(
      `id, room_id, guest_id, status, note, sub_total, rejection_reason, created_at, updated_at,
       room:rooms ( id, label, number, is_active, deleted_at, created_at, updated_at ),
       items:order_items ( id, order_id, menu_item_id, menu_item_name, unit_price, quantity, note, created_at )`
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const relatedRoom = Array.isArray(data.room) ? data.room[0] : data.room;
  const room: Room = relatedRoom
    ? (relatedRoom as Room)
    : {
        id: data.room_id,
        label: "",
        number: "",
        is_active: true,
        deleted_at: null,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

  return {
    ...(data as Order),
    room,
    items: (data.items as OrderItem[] | null) ?? [],
  };
};

export const createGuestOrder = async (guestId: string, payload: CreateOrderPayload) => {
  if (!payload.items.length) {
    throw new Error("Order requires at least one item");
  }

  const supabase = await createSupabaseServerClient();

  const subTotal = payload.items.reduce(
    (acc, item) => acc + item.unit_price * item.quantity,
    0
  );

  const { data, error } = await supabase
    .from("orders")
    .insert({
      room_id: payload.room_id,
      guest_id: guestId,
      note: payload.note ?? null,
      sub_total: subTotal,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  const orderId = data.id as string;

  const { error: orderItemsError } = await supabase.from("order_items").insert(
    payload.items.map((item) => ({
      order_id: orderId,
      menu_item_id: item.menu_item_id,
      menu_item_name: item.menu_item_name,
      unit_price: item.unit_price,
      quantity: item.quantity,
      note: item.note ?? null,
    }))
  );

  if (orderItemsError) {
    throw orderItemsError;
  }

  return orderId;
};

export const getAdminOrders = async (
  filters: AdminOrderFilter = {}
): Promise<AdminOrderRow[]> => {
  const service = getSupabaseServiceRoleClient();

  let query = service
    .from("orders")
    .select(
      `id, room_id, guest_id, status, note, sub_total, rejection_reason, created_at, updated_at,
       room:rooms ( id, label, number, is_active, deleted_at, created_at, updated_at ),
       items:order_items ( id, order_id, menu_item_id, menu_item_name, unit_price, quantity, note, created_at )`
    )
    .order("created_at", { ascending: false });

  if (filters.status && filters.status !== "ALL") {
    query = query.eq("status", filters.status);
  }

  if (filters.roomId) {
    query = query.eq("room_id", filters.roomId);
  }

  if (filters.search) {
    query = query.or(
      `note.ilike.%${filters.search}%,rejection_reason.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map((order) => {
    const relatedRoom = Array.isArray(order.room) ? order.room[0] : order.room;
    const room: Room = relatedRoom
      ? (relatedRoom as Room)
      : {
          id: order.room_id,
          label: "",
          number: "",
          is_active: true,
          deleted_at: null,
          created_at: order.created_at,
          updated_at: order.updated_at,
        };
    return {
      ...(order as Order),
      room,
      items: (order.items as OrderItem[] | null) ?? [],
    };
  });
};

export const updateOrderStatus = async (
  orderId: string,
  status: OrderStatus,
  rejectionReason?: string | null
) => {
  const service = getSupabaseServiceRoleClient();
  const { error } = await service
    .from("orders")
    .update({ status, rejection_reason: rejectionReason ?? null })
    .eq("id", orderId);

  if (error) {
    throw error;
  }

};
