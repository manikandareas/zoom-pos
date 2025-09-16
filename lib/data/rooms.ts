import "server-only";

import { getSupabaseServiceRoleClient } from "../supabase/service";
import type { Room, RoomCode } from "../supabase/types";

export interface RoomWithCodes extends Room {
  codes: RoomCode[];
}

export const getRoomByCode = async (code: string) => {
  const service = getSupabaseServiceRoleClient();
  const { data, error } = await service
    .from("room_codes")
    .select(
      `id, code, is_active, created_at, room:rooms ( id, label, number, is_active, created_at, updated_at )`
    )
    .eq("code", code)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data || !data.room?.is_active || !data.is_active) {
    return null;
  }

  return {
    room: data.room as Room,
    code: {
      id: data.id,
      room_id: (data.room as Room).id,
      code: data.code,
      is_active: data.is_active,
      created_at: data.created_at,
    } satisfies RoomCode,
  };
};

export const getRoomsWithCodes = async (): Promise<RoomWithCodes[]> => {
  const service = getSupabaseServiceRoleClient();
  const { data, error } = await service
    .from("rooms")
    .select(
      `id, label, number, is_active, created_at, updated_at,
       room_codes ( id, room_id, code, is_active, created_at )`
    )
    .order("number", { ascending: true })
    .order("created_at", { ascending: true, foreignTable: "room_codes" });

  if (error) {
    throw error;
  }

  return (
    data ?? []
  ).map((room) => ({
    ...(room as Room),
    codes: (room.room_codes as RoomCode[] | null) ?? [],
  }));
};
