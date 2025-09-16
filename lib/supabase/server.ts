import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const createSupabaseServerClient = async (): Promise<SupabaseClient> => {
	const cookieStore = await cookies();
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	if (!url || !anonKey) {
		throw new Error("Missing Supabase server environment variables");
	}

	return createServerClient(url, anonKey, {
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
};
