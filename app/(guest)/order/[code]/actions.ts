"use server";

import { ensureGuestSession } from "@/lib/auth/guest";
import { createGuestOrder } from "@/lib/data/orders";
import { getRoomByCode } from "@/lib/data/rooms";
import { createOrderSchema } from "@/lib/validators/order";

export interface SubmitOrderResult {
  success?: boolean;
  orderId?: string;
  error?: string;
}

export const submitOrderAction = async (
  _prev: SubmitOrderResult,
  formData: FormData
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
    const orderPayload = {
      room_id: parsed.data.room_id,
      note: parsed.data.note ?? undefined,
      items: parsed.data.items.map((item) => ({
        ...item,
        note: item.note ?? undefined,
      })),
    };
    const orderId = await createGuestOrder(guest.id, orderPayload);
    return { success: true, orderId };
  } catch (error) {
    console.error(error);
    return { error: "Gagal membuat order" };
  }
};
