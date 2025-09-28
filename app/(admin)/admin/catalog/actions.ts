"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/auth";
import {
	deleteCategory,
	deleteMenuItem,
	upsertCategory,
	upsertMenuItem,
} from "@/lib/data/catalog-admin";
import { categoryFormSchema, menuItemFormSchema, type CategoryFormInput, type MenuItemFormInput } from "@/lib/validators/catalog";
import { createMenuImageUploadUrl, deleteMenuImage, getPublicImageUrl } from "@/lib/storage/menu-images";

const extractErrorMessage = (error: unknown): string | null => {
	if (error && typeof error === "object") {
		if ("message" in error && typeof (error as { message?: unknown }).message === "string") {
			return (error as { message: string }).message;
		}
		if ("error" in error && typeof (error as { error?: unknown }).error === "string") {
			return (error as { error: string }).error;
		}
	}
	return null;
};

const withActionError = async <T>(fn: () => Promise<T>, fallback: string) => {
	try {
		return await fn();
	} catch (error) {
		console.error(fallback, error);
		const message = extractErrorMessage(error);
		return { error: message ? `${fallback}: ${message}` : fallback };
	}
};

export const upsertCategoryAction = async (input: CategoryFormInput) => {
	await requireAdmin();

	const parsed = categoryFormSchema.safeParse(input);

	if (!parsed.success) {
		return { error: "Data kategori tidak valid" };
	}

	const result = await withActionError(
		async () => {
			await upsertCategory(parsed.data);
			revalidatePath("/admin/catalog");
			return { success: true } as const;
		},
		"Gagal menyimpan kategori"
	);

	return result;
};

export const deleteCategoryAction = async (categoryId: string) => {
	await requireAdmin();
	const result = await withActionError(
		async () => {
			await deleteCategory(categoryId);
			revalidatePath("/admin/catalog");
			return { success: true } as const;
		},
		"Gagal menonaktifkan kategori"
	);

	return result;
};

export const upsertMenuItemAction = async (input: MenuItemFormInput) => {
	await requireAdmin();

	const parsed = menuItemFormSchema.safeParse(input);

	if (!parsed.success) {
		return { error: "Data menu tidak valid" };
	}

	const result = await withActionError(
		async () => {
			await upsertMenuItem(parsed.data);
			revalidatePath("/admin/catalog");
			return { success: true } as const;
		},
		"Gagal menyimpan menu"
	);

	return result;
};

export const deleteMenuItemAction = async (menuItemId: string) => {
	await requireAdmin();
	const result = await withActionError(
		async () => {
			await deleteMenuItem(menuItemId);
			revalidatePath("/admin/catalog");
			return { success: true } as const;
		},
		"Gagal menonaktifkan menu"
	);

	return result;
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
