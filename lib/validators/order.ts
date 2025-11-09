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
  guest_phone: z
    .string()
    .regex(/^(\+62|62|0)[0-9]{9,12}$/, "Format nomor telepon tidak valid")
    .optional()
    .nullable()
    .or(z.literal("")),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
