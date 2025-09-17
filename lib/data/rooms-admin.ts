import "server-only";

import { getSupabaseServiceRoleClient } from "../supabase/service";
import type { Room, RoomCode } from "../supabase/types";

export const listRooms = async (): Promise<Room[]> => {
  const service = getSupabaseServiceRoleClient();
  const { data, error } = await service
    .from("rooms")
    .select("id, label, number, is_active, created_at, updated_at")
    .order("number", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Room[];
};

export const upsertRoom = async (room: Partial<Room>) => {
  const service = getSupabaseServiceRoleClient();
  const { data, error } = await service
    .from("rooms")
    .upsert(room, { onConflict: "id" })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data?.id as string;
};

export const deleteRoom = async (roomId: string) => {
  const service = getSupabaseServiceRoleClient();
  const { error } = await service.from("rooms").delete().eq("id", roomId);

  if (error) {
    throw error;
  }
};

export const listRoomCodes = async (): Promise<RoomCode[]> => {
  const service = getSupabaseServiceRoleClient();
  const { data, error } = await service
    .from("room_codes")
    .select("id, room_id, code, is_active, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as RoomCode[];
};

export const upsertRoomCode = async (code: Partial<RoomCode>) => {
  const service = getSupabaseServiceRoleClient();
  const { data, error } = await service
    .from("room_codes")
    .upsert(code, { onConflict: "id" })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data?.id as string;
};

export const deleteRoomCode = async (codeId: string) => {
  const service = getSupabaseServiceRoleClient();
  const { error } = await service.from("room_codes").delete().eq("id", codeId);

  if (error) {
    throw error;
  }
};

export const createRoomCode = async (input: {
  room_id: string;
  code: string;
  is_active?: boolean;
}) => {
  const service = getSupabaseServiceRoleClient();
  const { data, error } = await service
    .from("room_codes")
    .insert({
      room_id: input.room_id,
      code: input.code,
      is_active: input.is_active ?? true,
    })
    .select("id, room_id, code, is_active, created_at")
    .single();

  if (error) {
    throw error;
  }

  return data as RoomCode;
};
