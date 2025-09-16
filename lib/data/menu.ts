import "server-only";

import { createSupabaseServerClient } from "../supabase/server";
import type { MenuCategory, MenuItem } from "../supabase/types";

export interface CategoryWithItems extends MenuCategory {
  items: MenuItem[];
}

export const getActiveMenuCatalog = async (): Promise<CategoryWithItems[]> => {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("menu_categories")
    .select(
      `id, name, position, is_active, created_at, updated_at,
       menu_items ( id, category_id, name, price, is_available, image_url, position, created_at, updated_at )`
    )
    .eq("is_active", true)
    .order("position", { ascending: true })
    .order("position", { foreignTable: "menu_items" });

  if (error) {
    throw error;
  }

  return (
    data ?? []
  ).map((category) => ({
    ...category,
    items: (category.menu_items as MenuItem[] | null)?.filter((item) => item.is_available) ?? [],
  }));
};
