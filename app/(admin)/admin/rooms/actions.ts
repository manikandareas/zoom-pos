"use server";

import { randomInt } from "crypto";
import { revalidatePath } from "next/cache";
import {
	createRoomCode,
	deleteRoom,
	deleteRoomCode,
	upsertRoom,
	upsertRoomCode,
} from "@/lib/data/rooms-admin";
import { requireAdmin } from "@/lib/supabase/auth";
import {
	type RoomCodeFormInput,
	type RoomFormInput,
	roomCodeFormSchema,
	roomFormSchema,
} from "@/lib/validators/rooms";

const CODE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

const generateRandomRoomCode = () => {
	let value = "";
	for (let i = 0; i < CODE_LENGTH; i += 1) {
		const randomIndex = randomInt(0, CODE_CHARSET.length);
		value += CODE_CHARSET[randomIndex];
	}
	return value;
};

const isUniqueViolation = (error: unknown) => {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as { code?: string }).code === "23505"
	);
};

export const upsertRoomAction = async (input: RoomFormInput) => {
	await requireAdmin();
	const parsed = roomFormSchema.safeParse(input);
	if (!parsed.success) {
		return { error: "Data kamar tidak valid" };
	}

	await upsertRoom(parsed.data);
	revalidatePath("/admin/rooms");
	return { success: true };
};

export const deleteRoomAction = async (roomId: string) => {
	await requireAdmin();
	await deleteRoom(roomId);
	revalidatePath("/admin/rooms");
};

export const upsertRoomCodeAction = async (input: RoomCodeFormInput) => {
	await requireAdmin();
	const parsed = roomCodeFormSchema.safeParse(input);
	if (!parsed.success) {
		return { error: "Data kode kamar tidak valid" };
	}

	await upsertRoomCode(parsed.data);
	revalidatePath("/admin/rooms");
	return { success: true };
};

export const deleteRoomCodeAction = async (codeId: string) => {
	await requireAdmin();
	await deleteRoomCode(codeId);
	revalidatePath("/admin/rooms");
};

export const generateRoomCodeAction = async (roomId: string) => {
	await requireAdmin();

	try {
		roomCodeFormSchema.shape.room_id.parse(roomId);
	} catch {
		return { error: "ID kamar tidak valid" };
	}

	for (let attempt = 0; attempt < 5; attempt += 1) {
		const code = generateRandomRoomCode();
		try {
			const created = await createRoomCode({
				room_id: roomId,
				code,
			});
			revalidatePath("/admin/rooms");
			return { success: true, code: created.code };
		} catch (error) {
			if (isUniqueViolation(error)) {
				continue;
			}
			console.error("generateRoomCodeAction", error);
			return { error: "Gagal membuat kode kamar" };
		}
	}

	return {
		error: "Tidak dapat membuat kode unik, coba lagi.",
	};
};
