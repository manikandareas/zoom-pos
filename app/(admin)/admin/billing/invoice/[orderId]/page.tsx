import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvoiceToolbar } from "@/components/admin/invoice-toolbar";
import { CURRENCY_FORMATTER, ORDER_STATUS_LABEL } from "@/lib/constants";
import { getOrderWithItems } from "@/lib/data/orders";
import { requireAdmin } from "@/lib/supabase/auth";

interface InvoicePageProps {
	params: Promise<{
		orderId: string;
	}>;
	searchParams?: Record<string, string | string[] | undefined>;
}

const formatDateTime = (iso: string) =>
	format(new Date(iso), "dd MMM yyyy HH:mm", { locale: localeId });

const pickParam = (value: string | string[] | undefined) =>
	Array.isArray(value) ? value[0] : value;

const PRINT_STYLES = `
@media print {
	@page {
		size: 58mm auto;
		margin: 0;
	}
	body.invoice-print-mode {
		margin: 0;
		padding: 0;
		background: #ffffff !important;
	}
	body.invoice-print-mode header[data-admin-header] {
		display: none !important;
	}
	body.invoice-print-mode main[data-admin-main] {
		margin: 0 !important;
		padding: 0 !important;
		max-width: none !important;
		width: 100% !important;
		background: #ffffff !important;
	}
	body.invoice-print-mode main[data-admin-main] > *:not(#invoice-wrapper) {
		display: none !important;
	}
	body.invoice-print-mode #invoice-wrapper {
		padding: 0 !important;
		min-height: auto !important;
		background: #ffffff !important;
	}
	body.invoice-print-mode #invoice-root {
		width: 58mm !important;
		min-width: 58mm !important;
		max-width: 58mm !important;
		margin: 0 auto !important;
		padding: 4mm 3mm !important;
		box-shadow: none !important;
		border: none !important;
	}
	body.invoice-print-mode .print-hide {
		display: none !important;
	}
	body.invoice-print-mode .print-block {
		display: block !important;
	}
}
`;

export async function generateMetadata({
	params,
}: InvoicePageProps): Promise<Metadata> {
	const { orderId } = await params;
	return {
		title: `Invoice ${orderId} - Hotel Zoom`,
	};
}

export default async function AdminBillingInvoicePage({
	params,
	searchParams = {},
}: InvoicePageProps) {
	await requireAdmin();
	const { orderId } = await params;
	const order = await getOrderWithItems(orderId);
	if (!order) {
		notFound();
	}

	const autoPrint = pickParam(searchParams.print) === "1";
	const issuedAt = order.updated_at ?? order.created_at;
	const itemsWithTotal = order.items.map((item) => ({
		...item,
		total: item.unit_price * item.quantity,
	}));
	const itemsTotal = itemsWithTotal.reduce((acc, item) => acc + item.total, 0);

	return (
		<div
			id="invoice-wrapper"
			className="mx-auto flex min-h-screen w-full max-w-5xl flex-col bg-white px-4 py-6 text-sm text-slate-900 md:px-6 md:py-8"
		>
			<style suppressHydrationWarning>{PRINT_STYLES}</style>
			<InvoiceToolbar autoPrint={autoPrint} />
			<div
				id="invoice-root"
				className="mx-auto mt-6 w-full max-w-md rounded-lg border border-slate-200 bg-white px-6 py-6 text-sm text-slate-900 shadow-sm print:mt-0 print:w-[58mm] print:min-w-[58mm] print:max-w-[58mm] print:rounded-none print:border-0 print:px-[3mm] print:py-[4mm] print:text-[10px] print:shadow-none"
			>
				<header className="space-y-4">
					<div>
						<p className="text-xs font-semibold uppercase tracking-wide text-slate-500 print:text-[9px]">
							Hotel Zoom
						</p>
						<h1 className="text-2xl font-semibold tracking-tight print:text-base">
							Invoice
						</h1>
					</div>
					<div className="space-y-1 text-xs text-slate-600 print:text-[9px]">
						<p className="font-semibold text-slate-800 print:text-[10px]">
							Invoice #{order.id.slice(0, 8).toUpperCase()}
						</p>
						<p>Diterbitkan: {formatDateTime(issuedAt)}</p>
						<p>Status: {ORDER_STATUS_LABEL[order.status]}</p>
					</div>
				</header>
				<section className="mt-6 space-y-4 border-t border-slate-200 pt-4 text-xs text-slate-600 print:border-t print:border-slate-300 print:text-[9px]">
					<div className="space-y-1">
						<p className="text-[13px] font-semibold text-slate-900 print:text-[11px]">
							Kamar {order.room.number}
						</p>
						<p>{order.room.label}</p>
					</div>
					<div className="space-y-1">
						<p>
							ID Order:{" "}
							<span className="font-medium text-slate-900 print:text-[10px]">
								{order.id}
							</span>
						</p>
						<p>Dibuat: {formatDateTime(order.created_at)}</p>
						<p>Guest ID: {order.guest_id}</p>
					</div>
				</section>
				<section className="mt-6 space-y-3 border-t border-slate-200 pt-4 print:border-slate-300">
					<p className="text-sm font-semibold text-slate-900 print:text-[10px]">
						Detail Menu
					</p>
					<div className="space-y-3">
						{itemsWithTotal.map((item) => (
							<div key={item.id} className="space-y-1">
								<div className="flex items-center justify-between gap-3 text-sm font-medium text-slate-900 print:text-[10px]">
									<span className="flex-1 break-words">
										{item.menu_item_name}
									</span>
									<span>{CURRENCY_FORMATTER.format(item.total)}</span>
								</div>
								<div className="flex items-start justify-between gap-3 text-xs text-slate-600 print:text-[9px]">
									<span>
										{item.quantity} ×{" "}
										{CURRENCY_FORMATTER.format(item.unit_price)}
									</span>
									{item.note ? (
										<span className="flex-1 text-right text-[11px] text-slate-500 print:text-[9px]">
											{item.note}
										</span>
									) : null}
								</div>
							</div>
						))}
						{itemsWithTotal.length === 0 && (
							<p className="text-center text-xs text-slate-500 print:text-[9px]">
								Tidak ada item pada order ini.
							</p>
						)}
					</div>
				</section>
				<section className="mt-6 space-y-2 border-t border-slate-200 pt-4 text-sm text-slate-900 print:border-slate-300 print:text-[10px]">
					<div className="flex items-center justify-between gap-4">
						<span>Subtotal</span>
						<span>{CURRENCY_FORMATTER.format(itemsTotal)}</span>
					</div>
					<div className="flex items-center justify-between gap-4 text-lg font-semibold print:text-[11px]">
						<span>Total Tagihan</span>
						<span>{CURRENCY_FORMATTER.format(order.sub_total)}</span>
					</div>
				</section>
				{order.note && (
					<section className="mt-6 space-y-2 rounded-md bg-slate-50 px-4 py-3 text-xs text-slate-600 print:bg-transparent print:px-0 print:py-0 print:text-[9px]">
						<p className="font-medium text-slate-800 print:text-[10px]">
							Catatan Order
						</p>
						<p>{order.note}</p>
					</section>
				)}
				<footer className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-500 print:border-slate-300 print:text-[9px]">
					<p>
						Terima kasih telah menggunakan layanan Hotel Zoom. Simpan invoice
						ini sebagai bukti pembayaran.
					</p>
				</footer>
			</div>
		</div>
	);
}
