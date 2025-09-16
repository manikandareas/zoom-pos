import { getSupabaseServiceRoleClient } from "./supabase/service";

interface BroadcastPayload {
  order_id: string;
  status: string;
  reason?: string | null;
}

export const broadcastRoomStatus = async (roomId: string, payload: BroadcastPayload) => {
  const client = getSupabaseServiceRoleClient();
  const channel = client.channel(`room:${roomId}`, {
    config: {
      broadcast: { ack: true },
    },
  });

  await channel.subscribe();

  const result = await channel.send({
    type: "broadcast",
    event: "order-status",
    payload,
  });

  if (result !== "ok") {
    console.error("Failed to emit broadcast", result);
  }

  await channel.unsubscribe();
};
