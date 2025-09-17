import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	/* config options here */
	images: {
		remotePatterns: [
			{
				hostname: "bkkdjtnhuawcoerqqxqe.supabase.co",
				protocol: "https",
			},
			{
				hostname: "api.qrserver.com",
				protocol: "https",
			},
		],
	},
};

export default nextConfig;
