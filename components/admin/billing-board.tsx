"use client";

import { Download, Loader2, Receipt, RefreshCcw } from "lucide-react";
import Link from "next/link";
import {
	useCallback,
	useEffect,
	useMemo,
	useState,
	useTransition,
} from "react";
import { markAsBilledAction } from "@/app/(admin)/admin/orders/actions";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { InvoicePrintButton } from "@/components/admin/invoice-print-button";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/table";
import {
	CURRENCY_FORMATTER,
	ORDER_STATUS_COLORS,
	ORDER_STATUS_LABEL,
	ORDER_STATUSES,
} from "@/lib/constants";
import type { RoomBillingSummary } from "@/lib/data/billing";
import type { BillingSummaryRow, OrderStatus } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

const statusOptions = ["ALL", ...ORDER_STATUSES] as const;
type StatusFilter = (typeof statusOptions)[number];

interface BillingBoardProps {
	summary: RoomBillingSummary[];
	initialRows: BillingSummaryRow[];
}

export const BillingBoard = ({ summary, initialRows }: BillingBoardProps) => {
	const { client } = useSupabase();
	const [summaries, setSummaries] = useState(summary);
	const [rows, setRows] = useState(initialRows);
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	const fetchRows = useCallback(
		async (status: StatusFilter) => {
			let query = client
				.from("orders")
				.select(
					`id, room_id, guest_id, status, sub_total, created_at, updated_at,
           rooms ( label, number )`,
				)
				.order("created_at", { ascending: true });

			if (status !== "ALL") {
				query = query.eq("status", status);
			}

			const { data, error } = await query;
			if (error) {
				console.error(error);
				setErrorMessage("Gagal memuat data billing");
				return;
			}

			const mapped = (data ?? []).map(
				(order) =>
					({
						order_id: order.id,
						room_id: order.room_id,
						room_label: order.rooms?.label ?? "",
						room_number: order.rooms?.number ?? "",
						guest_id: order.guest_id,
						sub_total: Number(order.sub_total ?? 0),
						status: order.status as OrderStatus,
						created_at: order.created_at,
						updated_at: order.updated_at,
					}) satisfies BillingSummaryRow,
			);

			setRows(mapped);
		},
		[client],
	);

	useEffect(() => {
		fetchRows(statusFilter);
	}, [statusFilter, fetchRows]);

	const totalAmount = useMemo(
		() => rows.reduce((acc, row) => acc + row.sub_total, 0),
		[rows],
	);

	const handleMarkRoomBilled = (roomId: string) => {
		setErrorMessage(null);
		startTransition(async () => {
			await markAsBilledAction({ roomId });
			setSummaries((prev) => prev.filter((item) => item.room_id !== roomId));
			await fetchRows(statusFilter);
		});
	};

	return (
		<div className="space-y-6">
			{errorMessage && <Alert variant="destructive">{errorMessage}</Alert>}
			<Card>
				<CardHeader className="flex items-center flex-row justify-between gap-2">
					<CardTitle className="flex items-center gap-2 text-lg">
						<Receipt className="h-5 w-5" /> Ringkasan Unbilled
					</CardTitle>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => fetchRows(statusFilter)}
					>
						<RefreshCcw className="mr-1 h-4 w-4" /> Muat ulang
					</Button>
				</CardHeader>
				<CardContent className="p-0">
					<Table>
						<Thead>
							<Tr>
								<Th>Kamar</Th>
								<Th>Order</Th>
								<Th>Delivered</Th>
								<Th>Total</Th>
								<Th>Aksi</Th>
							</Tr>
						</Thead>
						<Tbody>
							{summaries.map((item) => (
								<Tr key={item.room_id}>
									<Td>
										<div className="flex flex-col">
											<span className="font-medium">{item.room_number}</span>
											<span className="text-xs text-muted-foreground">
												{item.room_label}
											</span>
										</div>
									</Td>
									<Td>{item.order_count}</Td>
									<Td>{item.delivered_count}</Td>
									<Td className="font-medium">
										{CURRENCY_FORMATTER.format(item.total_amount)}
									</Td>
									<Td>
										<Button
											size="sm"
											variant="outline"
											disabled={isPending}
											onClick={() => handleMarkRoomBilled(item.room_id)}
										>
											{isPending ? (
												<Loader2 className="h-4 w-4 animate-spin" />
											) : (
												"Mark Billed"
											)}
										</Button>
									</Td>
								</Tr>
							))}
							{summaries.length === 0 && (
								<Tr>
									<Td
										colSpan={5}
										className="py-10 text-center text-sm text-muted-foreground"
									>
										Semua kamar sudah ditagihkan.
									</Td>
								</Tr>
							)}
						</Tbody>
					</Table>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-wrap items-center flex-row justify-between gap-4">
					<CardTitle>Detail Order</CardTitle>
					<div className="flex flex-wrap items-center gap-2">
						<Select
							value={statusFilter}
							onValueChange={(value) => setStatusFilter(value as StatusFilter)}
						>
							<SelectTrigger className="w-[180px]">
								<SelectValue placeholder="Status" />
							</SelectTrigger>
							<SelectContent>
								{statusOptions.map((status) => (
									<SelectItem key={status} value={status}>
										{status === "ALL" ? "Semua" : ORDER_STATUS_LABEL[status]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Button asChild variant="outline">
							<Link href={`/admin/billing/export?status=${statusFilter}`}>
								<Download className="mr-2 h-4 w-4" /> Export CSV
							</Link>
						</Button>
					</div>
				</CardHeader>
				<CardContent className="space-y-4 p-0">
					<Table>
						<Thead>
							<Tr>
								<Th>Order ID</Th>
								<Th>Kamar</Th>
								<Th>Status</Th>
								<Th>Total</Th>
								<Th>Dibuat</Th>
								<Th className="text-right">Aksi</Th>
							</Tr>
						</Thead>
						<Tbody>
							{rows.map((row) => (
								<Tr key={row.order_id}>
									<Td className="font-mono text-xs">{row.order_id}</Td>
									<Td>
										<div className="flex flex-col">
											<span className="font-medium">{row.room_number}</span>
											<span className="text-xs text-muted-foreground">
												{row.room_label}
											</span>
										</div>
									</Td>
									<Td>
										<Badge
											className={cn(
												"capitalize",
												ORDER_STATUS_COLORS[row.status],
											)}
										>
											{ORDER_STATUS_LABEL[row.status]}
										</Badge>
									</Td>
									<Td>{CURRENCY_FORMATTER.format(row.sub_total)}</Td>
									<Td className="text-xs text-muted-foreground">
										{new Date(row.created_at).toLocaleString("id-ID")}
									</Td>
									<Td className="text-right">
										{row.status === "BILLED" ? (
											<InvoicePrintButton
												href={`/admin/billing/invoice/${row.order_id}?print=1`}
												label="Cetak"
												size="sm"
												variant="outline"
											/>
										) : (
											<span className="text-xs text-muted-foreground">-</span>
										)}
									</Td>
								</Tr>
							))}
							{rows.length === 0 && (
								<Tr>
									<Td
										colSpan={6}
										className="py-8 text-center text-sm text-muted-foreground"
									>
										Tidak ada order untuk filter ini.
									</Td>
								</Tr>
							)}
						</Tbody>
					</Table>
					<div className="flex items-center justify-end border-t border-border px-6 py-4 text-sm font-medium">
						Total: {CURRENCY_FORMATTER.format(totalAmount)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
};
