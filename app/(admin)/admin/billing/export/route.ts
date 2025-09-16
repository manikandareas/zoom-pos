import { NextResponse } from "next/server";
import { getBillingRows } from "@/lib/data/billing";
import { requireAdmin } from "@/lib/supabase/auth";
import type { OrderStatus } from "@/lib/supabase/types";

const VALID_STATUSES = new Set<OrderStatus | "ALL">([
  "ALL",
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "IN_PREP",
  "READY",
  "DELIVERED",
  "BILLED",
]);

export async function GET(request: Request) {
  await requireAdmin();
  const { searchParams } = new URL(request.url);
  const statusParam = (searchParams.get("status") ?? "ALL").toUpperCase();

  const status = VALID_STATUSES.has(statusParam as OrderStatus | "ALL")
    ? (statusParam as OrderStatus | "ALL")
    : "ALL";

  const rows = await getBillingRows(status);

  const header = [
    "order_id",
    "room_number",
    "room_label",
    "guest_id",
    "status",
    "sub_total",
    "created_at",
    "updated_at",
  ];

  const csvBody = rows
    .map((row) =>
      [
        row.order_id,
        row.room_number,
        row.room_label,
        row.guest_id,
        row.status,
        row.sub_total.toFixed(2),
        row.created_at,
        row.updated_at,
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

  const csv = `${header.join(",")}\n${csvBody}`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="billing-${status.toLowerCase()}-${Date.now()}.csv"`,
    },
  });
}
