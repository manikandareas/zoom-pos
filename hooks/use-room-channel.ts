"use client";

import { useEffect } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useSupabase } from "@/components/providers/supabase-provider";

interface RoomChannelPayload {
  type?: string;
  order_id: string;
  status: string;
  reason?: string | null;
}

export const useRoomChannel = (
  roomId: string | null,
  handler: (payload: RoomChannelPayload) => void,
) => {
  const { client } = useSupabase();

  useEffect(() => {
    if (!roomId) return;

    const channel: RealtimeChannel = client.channel(`room:${roomId}`);

    // Listen for order status updates
    channel.on("broadcast", { event: "order-status" }, ({ payload }) => {
      handler(payload as RoomChannelPayload);
    });

    // Listen for payment status updates
    channel.on("broadcast", { event: "payment-status" }, ({ payload }) => {
      handler(payload as RoomChannelPayload);
    });

    channel.subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [client, handler, roomId]);
};
