"use client";

import { useEffect } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useSupabase } from "@/components/providers/supabase-provider";
import type { Order } from "@/lib/supabase/types";

export type OrderChangeHandler = (
  payload: RealtimePostgresChangesPayload<Order>
) => void;

export const useOrdersRealtime = (handler: OrderChangeHandler) => {
  const { client } = useSupabase();

  useEffect(() => {
    const channel = client
      .channel("orders-board")
      .on<Order>(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => handler(payload)
      );

    channel.subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [client, handler]);
};
