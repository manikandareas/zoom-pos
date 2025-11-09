import { getSupabaseServiceRoleClient } from "./supabase/service";

interface BroadcastPayload {
  type?: string;
  order_id: string;
  status: string;
  reason?: string | null;
}

export const broadcastRoomStatus = async (
  roomId: string,
  payload: BroadcastPayload,
) => {
  const client = getSupabaseServiceRoleClient();
  const channel = client.channel(`room:${roomId}`, {
    config: {
      broadcast: { ack: true },
    },
  });

  await channel.subscribe();

  // Use "payment-status" event for payment updates, "order-status" for order updates
  const event = payload.type?.includes("payment")
    ? "payment-status"
    : "order-status";

  const result = await channel.send({
    type: "broadcast",
    event,
    payload,
  });

  if (result !== "ok") {
    console.error("Failed to emit broadcast", result);
  }

  await channel.unsubscribe();
};
