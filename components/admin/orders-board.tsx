"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Filter, Loader2 } from "lucide-react";
import { useCallback, useMemo, useState, useTransition } from "react";
import {
	acceptOrderAction,
	markAsBilledAction,
	rejectOrderAction,
	updateOrderStatusAction,
} from "@/app/(admin)/admin/orders/actions";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InvoicePrintButton } from "@/components/admin/invoice-print-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useOrdersRealtime } from "@/hooks/use-orders-realtime";
import {
	CURRENCY_FORMATTER,
	ORDER_STATUS_COLORS,
	ORDER_STATUS_LABEL,
	ORDER_STATUSES,
} from "@/lib/constants";
import type { AdminOrderRow } from "@/lib/data/orders";
import type { Room } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

interface OrdersBoardProps {
	orders: AdminOrderRow[];
	rooms: Room[];
}

const formatDateTime = (iso: string) => {
	return format(new Date(iso), "dd MMM yyyy HH:mm", { locale: localeId });
};

const fetchOrderDetails = async (
	client: SupabaseClient,
	orderId: string,
): Promise<AdminOrderRow | null> => {
	const { data, error } = await client
		.from("orders")
		.select(
			`id, room_id, guest_id, status, note, sub_total, rejection_reason, created_at, updated_at,
       rooms ( id, label, number, is_active, created_at, updated_at ),
       order_items ( id, order_id, menu_item_id, menu_item_name, unit_price, quantity, note, created_at )`,
		)
		.eq("id", orderId)
		.maybeSingle();

	if (error || !data) {
		console.error("Failed to fetch order", error);
		return null;
	}

	return {
		id: data.id,
		room_id: data.room_id,
		guest_id: data.guest_id,
		status: data.status,
		note: data.note,
		sub_total: Number(data.sub_total ?? 0),
		rejection_reason: data.rejection_reason,
		created_at: data.created_at,
		updated_at: data.updated_at,
		room: {
			id: data.rooms?.id ?? data.room_id,
			label: data.rooms?.label ?? "",
			number: data.rooms?.number ?? "",
			is_active: data.rooms?.is_active ?? true,
			created_at: data.rooms?.created_at ?? data.created_at,
			updated_at: data.rooms?.updated_at ?? data.updated_at,
		},
		items:
			(data.order_items ?? []).map((item) => ({
				id: item.id,
				order_id: item.order_id,
				menu_item_id: item.menu_item_id,
				menu_item_name: item.menu_item_name,
				unit_price: Number(item.unit_price ?? 0),
				quantity: item.quantity,
				note: item.note,
				created_at: item.created_at,
			})) ?? [],
	};
};

const statusOptions = ["ALL", ...ORDER_STATUSES] as const;
type StatusFilter = (typeof statusOptions)[number];

