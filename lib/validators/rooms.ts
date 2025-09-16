import { z } from "zod";

export const roomFormSchema = z.object({
	id: z.string().uuid().optional(),
	label: z.string().min(1).max(120),
	number: z.string().min(1).max(20),
	is_active: z.boolean(),
});

export const roomCodeFormSchema = z.object({
	id: z.string().uuid().optional(),
	room_id: z.string().uuid(),
	code: z.string().min(3).max(32),
	is_active: z.boolean(),
});

export type RoomFormInput = z.infer<typeof roomFormSchema>;
export type RoomCodeFormInput = z.infer<typeof roomCodeFormSchema>;
