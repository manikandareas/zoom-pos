"use client";

import { useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { useSupabase } from "./supabase-provider";

interface SupabaseListenerProps {
  serverAccessToken?: string;
}

export const SupabaseListener = ({ serverAccessToken }: SupabaseListenerProps) => {
  const { client } = useSupabase();

  useEffect(() => {
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(async (event, session) => {
      if (session?.access_token === serverAccessToken) {
        return;
      }

      await fetch("/auth/callback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ event, session }),
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [client, serverAccessToken]);

  return null;
};
