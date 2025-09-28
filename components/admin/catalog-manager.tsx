"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
	createSignedImageUploadUrlAction,
	deleteCategoryAction,
	deleteMenuItemAction,
	upsertCategoryAction,
	upsertMenuItemAction,
} from "@/app/(admin)/admin/catalog/actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CURRENCY_FORMATTER } from "@/lib/constants";
import type { MenuCategory, MenuItem } from "@/lib/supabase/types";
import {
	type CategoryFormInput,
	categoryFormSchema,
	type MenuItemFormInput,
	menuItemFormSchema,
} from "@/lib/validators/catalog";

interface CatalogManagerProps {
	categories: MenuCategory[];
	menuItems: MenuItem[];
}

interface CategoryDialogState {
	open: boolean;
	category?: MenuCategory;
}

interface ItemDialogState {
	open: boolean;
	item?: MenuItem;
}

export const CatalogManager = ({
	categories,
	menuItems,
}: CatalogManagerProps) => {
	const [categoryDialog, setCategoryDialog] = useState<CategoryDialogState>({
		open: false,
	});
	const [itemDialog, setItemDialog] = useState<ItemDialogState>({
		open: false,
	});
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [uploading, setUploading] = useState(false);
	const [isPending, startTransition] = useTransition();

	const categoryForm = useForm<CategoryFormInput>({
		resolver: zodResolver(categoryFormSchema),
		defaultValues: {
			name: "",
			position: 0,
			is_active: true,
		},
	});

	const itemForm = useForm<MenuItemFormInput>({
		resolver: zodResolver(menuItemFormSchema),
		defaultValues: {
			name: "",
			price: 0,
			category_id: categories[0]?.id,
			is_available: true,
			image_url: null,
			position: 0,
		},
	});

	const currentImageUrl = itemForm.watch("image_url");
	const currentItemName = itemForm.watch("name");

	const resetCategoryForm = (category?: MenuCategory) => {
		categoryForm.reset(
			category
				? {
						id: category.id,
						name: category.name,
						position: category.position,
						is_active: category.is_active,
					}
				: {
						name: "",
						position: categories.length,
						is_active: true,
					},
		);
	};

	const resetItemForm = (item?: MenuItem) => {
		itemForm.reset(
			item
				? {
						id: item.id,
						category_id: item.category_id,
						name: item.name,
						price: Number(item.price ?? 0),
						is_available: item.is_available,
						image_url: item.image_url,
						position: item.position,
					}
				: {
						category_id: categories[0]?.id ?? "",
						name: "",
						price: 0,
						is_available: true,
						image_url: null,
						position: menuItems.length,
					},
		);
	};

	const handleOpenCategoryDialog = (category?: MenuCategory) => {
		setCategoryDialog({ open: true, category });
		resetCategoryForm(category);
		setErrorMessage(null);
	};

	const handleOpenItemDialog = (item?: MenuItem) => {
		setItemDialog({ open: true, item });
		resetItemForm(item);
		setErrorMessage(null);
	};

	const handleArchiveCategory = (category: MenuCategory) => {
		if (
			typeof window !== "undefined" &&
			!window.confirm("Sembunyikan kategori ini? Item yang terkait tetap tersedia di riwayat pesanan.")
		) {
			return;
		}
		setErrorMessage(null);
		startTransition(async () => {
			const result = await deleteCategoryAction(category.id);
			if (result && "error" in result && result.error) {
				setErrorMessage(result.error);
			}
		});
	};

	const handleArchiveItem = (item: MenuItem) => {
		if (
			typeof window !== "undefined" &&
			!window.confirm("Sembunyikan menu ini dari katalog tamu?")
		) {
			return;
		}
		setErrorMessage(null);
		startTransition(async () => {
			const result = await deleteMenuItemAction(item.id);
			if (result && "error" in result && result.error) {
				setErrorMessage(result.error);
			}
		});
	};

	const onSubmitCategory = categoryForm.handleSubmit((values) => {
		startTransition(async () => {
			const result = await upsertCategoryAction(values);
			if (result && "error" in result && result.error) {
				setErrorMessage(result.error);
				return;
			}
			setErrorMessage(null);
			setCategoryDialog({ open: false });
		});
	});

	const onSubmitItem = itemForm.handleSubmit(async (values) => {
		let imageUrl = values.image_url;
		try {
			const fileList = (
				document.getElementById("menu-item-image") as HTMLInputElement | null
			)?.files;
			if (fileList && fileList.length > 0) {
				const file = fileList[0];
				setUploading(true);
				const uploadData = await createSignedImageUploadUrlAction();
				const signedUrl = new URL(uploadData.signedUrl);
				if (uploadData.token) {
					signedUrl.searchParams.set("token", uploadData.token);
				}
				const response = await fetch(signedUrl.toString(), {
					method: "PUT",
					headers: {
						"Content-Type": file.type,
						"x-upsert": "false",
						"cache-control": "max-age=3600",
					},
					body: file,
				});
				if (!response.ok) {
					throw new Error("Upload gagal");
				}
				imageUrl = uploadData.publicUrl;
			}

			const payload: MenuItemFormInput = {
				...values,
				price: Number(values.price),
				image_url: imageUrl,
			};

			startTransition(async () => {
				const result = await upsertMenuItemAction(payload);
				if (result && "error" in result && result.error) {
					setErrorMessage(result.error);
					return;
				}
				setErrorMessage(null);
				setItemDialog({ open: false });
			});
		} catch (error) {
			console.error(error);
			setErrorMessage("Gagal mengunggah gambar");
		} finally {
			setUploading(false);
		}
	});

	// biome-ignore lint/correctness/useExhaustiveDependencies: false positive
	const categoryRows = useMemo(() => {
		return categories
			.slice()
			.sort((a, b) => a.position - b.position)
			.map((category) => (
				<Tr key={category.id}>
					<Td className="font-medium">{category.name}</Td>
					<Td>{category.position}</Td>
					<Td>
						<Badge variant={category.is_active ? "success" : "outline"}>
							{category.is_active ? "Aktif" : "Nonaktif"}
						</Badge>
					</Td>
					<Td className="flex gap-2">
						<Button
							size="icon"
							variant="outline"
							disabled={isPending}
							onClick={() => handleOpenCategoryDialog(category)}
						>
							<Pencil className="h-4 w-4" />
						</Button>
						<Button
							size="icon"
							variant="destructive"
							disabled={isPending}
							onClick={() => handleArchiveCategory(category)}
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					</Td>
				</Tr>
			));
	}, [categories]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: false positive
	const itemRows = useMemo(() => {
		return menuItems
			.slice()
			.sort((a, b) => a.position - b.position)
			.map((item) => (
				<Tr key={item.id}>
					<Td className="font-medium">{item.name}</Td>
					<Td>
						{categories.find((cat) => cat.id === item.category_id)?.name ?? "-"}
					</Td>
					<Td>{CURRENCY_FORMATTER.format(Number(item.price ?? 0))}</Td>
					<Td>
						<Badge variant={item.is_available ? "success" : "outline"}>
							{item.is_available ? "Tersedia" : "Habis"}
						</Badge>
					</Td>
					<Td className="flex gap-2">
						<Button
							size="icon"
							variant="outline"
							disabled={isPending}
							onClick={() => handleOpenItemDialog(item)}
						>
							<Pencil className="mr-1 h-4 w-4" />
						</Button>
						<Button
							size="icon"
							variant="destructive"
							disabled={isPending}
							onClick={() => handleArchiveItem(item)}
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					</Td>
				</Tr>
			));
	}, [menuItems, categories]);

	return (
		<div className="space-y-6">
			{errorMessage && <Alert variant="destructive">{errorMessage}</Alert>}
			<Tabs defaultValue="items">
				<TabsList>
					<TabsTrigger value="items">Menu Items</TabsTrigger>
					<TabsTrigger value="categories">Categories</TabsTrigger>
				</TabsList>
				<TabsContent value="items">
					<Card>
						<CardHeader className="flex items-center flex-row justify-between gap-2">
							<CardTitle>Menu Items</CardTitle>
							<Button
								onClick={() => handleOpenItemDialog()}
								disabled={categories.length === 0}
							>
								<Plus className="mr-2 h-4 w-4" /> Tambah Item
							</Button>
						</CardHeader>
						<CardContent className="p-0">
							{categories.length === 0 && (
								<Alert className="m-4">
									Buat kategori terlebih dahulu sebelum menambahkan menu.
								</Alert>
							)}
							<Table>
								<Thead>
									<Tr>
										<Th>Nama</Th>
										<Th>Kategori</Th>
										<Th>Harga</Th>
										<Th>Status</Th>
										<Th>Aksi</Th>
									</Tr>
								</Thead>
								<Tbody>{itemRows}</Tbody>
							</Table>
						</CardContent>
					</Card>
				</TabsContent>
				<TabsContent value="categories">
					<Card>
						<CardHeader className="flex items-center flex-row justify-between gap-2">
							<CardTitle>Categories</CardTitle>
							<Button onClick={() => handleOpenCategoryDialog()}>
								<Plus className="mr-2 h-4 w-4" /> Tambah Kategori
							</Button>
						</CardHeader>
						<CardContent className="p-0">
							<Table>
								<Thead>
									<Tr>
										<Th>Nama</Th>
										<Th>Posisi</Th>
										<Th>Status</Th>
										<Th>Aksi</Th>
									</Tr>
								</Thead>
								<Tbody>{categoryRows}</Tbody>
							</Table>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			<Dialog
				open={categoryDialog.open}
				onOpenChange={(open) => {
					setCategoryDialog(open ? categoryDialog : { open: false });
					if (!open) setErrorMessage(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{categoryDialog.category ? "Edit Kategori" : "Tambah Kategori"}
						</DialogTitle>
					</DialogHeader>
					<form className="space-y-4" onSubmit={onSubmitCategory}>
						{categoryDialog.category && (
							<Input type="hidden" {...categoryForm.register("id")} />
						)}
						<div className="space-y-2">
							<label htmlFor="name" className="text-sm font-medium">
								Nama
							</label>
							<Input
								id="name"
								placeholder="Contoh: Makanan"
								{...categoryForm.register("name")}
							/>
							{categoryForm.formState.errors.name && (
								<p className="text-xs text-destructive">
									{categoryForm.formState.errors.name.message}
								</p>
							)}
						</div>
						<div className="space-y-2">
							<label htmlFor="position" className="text-sm font-medium">
								Posisi
							</label>
							<Input
								id="position"
								type="number"
								{...categoryForm.register("position", { valueAsNumber: true })}
							/>
							{categoryForm.formState.errors.position && (
								<p className="text-xs text-destructive">
									{categoryForm.formState.errors.position.message}
								</p>
							)}
						</div>
						<div className="flex items-center justify-between rounded-md border border-border p-3">
							<div>
								<p className="text-sm font-medium">Aktif</p>
								<p className="text-xs text-muted-foreground">
									Tampilkan kategori di katalog tamu.
								</p>
							</div>
							<Switch
								checked={categoryForm.watch("is_active")}
								onCheckedChange={(checked) =>
									categoryForm.setValue("is_active", checked)
								}
							/>
						</div>
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setCategoryDialog({ open: false })}
							>
								Batal
							</Button>
							<Button type="submit" disabled={isPending}>
								{isPending ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									"Simpan"
								)}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog
				open={itemDialog.open}
				onOpenChange={(open) => {
					setItemDialog(open ? itemDialog : { open: false });
					if (!open) {
						setErrorMessage(null);
						setUploading(false);
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{itemDialog.item ? "Edit Menu" : "Tambah Menu"}
						</DialogTitle>
					</DialogHeader>
					<form className="space-y-4" onSubmit={onSubmitItem}>
						{itemDialog.item && (
							<Input type="hidden" {...itemForm.register("id")} />
						)}
						<div className="space-y-2">
							<label htmlFor="name" className="text-sm font-medium">
								Nama Menu
							</label>
							<Input
								id="name"
								placeholder="Contoh: Nasi Goreng"
								{...itemForm.register("name")}
							/>
							{itemForm.formState.errors.name && (
								<p className="text-xs text-destructive">
									{itemForm.formState.errors.name.message}
								</p>
							)}
						</div>
						<div className="space-y-2">
							<label htmlFor="category_id" className="text-sm font-medium">
								Kategori
							</label>
							<select
								id="category_id"
								className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
								{...itemForm.register("category_id")}
							>
								{categories.map((category) => (
									<option key={category.id} value={category.id}>
										{category.name}
									</option>
								))}
							</select>
							{itemForm.formState.errors.category_id && (
								<p className="text-xs text-destructive">
									{itemForm.formState.errors.category_id.message}
								</p>
							)}
						</div>
						<div className="grid gap-3 md:grid-cols-2">
							<div className="space-y-2">
								<label htmlFor="price" className="text-sm font-medium">
									Harga
								</label>
								<Input
									id="price"
									type="number"
									step="100"
									{...itemForm.register("price", { valueAsNumber: true })}
								/>
								{itemForm.formState.errors.price && (
									<p className="text-xs text-destructive">
										{itemForm.formState.errors.price.message}
									</p>
								)}
							</div>
							<div className="space-y-2">
								<label htmlFor="position" className="text-sm font-medium">
									Posisi
								</label>
								<Input
									id="position"
									type="number"
									{...itemForm.register("position", { valueAsNumber: true })}
								/>
								{itemForm.formState.errors.position && (
									<p className="text-xs text-destructive">
										{itemForm.formState.errors.position.message}
									</p>
								)}
							</div>
						</div>
						<div className="space-y-2">
							<label htmlFor="menu-item-image" className="text-sm font-medium">
								Gambar
							</label>
							<Input id="menu-item-image" type="file" accept="image/*" />
							{currentImageUrl && (
								<div className="space-y-3 rounded-md border border-border p-3 text-xs text-muted-foreground">
									<div className="flex items-center justify-between">
										<span className="font-medium">Gambar saat ini</span>
										<Button
											type="button"
											size="sm"
											variant="ghost"
											onClick={() => itemForm.setValue("image_url", null)}
										>
											Hapus
										</Button>
									</div>
									<Image
										src={currentImageUrl}
										alt={`Preview gambar ${currentItemName || "menu"}`}
										width={128}
										height={128}
										className="rounded-md object-cover"
									/>
									<Link
										href={currentImageUrl}
										target="_blank"
										className="block truncate text-[10px] text-muted-foreground/80"
									>
										Buka gambar
									</Link>
								</div>
							)}
						</div>
						<div className="flex items-center justify-between rounded-md border border-border p-3">
							<div>
								<p className="text-sm font-medium">Tersedia</p>
								<p className="text-xs text-muted-foreground">
									Sembunyikan jika stok habis.
								</p>
							</div>
							<Switch
								checked={itemForm.watch("is_available")}
								onCheckedChange={(checked) =>
									itemForm.setValue("is_available", checked)
								}
							/>
						</div>
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setItemDialog({ open: false })}
							>
								Batal
							</Button>
							<Button type="submit" disabled={isPending || uploading}>
								{isPending || uploading ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									"Simpan"
								)}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
};
