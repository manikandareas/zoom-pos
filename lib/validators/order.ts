import { z } from "zod";

export const orderItemSchema = z.object({
  menu_item_id: z.string().uuid(),
  menu_item_name: z.string().min(1),
  unit_price: z.number().nonnegative(),
  quantity: z.number().int().positive(),
  note: z.string().max(200).optional().nullable(),
});

export const createOrderSchema = z.object({
  room_id: z.string().uuid(),
  room_code: z.string().min(3).max(64),
  note: z.string().max(200).optional().nullable(),
  items: z.array(orderItemSchema).min(1),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
