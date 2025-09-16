"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface SupabaseProviderValue {
  client: SupabaseClient;
  session: Session | null;
}

const SupabaseContext = createContext<SupabaseProviderValue | undefined>(
  undefined
);

export const useSupabase = () => {
  const ctx = useContext(SupabaseContext);
  if (!ctx) {
    throw new Error("SupabaseProvider is missing in the component tree");
  }
  return ctx;
};

interface SupabaseProviderProps {
  initialSession: Session | null;
  children: ReactNode;
}

export const SupabaseProvider = ({
  initialSession,
  children,
}: SupabaseProviderProps) => {
  const [session, setSession] = useState<Session | null>(initialSession);

  const client = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [client]);

  const value = useMemo(() => ({ client, session }), [client, session]);

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
};
