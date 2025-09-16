import { createSupabaseServerClient } from "./server";

export const getServerSession = async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session ?? null;
};
