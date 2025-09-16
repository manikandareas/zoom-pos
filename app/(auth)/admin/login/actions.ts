"use server";

import { redirect } from "next/navigation";
import { adminLoginSchema } from "@/lib/validators/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface LoginResult {
  error?: string;
  success?: boolean;
}

export const loginAction = async (_prev: LoginResult, formData: FormData) => {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = adminLoginSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: "Email atau password tidak valid" } satisfies LoginResult;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: error.message } satisfies LoginResult;
  }

  const redirectTo = (formData.get("redirectTo") as string | null) ?? "/admin/orders";
  redirect(redirectTo);
};

export const logoutAction = async () => {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
};
