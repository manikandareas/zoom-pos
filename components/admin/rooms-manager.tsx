"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Download, Loader2, Pencil, Plus, QrCode, Trash2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
	deleteRoomAction,
	deleteRoomCodeAction,
	generateRoomCodeAction,
	upsertRoomAction,
	upsertRoomCodeAction,
} from "@/app/(admin)/admin/rooms/actions";
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
import type { Room, RoomCode } from "@/lib/supabase/types";
import { type RoomFormInput, roomFormSchema } from "@/lib/validators/rooms";

interface RoomsManagerProps {
	rooms: Room[];
	codes: RoomCode[];
}

interface RoomDialogState {
	open: boolean;
	room?: Room;
}

type RoomActionState = { type: "generate" | "delete"; roomId: string } | null;

type CodeActionState = { type: "toggle" | "delete"; codeId: string } | null;

const mapRoomCodes = (entries: RoomCode[]) => {
	return entries.reduce<Record<string, RoomCode[]>>((acc, code) => {
		if (!acc[code.room_id]) {
			acc[code.room_id] = [];
		}
		acc[code.room_id].push(code);
		return acc;
	}, {});
};

export const RoomsManager = ({ rooms, codes }: RoomsManagerProps) => {
	const [roomDialog, setRoomDialog] = useState<RoomDialogState>({
		open: false,
	});
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [roomAction, setRoomAction] = useState<RoomActionState>(null);
	const [codeAction, setCodeAction] = useState<CodeActionState>(null);
	const [downloadCodeId, setDownloadCodeId] = useState<string | null>(null);
	const [appOrigin, setAppOrigin] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		setAppOrigin(window.location.origin);
	}, []);

	const roomForm = useForm<RoomFormInput>({
		resolver: zodResolver(roomFormSchema),
		defaultValues: {
			label: "",
			number: "",
			is_active: true,
		},
	});

	const resetRoomForm = (room?: Room) => {
		roomForm.reset(
			room
				? {
						id: room.id,
						label: room.label,
						number: room.number,
						is_active: room.is_active,
					}
				: {
						label: "",
						number: "",
						is_active: true,
					},
		);
	};

	const roomCodesMap = useMemo(() => mapRoomCodes(codes), [codes]);

	const sortedRooms = useMemo(() => {
		return rooms.slice().sort((a, b) => a.number.localeCompare(b.number));
	}, [rooms]);

	const handleOpenRoomDialog = (room?: Room) => {
		setRoomDialog({ open: true, room });
		resetRoomForm(room);
		setErrorMessage(null);
	};

	const onSubmitRoom = roomForm.handleSubmit((values) => {
		setErrorMessage(null);
		startTransition(async () => {
			try {
				const result = await upsertRoomAction(values);
				if (result?.error) {
					setErrorMessage(result.error);
					return;
				}
				setRoomDialog({ open: false });
			} catch (error) {
				console.error(error);
				setErrorMessage("Gagal menyimpan data kamar");
			}
		});
	});

	const handleGenerateCode = (roomId: string) => {
		setRoomAction({ type: "generate", roomId });
		setErrorMessage(null);
		startTransition(async () => {
			try {
				const result = await generateRoomCodeAction(roomId);
				if (result?.error) {
					setErrorMessage(result.error);
				}
			} catch (error) {
				console.error(error);
				setErrorMessage("Gagal membuat kode kamar");
			} finally {
				setRoomAction(null);
			}
		});
	};

	const handleToggleCodeStatus = (code: RoomCode, nextIsActive: boolean) => {
		setCodeAction({ type: "toggle", codeId: code.id });
		setErrorMessage(null);
		startTransition(async () => {
			try {
				const result = await upsertRoomCodeAction({
					id: code.id,
					room_id: code.room_id,
					code: code.code,
					is_active: nextIsActive,
				});
				if (result?.error) {
					setErrorMessage(result.error);
				}
			} catch (error) {
				console.error(error);
				setErrorMessage("Gagal memperbarui status kode kamar");
			} finally {
				setCodeAction(null);
			}
		});
	};

	const handleDeleteCode = (codeId: string) => {
		if (
			typeof window !== "undefined" &&
			!window.confirm("Hapus kode kamar ini?")
		) {
			return;
		}
		setCodeAction({ type: "delete", codeId });
		setErrorMessage(null);
		startTransition(async () => {
			try {
				await deleteRoomCodeAction(codeId);
			} catch (error) {
				console.error(error);
				setErrorMessage("Gagal menghapus kode kamar");
			} finally {
				setCodeAction(null);
			}
		});
	};

	const handleDeleteRoom = (roomId: string) => {
		if (
			typeof window !== "undefined" &&
			!window.confirm("Hapus kamar dan seluruh kodenya?")
		) {
			return;
		}
		setRoomAction({ type: "delete", roomId });
		setErrorMessage(null);
		startTransition(async () => {
			try {
				await deleteRoomAction(roomId);
			} catch (error) {
				console.error(error);
				setErrorMessage("Gagal menghapus kamar");
			} finally {
				setRoomAction(null);
			}
		});
	};

	const getQrUrl = (code: string, size: number) => {
		if (!appOrigin) {
			return null;
		}
		const orderUrl = `${appOrigin}/order/${code}`;
		return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(orderUrl)}`;
	};

	const handleDownloadQr = async (code: RoomCode) => {
		if (!appOrigin) {
			setErrorMessage("App origin belum tersedia, coba lagi.");
			return;
		}
		setErrorMessage(null);
		setDownloadCodeId(code.id);
		try {
			const qrEndpoint = getQrUrl(code.code, 600);
			if (!qrEndpoint) {
				throw new Error("QR endpoint belum siap");
			}
			const response = await fetch(qrEndpoint);
			if (!response.ok) {
				throw new Error("Unable to download QR");
			}
			const blob = await response.blob();
			const blobUrl = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = blobUrl;
			link.download = `hotel-zoom-${code.code}.png`;
			document.body.appendChild(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(blobUrl);
		} catch (error) {
			console.error(error);
			setErrorMessage("Gagal mengunduh QRIS");
		} finally {
			setDownloadCodeId(null);
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Kamar</h1>
					<p className="text-sm text-muted-foreground">
						Kelola informasi kamar dan kode QR pemesanan.
					</p>
				</div>
				<Button disabled={isPending} onClick={() => handleOpenRoomDialog()}>
					<Plus className="mr-2 h-4 w-4" /> Tambah Kamar
				</Button>
			</div>

			{errorMessage && <Alert variant="destructive">{errorMessage}</Alert>}

			{sortedRooms.length === 0 ? (
				<Card>
					<CardHeader>
						<CardTitle>Belum ada kamar</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">
							Tambahkan kamar pertama untuk mulai menggunakan pemesanan QR.
						</p>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{sortedRooms.map((room) => {
						const codesForRoom = roomCodesMap[room.id] ?? [];
						const isGenerating =
							isPending &&
							roomAction?.type === "generate" &&
							roomAction.roomId === room.id;
						const isDeletingRoom =
							isPending &&
							roomAction?.type === "delete" &&
							roomAction.roomId === room.id;

						return (
							<Card key={room.id} className="flex h-full flex-col">
								<CardHeader className="flex flex-row items-start justify-between gap-3">
									<CardTitle className="flex flex-col gap-1 text-base">
										<span className="text-xs uppercase text-muted-foreground">
											Kamar {room.number}
										</span>
										<span className="text-lg font-semibold text-foreground">
											{room.label}
										</span>
									</CardTitle>
									<Badge variant={room.is_active ? "success" : "outline"}>
										{room.is_active ? "Aktif" : "Nonaktif"}
									</Badge>
								</CardHeader>
								<CardContent className="flex flex-1 flex-col gap-4">
									<div className="space-y-3">
										<div className="flex items-center justify-between">
											<p className="text-sm font-semibold text-muted-foreground">
												Kode QR
											</p>
											{codesForRoom.length === 0 && (
												<Button
													size="sm"
													onClick={() => handleGenerateCode(room.id)}
													disabled={isPending}
												>
													{isGenerating ? (
														<Loader2 className="mr-2 h-4 w-4 animate-spin" />
													) : (
														<QrCode className="mr-2 h-4 w-4" />
													)}
													Generate QR
												</Button>
											)}
										</div>
										{codesForRoom.length === 0 ? (
											<p className="text-sm text-muted-foreground">
												Belum ada kode. Klik "Generate QR Code" untuk membuat.
											</p>
										) : (
											<div className="space-y-2">
												{codesForRoom.map((code) => {
													const previewUrl = getQrUrl(code.code, 220);
													const isCodeToggling =
														isPending &&
														codeAction?.type === "toggle" &&
														codeAction.codeId === code.id;
													const isCodeDeleting =
														isPending &&
														codeAction?.type === "delete" &&
														codeAction.codeId === code.id;
													const isDownloading = downloadCodeId === code.id;

													return (
														<div
															key={code.id}
															className="flex flex-col gap-3 rounded-md border border-border p-3"
														>
															<div className="flex flex-wrap items-center justify-between gap-2">
																<span className="font-mono text-sm">
																	{code.code}
																</span>
																<Badge
																	variant={
																		code.is_active ? "default" : "outline"
																	}
																>
																	{code.is_active ? "Aktif" : "Nonaktif"}
																</Badge>
															</div>
															<div className="flex justify-center">
																{previewUrl ? (
																	<Image
																		src={previewUrl}
																		alt={`QR untuk kode kamar ${code.code}`}
																		width={220}
																		height={220}
																		className="rounded-md border border-border bg-white p-2"
																	/>
																) : (
																	<div className="flex h-[220px] w-[220px] items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
																		Memuat QR...
																	</div>
																)}
															</div>
															<div className="flex flex-wrap items-center justify-between">
																<label
																	htmlFor="toggle-status"
																	className="flex items-center gap-2 text-xs font-medium text-muted-foreground"
																>
																	<Switch
																		id="toggle-status"
																		checked={code.is_active}
																		disabled={isPending}
																		onCheckedChange={(checked) =>
																			handleToggleCodeStatus(code, checked)
																		}
																	/>
																	{isCodeToggling ? (
																		<Loader2 className="h-3 w-3 animate-spin" />
																	) : (
																		<span>
																			{code.is_active ? "Aktif" : "Nonaktif"}
																		</span>
																	)}
																</label>
																<div className="flex items-center gap-2">
																	<Button
																		size="icon"
																		variant="outline"
																		disabled={isDownloading}
																		onClick={() => handleDownloadQr(code)}
																	>
																		{isDownloading ? (
																			<Loader2 className="h-4 w-4 animate-spin" />
																		) : (
																			<Download className="h-4 w-4" />
																		)}
																	</Button>
																	<Button
																		size="icon"
																		variant="destructive"
																		disabled={isPending}
																		onClick={() => handleDeleteCode(code.id)}
																	>
																		{isCodeDeleting ? (
																			<Loader2 className="h-4 w-4 animate-spin" />
																		) : (
																			<Trash2 className="h-4 w-4" />
																		)}
																	</Button>
																</div>
															</div>
														</div>
													);
												})}
											</div>
										)}
									</div>

									<div className="mt-auto flex flex-wrap gap-2">
										<Button
											variant="outline"
											disabled={isPending}
											onClick={() => handleOpenRoomDialog(room)}
										>
											<Pencil className="mr-2 h-4 w-4" /> Edit
										</Button>
										<Button
											variant="destructive"
											disabled={isPending}
											onClick={() => handleDeleteRoom(room.id)}
										>
											{isDeletingRoom ? (
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											) : (
												<Trash2 className="mr-2 h-4 w-4" />
											)}
											Hapus
										</Button>
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}

			<Dialog
				open={roomDialog.open}
				onOpenChange={(open) => {
					setRoomDialog(open ? roomDialog : { open: false });
					if (!open) setErrorMessage(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{roomDialog.room ? "Edit Kamar" : "Tambah Kamar"}
						</DialogTitle>
					</DialogHeader>
					<form className="space-y-4" onSubmit={onSubmitRoom}>
						{roomDialog.room && (
							<Input type="hidden" {...roomForm.register("id")} />
						)}
						<div className="space-y-2">
							<label htmlFor="number" className="text-sm font-medium">
								Nomor
							</label>
							<Input
								id="number"
								placeholder="Contoh: 301"
								{...roomForm.register("number")}
							/>
							{roomForm.formState.errors.number && (
								<p className="text-xs text-destructive">
									{roomForm.formState.errors.number.message}
								</p>
							)}
						</div>
						<div className="space-y-2">
							<label htmlFor="label" className="text-sm font-medium">
								Nama
							</label>
							<Input
								id="label"
								placeholder="Contoh: Deluxe Twin"
								{...roomForm.register("label")}
							/>
							{roomForm.formState.errors.label && (
								<p className="text-xs text-destructive">
									{roomForm.formState.errors.label.message}
								</p>
							)}
						</div>
						<div className="flex items-center justify-between rounded-md border border-border p-3">
							<div>
								<p className="text-sm font-medium">Aktif</p>
								<p className="text-xs text-muted-foreground">
									Tampilkan kamar untuk pemesanan.
								</p>
							</div>
							<Switch
								checked={roomForm.watch("is_active")}
								onCheckedChange={(checked) =>
									roomForm.setValue("is_active", checked)
								}
							/>
						</div>
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setRoomDialog({ open: false })}
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
		</div>
	);
};
