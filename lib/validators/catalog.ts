import { z } from "zod";

export const categoryFormSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(100),
  position: z.number().int().nonnegative().default(0),
  is_active: z.boolean().default(true),
});

export const menuItemFormSchema = z.object({
  id: z.string().uuid().optional(),
  category_id: z.string().uuid(),
  name: z.string().min(2).max(120),
  price: z.number().nonnegative(),
  is_available: z.boolean().default(true),
  image_url: z.string().url().nullable().optional(),
  position: z.number().int().nonnegative().default(0),
});

export type CategoryFormInput = z.infer<typeof categoryFormSchema>;
export type MenuItemFormInput = z.infer<typeof menuItemFormSchema>;
