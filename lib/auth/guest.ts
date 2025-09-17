import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const ensureGuestSession = async () => {
	const cookieStore = await cookies();
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	if (!url || !anonKey) {
		throw new Error("Missing Supabase environment variables");
	}

	const supabase = createServerClient(url, anonKey, {
		cookies: {
			getAll() {
				return cookieStore.getAll();
			},
			setAll(cookiesToSet) {
				try {
					cookiesToSet.forEach(({ name, value, options }) =>
						cookieStore.set(name, value, options),
					);
				} catch {
					// The `setAll` method was called from a Server Component.
					// This can be ignored if you have middleware refreshing
					// user sessions.
				}
			},
		},
	});

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (user) {
		return user;
	}

	const { data, error } = await supabase.auth.signInAnonymously();
	if (error) {
		throw error;
	}

	return data.user;
};
