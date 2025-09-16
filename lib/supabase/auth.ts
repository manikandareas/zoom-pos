import { createSupabaseServerClient } from "./server";
import type { Profile } from "./types";

export interface SessionUser {
  id: string;
  email?: string;
}

export interface AuthContext {
  user: SessionUser | null;
  profile: Profile | null;
}

export const getAuthContext = async (): Promise<AuthContext> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    user: { id: user.id, email: user.email ?? undefined },
    profile: profile ?? null,
  };
};

export const requireAdmin = async () => {
  const { user, profile } = await getAuthContext();

  if (!user) {
    throw new Error("Unauthorized");
  }

  if (!profile || profile.role !== "admin") {
    throw new Error("Forbidden");
  }

  return { user, profile };
};
