import { z } from "zod";

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
