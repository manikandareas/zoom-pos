import type { OrderStatus } from "./supabase/types";

export const ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "IN_PREP",
  "READY",
  "DELIVERED",
  "BILLED",
];

export const PROGRESS_STATUSES: OrderStatus[] = [
  "PENDING",
  "ACCEPTED",
  "IN_PREP",
  "READY",
  "DELIVERED",
  "BILLED",
];

export const PROCESSABLE_STATUSES: OrderStatus[] = [
  "PENDING",
  "ACCEPTED",
  "IN_PREP",
  "READY",
  "DELIVERED",
];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  IN_PREP: "In Prep",
  READY: "Ready",
  DELIVERED: "Delivered",
  BILLED: "Billed",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  ACCEPTED: "bg-sky-100 text-sky-700",
  REJECTED: "bg-rose-100 text-rose-700",
  IN_PREP: "bg-indigo-100 text-indigo-700",
  READY: "bg-emerald-100 text-emerald-700",
  DELIVERED: "bg-teal-100 text-teal-700",
  BILLED: "bg-slate-200 text-slate-800",
};

export const CURRENCY_FORMATTER = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
});
