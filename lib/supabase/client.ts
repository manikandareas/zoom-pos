"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

export const createSupabaseBrowserClient = (): SupabaseClient => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing Supabase client environment variables");
  }

  return createBrowserClient(url, anonKey);
};
