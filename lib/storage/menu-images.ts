import "server-only";

import { randomUUID } from "crypto";
import { getSupabaseServiceRoleClient } from "../supabase/service";

const BUCKET = "menu-images";

export const createMenuImageUploadUrl = async () => {
  const service = getSupabaseServiceRoleClient();
  const path = `${randomUUID()}.webp`;

  const { data, error } = await service.storage
    .from(BUCKET)
    .createSignedUploadUrl(path, {
      upsert: true,
    });

  if (error) {
    throw error;
  }

  return {
    path,
    signedUrl: data.signedUrl,
    token: data.token,
  };
};

export const getPublicImageUrl = (path: string) => {
  const service = getSupabaseServiceRoleClient();
  const {
    data: { publicUrl },
  } = service.storage.from(BUCKET).getPublicUrl(path);

  return publicUrl;
};

export const deleteMenuImage = async (path: string) => {
  const service = getSupabaseServiceRoleClient();
  const { error } = await service.storage.from(BUCKET).remove([path]);

  if (error) {
    throw error;
  }
};
