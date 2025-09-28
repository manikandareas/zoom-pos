import "server-only";

import { getSupabaseServiceRoleClient } from "../supabase/service";
import type { MenuCategory, MenuItem } from "../supabase/types";

export const listCategories = async (): Promise<MenuCategory[]> => {
  const service = getSupabaseServiceRoleClient();
  const { data, error } = await service
    .from("menu_categories")
    .select("id, name, position, is_active, deleted_at, created_at, updated_at")
    .is("deleted_at", null)
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
  const now = new Date().toISOString();
  const { error } = await service
    .from("menu_categories")
    .update({ is_active: false, deleted_at: now })
    .eq("id", categoryId)
    .is("deleted_at", null);

  if (error) {
    throw error;
  }

  const { error: itemsError } = await service
    .from("menu_items")
    .update({ is_available: false, deleted_at: now })
    .eq("category_id", categoryId)
    .is("deleted_at", null);

  if (itemsError) {
    throw itemsError;
  }
};

export const listMenuItems = async (): Promise<MenuItem[]> => {
  const service = getSupabaseServiceRoleClient();
  const { data, error } = await service
    .from("menu_items")
    .select(
      "id, category_id, name, price, is_available, image_url, position, deleted_at, created_at, updated_at"
    )
    .is("deleted_at", null)
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
      `id, category_id, name, price, is_available, image_url, position, deleted_at, created_at, updated_at,
       category:menu_categories ( id, name, deleted_at )`
    )
    .is("deleted_at", null)
    .order("position", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).filter((item) => {
    const category = Array.isArray(item.category) ? item.category[0] : item.category;
    return !(category && category.deleted_at !== null);
  });
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
  const now = new Date().toISOString();
  const { error } = await service
    .from("menu_items")
    .update({ is_available: false, deleted_at: now })
    .eq("id", itemId)
    .is("deleted_at", null);

  if (error) {
    throw error;
  }
};
