"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/auth";
import { deleteCategory, deleteMenuItem, upsertCategory, upsertMenuItem } from "@/lib/data/catalog-admin";
import { categoryFormSchema, menuItemFormSchema, type CategoryFormInput, type MenuItemFormInput } from "@/lib/validators/catalog";
import { createMenuImageUploadUrl, deleteMenuImage, getPublicImageUrl } from "@/lib/storage/menu-images";

export const upsertCategoryAction = async (input: CategoryFormInput) => {
  await requireAdmin();

  const parsed = categoryFormSchema.safeParse(input);

  if (!parsed.success) {
    return { error: "Data kategori tidak valid" };
  }

  await upsertCategory(parsed.data);
  revalidatePath("/admin/catalog");
  return { success: true };
};

export const deleteCategoryAction = async (categoryId: string) => {
  await requireAdmin();
  await deleteCategory(categoryId);
  revalidatePath("/admin/catalog");
};

export const upsertMenuItemAction = async (input: MenuItemFormInput) => {
  await requireAdmin();

  const parsed = menuItemFormSchema.safeParse(input);

  if (!parsed.success) {
    return { error: "Data menu tidak valid" };
  }

  await upsertMenuItem(parsed.data);
  revalidatePath("/admin/catalog");
  return { success: true };
};

export const deleteMenuItemAction = async (menuItemId: string) => {
  await requireAdmin();
  await deleteMenuItem(menuItemId);
  revalidatePath("/admin/catalog");
};

export const createSignedImageUploadUrlAction = async () => {
  await requireAdmin();
  const { path, signedUrl, token } = await createMenuImageUploadUrl();
  const publicUrl = getPublicImageUrl(path);
  return { path, signedUrl, token, publicUrl };
};

export const deleteMenuImageAction = async (path: string) => {
  await requireAdmin();
  await deleteMenuImage(path);
  revalidatePath("/admin/catalog");
};
