import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Session } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.json({ error: "Missing Supabase configuration" }, { status: 500 });
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set(name, value, options) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name, options) {
        cookieStore.delete({ name, ...options });
      },
    },
  });

  const { event, session }: { event: string; session: Session | null } = await request.json();

  if (session) {
    await supabase.auth.setSession(session);
  }

  if (event === "SIGNED_OUT") {
    await supabase.auth.signOut();
  }

  return NextResponse.json({ status: "ok" });
}