export const OrdersBoard = ({
	orders: initialOrders,
	rooms,
}: OrdersBoardProps) => {
	const { client } = useSupabase();
	const [orders, setOrders] = useState(initialOrders);
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
	const [roomFilter, setRoomFilter] = useState<string>("ALL");
	const [searchFilter, setSearchFilter] = useState("");
	const [isPending, startTransition] = useTransition();
	const [rejectDialog, setRejectDialog] = useState<{
		open: boolean;
		orderId?: string;
	}>({ open: false });
	const [rejectReason, setRejectReason] = useState("");
	const [actionTarget, setActionTarget] = useState<string | null>(null);

	const filteredOrders = useMemo(() => {
		return orders.filter((order) => {
			const matchesStatus =
				statusFilter === "ALL" || order.status === statusFilter;
			const matchesRoom = roomFilter === "ALL" || order.room_id === roomFilter;
			const matchesSearch = searchFilter
				? order.note?.toLowerCase().includes(searchFilter.toLowerCase()) ||
					order.rejection_reason
						?.toLowerCase()
						.includes(searchFilter.toLowerCase()) ||
					order.items.some((item) =>
						item.menu_item_name
							.toLowerCase()
							.includes(searchFilter.toLowerCase()),
					)
				: true;

			return matchesStatus && matchesRoom && matchesSearch;
		});
	}, [orders, statusFilter, roomFilter, searchFilter]);

	const refreshOrder = useCallback(
		async (orderId: string) => {
			const updated = await fetchOrderDetails(client, orderId);
			if (!updated) return;
			setOrders((prev) => {
				const exists = prev.some((order) => order.id === updated.id);
				if (exists) {
					return prev.map((order) =>
						order.id === updated.id ? updated : order,
					);
				}
				return [updated, ...prev];
			});
		},
		[client],
	);

	useOrdersRealtime(async (payload) => {
		if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
			await refreshOrder(payload.new.id);
		}
		if (payload.eventType === "DELETE") {
			setOrders((prev) => prev.filter((order) => order.id !== payload.old.id));
		}
	});

	const handleAccept = (orderId: string) => {
		setActionTarget(orderId);
		startTransition(async () => {
			await acceptOrderAction(orderId);
			await refreshOrder(orderId);
			setActionTarget(null);
		});
	};

	const handleNextStatus = (
		orderId: string,
		status: "IN_PREP" | "READY" | "DELIVERED",
	) => {
		setActionTarget(orderId);
		startTransition(async () => {
			await updateOrderStatusAction(orderId, status);
			await refreshOrder(orderId);
			setActionTarget(null);
		});
	};

	const handleMarkBilled = (orderId: string) => {
		setActionTarget(orderId);
		startTransition(async () => {
			await markAsBilledAction({ orderId });
			await refreshOrder(orderId);
			setActionTarget(null);
		});
	};

	const handleReject = () => {
		if (!rejectDialog.orderId) return;
		const reason = rejectReason.trim();
		if (!reason) return;

		const orderId = rejectDialog.orderId;
		setActionTarget(orderId);
		startTransition(async () => {
			await rejectOrderAction(orderId, reason);
			await refreshOrder(orderId);
			setRejectDialog({ open: false });
			setRejectReason("");
			setActionTarget(null);
		});
	};

	const isActionPending = (orderId: string) =>
		isPending && actionTarget === orderId;

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-lg">
						<Filter className="h-4 w-4" /> Filter
					</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 md:grid-cols-4">
					<div className="space-y-2">
						<span className="text-xs font-medium text-muted-foreground">
							Status
						</span>
						<Select
							value={statusFilter}
							onValueChange={(value) => setStatusFilter(value as StatusFilter)}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Pilih status" />
							</SelectTrigger>
							<SelectContent>
								{statusOptions.map((status) => (
									<SelectItem key={status} value={status}>
										{status === "ALL" ? "Semua" : ORDER_STATUS_LABEL[status]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<span className="text-xs font-medium text-muted-foreground">
							Kamar
						</span>
						<Select value={roomFilter} onValueChange={setRoomFilter}>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Semua kamar" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ALL">Semua</SelectItem>
								{rooms.map((room) => (
									<SelectItem key={room.id} value={room.id}>
										{room.number} — {room.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2 md:col-span-2">
						<span className="text-xs font-medium text-muted-foreground">
							Pencarian
						</span>
						<Input
							placeholder="Cari catatan, alasan penolakan, atau nama menu"
							value={searchFilter}
							onChange={(event) => setSearchFilter(event.target.value)}
						/>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Order Board</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<Table>
						<Thead>
							<Tr>
								<Th>Waktu</Th>
								<Th>Kamar</Th>
								<Th>Items</Th>
								<Th>Total</Th>
								<Th>Status</Th>
								<Th>Aksi</Th>
							</Tr>
						</Thead>
						<Tbody>
							{filteredOrders.map((order) => {
								const nextStatus =
									order.status === "ACCEPTED"
										? "IN_PREP"
										: order.status === "IN_PREP"
											? "READY"
											: order.status === "READY"
												? "DELIVERED"
												: null;

								return (
									<Tr key={order.id}>
										<Td className="min-w-[140px]">
											<div className="flex flex-col">
												<span className="text-xs text-muted-foreground">
													#{order.id.slice(0, 6)}
												</span>
												<span>{formatDateTime(order.created_at)}</span>
											</div>
										</Td>
										<Td>
											<div className="flex flex-col">
												<span className="font-medium">{order.room.number}</span>
												<span className="text-xs text-muted-foreground">
													{order.room.label}
												</span>
											</div>
										</Td>
										<Td className="max-w-xs text-xs">
											<ul className="space-y-1">
												{order.items.map((item) => (
													<li key={item.id} className="flex justify-between">
														<span>{item.menu_item_name}</span>
														<span className="text-muted-foreground">
															× {item.quantity}
														</span>
													</li>
												))}
											</ul>
											{order.note && (
												<p className="mt-2 rounded-md bg-muted p-2 text-[11px] text-muted-foreground">
													Note: {order.note}
												</p>
											)}
											{order.rejection_reason && (
												<p className="mt-2 rounded-md bg-rose-50 p-2 text-[11px] text-rose-600">
													Ditolak: {order.rejection_reason}
												</p>
											)}
										</Td>
										<Td className="font-medium">
											{CURRENCY_FORMATTER.format(order.sub_total)}
										</Td>
										<Td>
											<Badge
												className={cn(
													"capitalize",
													ORDER_STATUS_COLORS[order.status],
												)}
											>
												{ORDER_STATUS_LABEL[order.status]}
											</Badge>
										</Td>
										<Td className="space-y-2 text-xs">
											{order.status === "PENDING" && (
												<div className="flex flex-wrap gap-2">
													<Button
														size="sm"
														disabled={isActionPending(order.id)}
														onClick={() => handleAccept(order.id)}
													>
														{isActionPending(order.id) ? (
															<Loader2 className="h-4 w-4 animate-spin" />
														) : (
															"Terima"
														)}
													</Button>
													<Dialog
														open={
															rejectDialog.open &&
															rejectDialog.orderId === order.id
														}
														onOpenChange={(open) => {
															if (open) {
																setRejectDialog({
																	open: true,
																	orderId: order.id,
																});
																setRejectReason("");
															} else {
																setRejectDialog({ open: false });
																setRejectReason("");
															}
														}}
													>
														<DialogTrigger asChild>
															<Button
																type="button"
																variant="destructive"
																size="sm"
																onClick={() => {
																	setRejectDialog({
																		open: true,
																		orderId: order.id,
																	});
																	setRejectReason("");
																}}
															>
																Tolak
															</Button>
														</DialogTrigger>
														<DialogContent>
															<DialogHeader>
																<DialogTitle>Alasan Penolakan</DialogTitle>
															</DialogHeader>
															<Textarea
																autoFocus
																placeholder="Contoh: Menu habis, silakan pilih yang lain"
																value={rejectReason}
																onChange={(event) =>
																	setRejectReason(event.target.value)
																}
															/>
															<DialogFooter>
																<Button
																	type="button"
																	variant="outline"
																	onClick={() =>
																		setRejectDialog({ open: false })
																	}
																>
																	Batal
																</Button>
																<Button
																	type="button"
																	variant="destructive"
																	disabled={
																		!rejectReason.trim() ||
																		isActionPending(order.id)
																	}
																	onClick={handleReject}
																>
																	{isActionPending(order.id) ? (
																		<Loader2 className="h-4 w-4 animate-spin" />
																	) : (
																		"Kirim"
																	)}
																</Button>
															</DialogFooter>
														</DialogContent>
													</Dialog>
												</div>
											)}
											{nextStatus && (
												<Button
													size="sm"
													variant="outline"
													disabled={isActionPending(order.id)}
													onClick={() => handleNextStatus(order.id, nextStatus)}
												>
													{isActionPending(order.id) ? (
														<Loader2 className="h-4 w-4 animate-spin" />
													) : (
														<>{ORDER_STATUS_LABEL[nextStatus]}</>
													)}
												</Button>
											)}
											{order.status === "DELIVERED" && (
												<Button
													size="sm"
													variant="ghost"
													disabled={isActionPending(order.id)}
													onClick={() => handleMarkBilled(order.id)}
												>
													{isActionPending(order.id) ? (
														<Loader2 className="h-4 w-4 animate-spin" />
													) : (
														"Tandai Billed"
													)}
												</Button>
											)}
											{order.status === "BILLED" && (
												<InvoicePrintButton
													href={`/admin/billing/invoice/${order.id}?print=1`}
													label="Cetak Invoice"
													size="sm"
													variant="outline"
													className="w-full justify-center"
												/>
											)}
										</Td>
									</Tr>
								);
							})}
							{filteredOrders.length === 0 && (
								<Tr>
									<Td
										colSpan={6}
										className="py-10 text-center text-sm text-muted-foreground"
									>
										Tidak ada pesanan dengan filter saat ini.
									</Td>
								</Tr>
							)}
						</Tbody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
};
