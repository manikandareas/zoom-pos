import { RoomsManager } from "@/components/admin/rooms-manager";
import { listRoomCodes, listRooms } from "@/lib/data/rooms-admin";

export const metadata = {
	title: "Rooms - Hotel Zoom",
};

export default async function AdminRoomsPage() {
	const [rooms, codes] = await Promise.all([listRooms(), listRoomCodes()]);
	return <RoomsManager rooms={rooms} codes={codes} />;
}
