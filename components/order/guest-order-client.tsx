"use client";

import {
	type SubmitOrderResult,
	submitOrderAction,
} from "@/app/(guest)/order/[code]/actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
	Sheet,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useRoomChannel } from "@/hooks/use-room-channel";
import {
	CURRENCY_FORMATTER,
	ORDER_STATUS_COLORS,
	ORDER_STATUS_LABEL,
	PROGRESS_STATUSES,
} from "@/lib/constants";
import type { CategoryWithItems } from "@/lib/data/menu";
import type { Order, OrderItem, OrderStatus } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { useActionState, useCallback, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

interface GuestOrderClientProps {
	room: {
		id: string;
		label: string;
		number: string;
	};
	roomCode: string;
	categories: CategoryWithItems[];
	existingOrders: (Order & { items: OrderItem[] })[];
	guestId: string;
}

interface CartItem {
	menuItemId: string;
	name: string;
	price: number;
	quantity: number;
}

const SubmitButton = ({
	disabled,
	className,
}: {
	disabled: boolean;
	className?: string;
}) => {
	const { pending } = useFormStatus();
	return (
		<Button type="submit" disabled={disabled || pending} className={className}>
			{pending ? "Mengirim..." : "Kirim Pesanan"}
		</Button>
	);
};

const initialActionState: SubmitOrderResult = {};

export const GuestOrderClient = ({
	room,
	roomCode,
	categories,
	existingOrders,
	guestId,
}: GuestOrderClientProps) => {
	const [cart, setCart] = useState<Record<string, CartItem>>({});
	const [note, setNote] = useState("");
	const [isSheetOpen, setSheetOpen] = useState(false);
	const [orders, setOrders] = useState(existingOrders);
	const [actionState, formAction] = useActionState(
		submitOrderAction,
		initialActionState,
	);

	const cartItems = useMemo(() => Object.values(cart), [cart]);
	const totalItems = useMemo(
		() => cartItems.reduce((acc, item) => acc + item.quantity, 0),
		[cartItems],
	);
	const subTotal = useMemo(
		() => cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0),
		[cartItems],
	);

	useEffect(() => {
		if (actionState?.success) {
			const noteSnapshot = note;
			const cartSnapshot = cartItems;
			const totalSnapshot = subTotal;
			setCart({});
			setNote("");
			if (!actionState.orderId) return;

			const createdAt = new Date().toISOString();
			setOrders((prev) => [
				{
					id: actionState.orderId as string,
					room_id: room.id,
					guest_id: guestId,
					status: "PENDING",
					note: noteSnapshot || null,
					sub_total: totalSnapshot,
					rejection_reason: null,
					created_at: createdAt,
					updated_at: createdAt,
					items: cartSnapshot.map((item) => ({
						id: `${actionState.orderId}-${item.menuItemId}`,
						order_id: actionState.orderId as string,
						menu_item_id: item.menuItemId,
						menu_item_name: item.name,
						unit_price: item.price,
						quantity: item.quantity,
						note: null,
						created_at: createdAt,
					})),
				},
				...prev,
			]);
			setSheetOpen(false);
		}
	}, [actionState, cartItems, guestId, note, room.id, subTotal]);

	const handleStatusBroadcast = useCallback(
		(payload: { order_id: string; status: string; reason?: string | null }) => {
			setOrders((prev) =>
				prev.map((order) =>
					order.id === payload.order_id
						? {
								...order,
								status: payload.status as OrderStatus,
								rejection_reason: payload.reason ?? order.rejection_reason,
								updated_at: new Date().toISOString(),
							}
						: order,
				),
			);
		},
		[],
	);

	useRoomChannel(room.id, handleStatusBroadcast);

	const payload = useMemo(() => {
		return JSON.stringify({
			room_id: room.id,
			room_code: roomCode,
			note: note || null,
			items: cartItems.map((item) => ({
				menu_item_id: item.menuItemId,
				menu_item_name: item.name,
				unit_price: item.price,
				quantity: item.quantity,
				note: null,
			})),
		});
	}, [cartItems, note, room.id, roomCode]);

	const addToCart = (item: { id: string; name: string; price: number }) => {
		setCart((prev) => {
			const current = prev[item.id];
			const nextQty = (current?.quantity ?? 0) + 1;
			return {
				...prev,
				[item.id]: {
					menuItemId: item.id,
					name: item.name,
					price: item.price,
					quantity: nextQty,
				},
			};
		});
		setSheetOpen(true);
	};

	const decrementItem = (id: string) => {
		setCart((prev) => {
			const current = prev[id];
			if (!current) return prev;
			const nextQty = current.quantity - 1;
			if (nextQty <= 0) {
				const { [id]: _removed, ...rest } = prev;
				return rest;
			}
			return {
				...prev,
				[id]: { ...current, quantity: nextQty },
			};
		});
	};

	const incrementItem = (id: string) => {
		setCart((prev) => {
			const current = prev[id];
			if (!current) return prev;
			return {
				...prev,
				[id]: { ...current, quantity: current.quantity + 1 },
			};
		});
	};

	const hasCartItems = cartItems.length > 0;

	return (
		<div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-24 pt-10">
			<header className="flex flex-col gap-1">
				<Badge variant="outline" className="w-fit">
					Kamar {room.number}
				</Badge>
				<h1 className="text-2xl font-semibold">
					Hai, selamat datang di {room.label}
				</h1>
				<p className="text-sm text-muted-foreground">
					Silakan pilih menu favoritmu dan kami akan memproses pesananmu segera.
				</p>
			</header>

			{actionState?.error && (
				<Alert variant="destructive">{actionState.error}</Alert>
			)}
			{actionState?.success && !actionState.error && (
				<Alert variant="success">Pesanan kamu berhasil dikirim.</Alert>
			)}
			{categories.length === 0 && (
				<Alert>
					Menu belum tersedia untuk kamar ini. Silakan hubungi resepsionis untuk
					bantuan.
				</Alert>
			)}

			<div className="grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					{categories.map((category) => (
						<section key={category.id} className="space-y-3">
							<div className="flex items-center justify-between">
								<h2 className="text-lg font-semibold">{category.name}</h2>
								<Badge variant="outline">{category.items.length} menu</Badge>
							</div>
							<div className="grid gap-3">
								{category.items.map((item) => (
									<Card key={item.id}>
										<CardHeader className="flex flex-row items-start justify-between gap-4">
											<div>
												<CardTitle>{item.name}</CardTitle>
												<CardDescription className="mt-1">
													{CURRENCY_FORMATTER.format(item.price)}
												</CardDescription>
											</div>
										</CardHeader>
										<CardContent className="flex items-center justify-between gap-4 pt-0">
											<Button size="sm" onClick={() => addToCart(item)}>
												<ShoppingCart className="mr-2 h-4 w-4" /> Tambah
											</Button>
											{cart[item.id] && (
												<div className="flex items-center gap-2">
													<Button
														size="icon"
														variant="ghost"
														onClick={() => decrementItem(item.id)}
														aria-label="Kurangi"
													>
														<Minus className="h-4 w-4" />
													</Button>
													<span className="text-sm font-medium">
														{cart[item.id].quantity}
													</span>
													<Button
														size="icon"
														variant="ghost"
														onClick={() => incrementItem(item.id)}
														aria-label="Tambah"
													>
														<Plus className="h-4 w-4" />
													</Button>
												</div>
											)}
										</CardContent>
									</Card>
								))}
							</div>
						</section>
					))}
				</div>

				<aside className="hidden md:block">
					<Card className="sticky top-24 p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-semibold">Keranjang</p>
								<p className="text-xs text-muted-foreground">
									{totalItems} item dipilih
								</p>
							</div>
							<Badge>{totalItems}</Badge>
						</div>
						{!hasCartItems ? (
							<p className="mt-6 text-sm text-muted-foreground">
								Tambahkan menu untuk mulai memesan.
							</p>
						) : (
							<form action={formAction} className="mt-6 flex flex-col gap-4">
								<input type="hidden" name="payload" value={payload} />
								<div className="space-y-3">
									{cartItems.map((item) => (
										<div
											key={item.menuItemId}
											className="flex items-center justify-between"
										>
											<div>
												<p className="text-sm font-semibold">{item.name}</p>
												<p className="text-xs text-muted-foreground">
													{CURRENCY_FORMATTER.format(item.price)} ×{" "}
													{item.quantity}
												</p>
											</div>
											<div className="flex items-center gap-2">
												<Button
													type="button"
													size="icon"
													variant="ghost"
													onClick={() => decrementItem(item.menuItemId)}
												>
													<Minus className="h-4 w-4" />
												</Button>
												<span className="text-sm font-medium">
													{item.quantity}
												</span>
												<Button
													type="button"
													size="icon"
													variant="ghost"
													onClick={() => incrementItem(item.menuItemId)}
												>
													<Plus className="h-4 w-4" />
												</Button>
											</div>
										</div>
									))}
								</div>
								<div className="space-y-2">
									<label htmlFor="note" className="text-xs font-medium text-muted-foreground">
										Catatan (opsional)
									</label>
									<Textarea
										id="note"
										placeholder="Contoh: tanpa bawang, level pedas sedang"
										value={note}
										onChange={(event) => setNote(event.target.value)}
										name="note"
									/>
								</div>
								<div className="flex items-center justify-between text-sm font-medium">
									<span>Total</span>
									<span>{CURRENCY_FORMATTER.format(subTotal)}</span>
								</div>
								<SubmitButton disabled={!hasCartItems} />
							</form>
						)}
					</Card>
				</aside>
			</div>

			<section className="space-y-3">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold">Riwayat Pesanan</h2>
					<Badge variant="outline">{orders.length} pesanan</Badge>
				</div>
				{orders.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						Belum ada pesanan. Pilih menu dan checkout untuk memulai.
					</p>
				) : (
					<div className="space-y-3">
						{orders.map((order) => (
							<Card key={order.id}>
								<CardHeader className="flex flex-row items-center justify-between gap-4">
									<div>
										<CardTitle className="text-base">
											Order #{order.id.slice(0, 6)}
										</CardTitle>
										<CardDescription>
											{new Date(order.created_at).toLocaleString("id-ID")}
										</CardDescription>
									</div>
									<Badge
										className={cn(
											"capitalize",
											ORDER_STATUS_COLORS[order.status],
										)}
									>
										{ORDER_STATUS_LABEL[order.status]}
									</Badge>
								</CardHeader>
								<CardContent className="space-y-3">
									<ul className="space-y-1 text-sm">
										{order.items.map((item) => (
											<li
												key={item.menu_item_id}
												className="flex justify-between"
											>
												<span>
													{item.menu_item_name}
													<span className="text-muted-foreground">
														{" "}
														× {item.quantity}
													</span>
												</span>
												<span>
													{CURRENCY_FORMATTER.format(
														item.unit_price * item.quantity,
													)}
												</span>
											</li>
										))}
									</ul>
									<Separator className="my-2" />
									<div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
										{PROGRESS_STATUSES.map((status, index) => {
											const isReached =
												PROGRESS_STATUSES.indexOf(order.status) >= index;
											return (
												<span
													key={status}
													className={cn(
														"rounded-full border px-2 py-1",
														isReached
															? "border-primary/40 bg-primary/10 text-primary"
															: "border-border",
													)}
												>
													{ORDER_STATUS_LABEL[status]}
												</span>
											);
										})}
									</div>
									<div className="flex items-center justify-between text-sm font-medium">
										<span>Total</span>
										<span>{CURRENCY_FORMATTER.format(order.sub_total)}</span>
									</div>
									{order.rejection_reason && (
										<Alert variant="destructive" className="text-xs">
											Ditolak: {order.rejection_reason}
										</Alert>
									)}
								</CardContent>
							</Card>
						))}
					</div>
				)}
			</section>

			<Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
				<SheetTrigger asChild>
					<Button className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full px-6 shadow-lg md:hidden">
						<ShoppingCart className="h-4 w-4" /> Keranjang ({totalItems})
					</Button>
				</SheetTrigger>
				<SheetContent side="bottom" className="h-auto rounded-t-3xl">
					<SheetHeader>
						<SheetTitle>Keranjang</SheetTitle>
					</SheetHeader>
					{!hasCartItems ? (
						<p className="pt-4 text-sm text-muted-foreground">
							Belum ada item di keranjang.
						</p>
					) : (
						<form action={formAction} className="flex flex-col gap-4 pt-4">
							<input type="hidden" name="payload" value={payload} />
							<div className="space-y-3">
								{cartItems.map((item) => (
									<div
										key={item.menuItemId}
										className="flex items-center justify-between"
									>
										<div>
											<p className="text-sm font-semibold">{item.name}</p>
											<p className="text-xs text-muted-foreground">
												{CURRENCY_FORMATTER.format(item.price)} ×{" "}
												{item.quantity}
											</p>
										</div>
										<div className="flex items-center gap-2">
											<Button
												type="button"
												size="icon"
												variant="ghost"
												onClick={() => decrementItem(item.menuItemId)}
											>
												<Minus className="h-4 w-4" />
											</Button>
											<span className="text-sm font-medium">
												{item.quantity}
											</span>
											<Button
												type="button"
												size="icon"
												variant="ghost"
												onClick={() => incrementItem(item.menuItemId)}
											>
												<Plus className="h-4 w-4" />
											</Button>
										</div>
									</div>
								))}
							</div>
							<div className="space-y-2">
								<label htmlFor="note" className="text-xs font-medium text-muted-foreground">
									Catatan (opsional)
								</label>
								<Textarea
									id="note"
									placeholder="Contoh: tanpa bawang, level pedas sedang"
									value={note}
									onChange={(event) => setNote(event.target.value)}
									name="note"
								/>
							</div>
							<div className="flex items-center justify-between text-sm font-medium">
								<span>Total</span>
								<span>{CURRENCY_FORMATTER.format(subTotal)}</span>
							</div>
							<SheetFooter>
								<SubmitButton disabled={!hasCartItems} className="w-full" />
							</SheetFooter>
						</form>
					)}
				</SheetContent>
			</Sheet>
		</div>
	);
};
