import { BillingBoard } from "@/components/admin/billing-board";
import { getBillingRows, getUnbilledOrdersByRoom } from "@/lib/data/billing";

export const metadata = {
  title: "Billing - Hotel Zoom",
};

export default async function AdminBillingPage() {
  const [summary, billingRows] = await Promise.all([
    getUnbilledOrdersByRoom(),
    getBillingRows(),
  ]);

  return <BillingBoard summary={summary} initialRows={billingRows} />;
}
