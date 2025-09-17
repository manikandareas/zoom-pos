import { notFound } from "next/navigation";
import { GuestOrderClient } from "@/components/order/guest-order-client";
import { ensureGuestSession } from "@/lib/auth/guest";
import { getActiveMenuCatalog } from "@/lib/data/menu";
import { getGuestOrders } from "@/lib/data/orders";
import { getRoomByCode } from "@/lib/data/rooms";

interface OrderPageProps {
	params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: OrderPageProps) {
	const { code } = await params;
	const roomData = await getRoomByCode(code);
	if (!roomData) {
		return {
			title: "Pesanan - Hotel Zoom",
			description: "Pesan makanan dari kamar hotel dengan mudah.",
		};
	}

	return {
		title: `Pesan kamar ${roomData.room.number} - ${roomData.room.label}`,
		description: "Pesan makanan dari kamar hotel dengan mudah.",
	};
}

export default async function OrderCodePage({ params }: OrderPageProps) {
	const { code } = await params;
	const guest = await ensureGuestSession();
	const roomData = await getRoomByCode(code);

	if (!roomData || !guest) {
		notFound();
	}

	const categories = await getActiveMenuCatalog();
	const orders = await getGuestOrders(guest.id, roomData.room.id);

	return (
		<GuestOrderClient
			guestId={guest.id}
			room={{
				id: roomData.room.id,
				label: roomData.room.label,
				number: roomData.room.number,
			}}
			roomCode={code}
			categories={categories}
			existingOrders={orders.map((order) => ({
				...order,
				items: order.items,
			}))}
		/>
	);
}
