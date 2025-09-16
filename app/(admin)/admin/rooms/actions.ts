"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/auth";
import { roomFormSchema, roomCodeFormSchema, type RoomFormInput, type RoomCodeFormInput } from "@/lib/validators/rooms";
import { deleteRoom, deleteRoomCode, upsertRoom, upsertRoomCode } from "@/lib/data/rooms-admin";

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
