import "server-only";

import { getSupabaseServiceRoleClient } from "../supabase/service";
import type { MenuCategory, MenuItem } from "../supabase/types";

export const listCategories = async (): Promise<MenuCategory[]> => {
  const service = getSupabaseServiceRoleClient();
  const { data, error } = await service
    .from("menu_categories")
    .select("id, name, position, is_active, created_at, updated_at")
    .order("position", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as MenuCategory[];
};

export const upsertCategory = async (category: Partial<MenuCategory>) => {
  const service = getSupabaseServiceRoleClient();
  const { data, error } = await service
    .from("menu_categories")
    .upsert(category, { onConflict: "id" })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data?.id as string;
};

export const deleteCategory = async (categoryId: string) => {
  const service = getSupabaseServiceRoleClient();
  const { error } = await service
    .from("menu_categories")
    .delete()
    .eq("id", categoryId);

  if (error) {
    throw error;
  }
};

export const listMenuItems = async (): Promise<MenuItem[]> => {
  const service = getSupabaseServiceRoleClient();
  const { data, error } = await service
    .from("menu_items")
    .select(
      "id, category_id, name, price, is_available, image_url, position, created_at, updated_at"
    )
    .order("position", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as MenuItem[];
};

export const listMenuItemsWithCategory = async () => {
  const service = getSupabaseServiceRoleClient();
  const { data, error } = await service
    .from("menu_items")
    .select(
      `id, category_id, name, price, is_available, image_url, position, created_at, updated_at,
       category:menu_categories ( id, name )`
    )
    .order("position", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
};

export const upsertMenuItem = async (item: Partial<MenuItem>) => {
  const service = getSupabaseServiceRoleClient();
  const { data, error } = await service
    .from("menu_items")
    .upsert(item, { onConflict: "id" })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data?.id as string;
};

export const deleteMenuItem = async (itemId: string) => {
  const service = getSupabaseServiceRoleClient();
  const { error } = await service.from("menu_items").delete().eq("id", itemId);

  if (error) {
    throw error;
  }
};
