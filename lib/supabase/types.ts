export type OrderStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "IN_PREP"
  | "READY"
  | "DELIVERED"
  | "BILLED";

export interface Room {
  id: string;
  label: string;
  number: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoomCode {
  id: string;
  room_id: string;
  code: string;
  is_active: boolean;
  created_at: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  price: number;
  is_available: boolean;
  image_url: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  room_id: string;
  guest_id: string;
  status: OrderStatus;
  note: string | null;
  sub_total: number;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  menu_item_name: string;
  unit_price: number;
  quantity: number;
  note: string | null;
  created_at: string;
}

export interface Profile {
  user_id: string;
  role: string;
}

export interface BillingSummaryRow {
  order_id: string;
  room_label: string;
  room_number: string;
  guest_id: string;
  sub_total: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
}

export interface MenuWithCategory extends MenuItem {
  category: MenuCategory;
}

export interface OrderWithItems extends Order {
  room: Room;
  items: OrderItem[];
}
