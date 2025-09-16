"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Hash, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
	deleteRoomAction,
	deleteRoomCodeAction,
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
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/table";
import type { Room, RoomCode } from "@/lib/supabase/types";
import {
	type RoomCodeFormInput,
	type RoomFormInput,
	roomCodeFormSchema,
	roomFormSchema,
} from "@/lib/validators/rooms";

interface RoomsManagerProps {
	rooms: Room[];
	codes: RoomCode[];
}

interface RoomDialogState {
	open: boolean;
	room?: Room;
}

interface CodeDialogState {
	open: boolean;
	room?: Room;
	code?: RoomCode;
}

export const RoomsManager = ({ rooms, codes }: RoomsManagerProps) => {
	const [roomDialog, setRoomDialog] = useState<RoomDialogState>({
		open: false,
	});
	const [codeDialog, setCodeDialog] = useState<CodeDialogState>({
		open: false,
	});
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	const roomForm = useForm<RoomFormInput>({
		resolver: zodResolver(roomFormSchema),
		defaultValues: {
			label: "",
			number: "",
			is_active: true,
		},
	});

	const codeForm = useForm<RoomCodeFormInput>({
		resolver: zodResolver(roomCodeFormSchema),
		defaultValues: {
			room_id: "",
			code: "",
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

	const resetCodeForm = (room: Room, code?: RoomCode) => {
		codeForm.reset(
			code
				? {
						id: code.id,
						room_id: room.id,
						code: code.code,
						is_active: code.is_active,
					}
				: {
						room_id: room.id,
						code: "",
						is_active: true,
					},
		);
	};

	const roomCodesMap = useMemo(() => {
		return codes.reduce<Record<string, RoomCode[]>>((acc, code) => {
			if (!acc[code.room_id]) acc[code.room_id] = [];
			acc[code.room_id].push(code);
			return acc;
		}, {});
	}, [codes]);

	const handleOpenRoomDialog = (room?: Room) => {
		setRoomDialog({ open: true, room });
		resetRoomForm(room);
		setErrorMessage(null);
	};

	const handleOpenCodeDialog = (room: Room, code?: RoomCode) => {
		setCodeDialog({ open: true, room, code });
		resetCodeForm(room, code);
		setErrorMessage(null);
	};

	const onSubmitRoom = roomForm.handleSubmit((values) => {
		startTransition(async () => {
			const result = await upsertRoomAction(values);
			if (result?.error) {
				setErrorMessage(result.error);
				return;
			}
			setErrorMessage(null);
			setRoomDialog({ open: false });
		});
	});

	const onSubmitCode = codeForm.handleSubmit((values) => {
		startTransition(async () => {
			const result = await upsertRoomCodeAction(values);
			if (result?.error) {
				setErrorMessage(result.error);
				return;
			}
			setErrorMessage(null);
			setCodeDialog({ open: false });
		});
	});

	const sortedRooms = useMemo(() => {
		return rooms.slice().sort((a, b) => a.number.localeCompare(b.number));
	}, [rooms]);

	return (
		<div className="space-y-6">
			{errorMessage && <Alert variant="destructive">{errorMessage}</Alert>}
			<Card>
				<CardHeader className="flex items-center justify-between gap-2">
					<CardTitle>Kamar</CardTitle>
					<Button onClick={() => handleOpenRoomDialog()}>
						<Plus className="mr-2 h-4 w-4" /> Tambah Kamar
					</Button>
				</CardHeader>
				<CardContent className="p-0">
					<Table>
						<Thead>
							<Tr>
								<Th>Nomor</Th>
								<Th>Nama</Th>
								<Th>Status</Th>
								<Th>Kode QR</Th>
								<Th>Aksi</Th>
							</Tr>
						</Thead>
						<Tbody>
							{sortedRooms.map((room) => (
								<Tr key={room.id}>
									<Td className="font-medium">{room.number}</Td>
									<Td>{room.label}</Td>
									<Td>
										<Badge variant={room.is_active ? "success" : "outline"}>
											{room.is_active ? "Aktif" : "Nonaktif"}
										</Badge>
									</Td>
									<Td className="space-y-2">
										<div className="flex flex-wrap gap-2">
											{(roomCodesMap[room.id] ?? []).map((code) => (
												<Badge
													key={code.id}
													variant={code.is_active ? "default" : "outline"}
												>
													{code.code}
												</Badge>
											))}
										</div>
										<div className="flex flex-wrap gap-2">
											<Button
												size="sm"
												variant="outline"
												onClick={() => handleOpenCodeDialog(room)}
											>
												<Hash className="mr-1 h-4 w-4" /> Tambah Kode
											</Button>
											{(roomCodesMap[room.id] ?? []).map((code) => (
												<Button
													key={`edit-${code.id}`}
													size="sm"
													variant="ghost"
													onClick={() => handleOpenCodeDialog(room, code)}
												>
													Edit {code.code}
												</Button>
											))}
											{(roomCodesMap[room.id] ?? []).map((code) => (
												<Button
													key={`delete-${code.id}`}
													size="sm"
													variant="destructive"
													onClick={() =>
														startTransition(async () =>
															deleteRoomCodeAction(code.id),
														)
													}
												>
													<Trash2 className="mr-1 h-4 w-4" /> Hapus {code.code}
												</Button>
											))}
										</div>
									</Td>
									<Td className="flex flex-wrap gap-2">
										<Button
											size="sm"
											variant="outline"
											onClick={() => handleOpenRoomDialog(room)}
										>
											<Pencil className="mr-1 h-4 w-4" /> Edit
										</Button>
										<Button
											size="sm"
											variant="destructive"
											onClick={() =>
												startTransition(async () => deleteRoomAction(room.id))
											}
										>
											<Trash2 className="mr-1 h-4 w-4" /> Hapus
										</Button>
									</Td>
								</Tr>
							))}
						</Tbody>
					</Table>
				</CardContent>
			</Card>

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
						<Input type="hidden" {...roomForm.register("id")} />
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

			<Dialog
				open={codeDialog.open}
				onOpenChange={(open) => {
					setCodeDialog(open ? codeDialog : { open: false });
					if (!open) setErrorMessage(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{codeDialog.code
								? `Edit Kode untuk ${codeDialog.room?.number}`
								: `Tambah Kode ${codeDialog.room?.number}`}
						</DialogTitle>
					</DialogHeader>
					<form className="space-y-4" onSubmit={onSubmitCode}>
						<Input type="hidden" {...codeForm.register("id")} />
						<Input type="hidden" {...codeForm.register("room_id")} />
						<div className="space-y-2">
							<label htmlFor="code" className="text-sm font-medium">
								Kode
							</label>
							<Input
								id="code"
								placeholder="Contoh: ZM301A"
								{...codeForm.register("code")}
							/>
							{codeForm.formState.errors.code && (
								<p className="text-xs text-destructive">
									{codeForm.formState.errors.code.message}
								</p>
							)}
						</div>
						<div className="flex items-center justify-between rounded-md border border-border p-3">
							<div>
								<p className="text-sm font-medium">Aktif</p>
								<p className="text-xs text-muted-foreground">
									Hanya kode aktif yang bisa digunakan tamu.
								</p>
							</div>
							<Switch
								checked={codeForm.watch("is_active")}
								onCheckedChange={(checked) =>
									codeForm.setValue("is_active", checked)
								}
							/>
						</div>
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setCodeDialog({ open: false })}
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
