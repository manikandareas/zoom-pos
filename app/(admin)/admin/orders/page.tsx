import { OrdersBoard } from "@/components/admin/orders-board";
import { getAdminOrders } from "@/lib/data/orders";
import { getRoomsWithCodes } from "@/lib/data/rooms";

export const metadata = {
  title: "Order Board - Hotel Zoom",
};

export default async function AdminOrdersPage() {
  const [orders, roomsWithCodes] = await Promise.all([
    getAdminOrders(),
    getRoomsWithCodes(),
  ]);

  return <OrdersBoard orders={orders} rooms={roomsWithCodes.map(({ codes, ...room }) => room)} />;
}
