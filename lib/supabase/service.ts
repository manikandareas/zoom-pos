import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";

let cachedServiceClient: SupabaseClient | null = null;

export const getSupabaseServiceRoleClient = (): SupabaseClient => {
	if (cachedServiceClient) {
		return cachedServiceClient;
	}

	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!url || !serviceRoleKey) {
		throw new Error("Missing Supabase service role environment variables");
	}

	cachedServiceClient = createClient(url, serviceRoleKey, {
		auth: {
			persistSession: false,
			autoRefreshToken: false,
		},
	});

	return cachedServiceClient;
};
