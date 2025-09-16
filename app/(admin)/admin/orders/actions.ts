"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/auth";
import { getOrderWithItems, getOrdersByRoom, updateOrderStatus } from "@/lib/data/orders";
import { markOrderBilled, markOrdersBilledByRoom } from "@/lib/data/billing";
import { broadcastRoomStatus } from "@/lib/realtime";
import type { OrderStatus } from "@/lib/supabase/types";

export const acceptOrderAction = async (orderId: string) => {
  await requireAdmin();

  const order = await getOrderWithItems(orderId);
  if (!order) {
    throw new Error("Order not found");
  }

  await updateOrderStatus(orderId, "ACCEPTED");
  await broadcastRoomStatus(order.room_id, {
    order_id: orderId,
    status: "ACCEPTED",
  });
  revalidatePath("/admin/orders");
};

export const rejectOrderAction = async (orderId: string, reason: string) => {
  await requireAdmin();

  const order = await getOrderWithItems(orderId);
  if (!order) {
    throw new Error("Order not found");
  }

  await updateOrderStatus(orderId, "REJECTED", reason);
  await broadcastRoomStatus(order.room_id, {
    order_id: orderId,
    status: "REJECTED",
    reason,
  });
  revalidatePath("/admin/orders");
};

export const updateOrderStatusAction = async (
  orderId: string,
  status: Extract<OrderStatus, "IN_PREP" | "READY" | "DELIVERED">
) => {
  await requireAdmin();

  const order = await getOrderWithItems(orderId);
  if (!order) {
    throw new Error("Order not found");
  }

  await updateOrderStatus(orderId, status);
  await broadcastRoomStatus(order.room_id, {
    order_id: orderId,
    status,
  });
  revalidatePath("/admin/orders");
};

export const markAsBilledAction = async (params: { orderId?: string; roomId?: string }) => {
  await requireAdmin();

  if (params.orderId) {
    const order = await getOrderWithItems(params.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    await markOrderBilled(params.orderId);
  await broadcastRoomStatus(order.room_id, {
    order_id: params.orderId,
    status: "BILLED",
  });
    revalidatePath("/admin/orders");
    revalidatePath("/admin/billing");
    return;
  }

  if (params.roomId) {
    const orders = await getOrdersByRoom(params.roomId, {
      excludeStatus: ["BILLED"],
    });

    if (!orders.length) {
      return;
    }

    await markOrdersBilledByRoom(params.roomId);

    await Promise.all(
      orders.map((order) =>
        broadcastRoomStatus(order.room_id, {
          order_id: order.id,
          status: "BILLED",
        })
      )
    );

    revalidatePath("/admin/orders");
    revalidatePath("/admin/billing");
    return;
  }

  throw new Error("Invalid parameters");
};
