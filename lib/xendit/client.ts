// Xendit API Client
// Documentation: https://developers.xendit.co/api-reference/

import type {
  CreateInvoiceRequest,
  XenditInvoice,
  XenditError,
  PaymentIntent,
  PaymentStatusResult,
  PaymentStatus,
  XenditInvoiceStatus,
} from "./types";

const XENDIT_API_URL = "https://api.xendit.co";
const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY;

if (!XENDIT_SECRET_KEY) {
  throw new Error("XENDIT_SECRET_KEY environment variable is required");
}

// Base64 encode secret key for Basic Auth
const authHeader = `Basic ${Buffer.from(`${XENDIT_SECRET_KEY}:`).toString("base64")}`;

/**
 * Create Xendit invoice for payment
 */
export async function createXenditInvoice(
  intent: PaymentIntent,
): Promise<XenditInvoice> {
  const payload: CreateInvoiceRequest = {
    external_id: intent.external_id,
    amount: intent.amount,
    description: `Hotel Zoom - Food Order`,
    invoice_duration: 3600, // 1 hour expiry
    currency: "IDR",
    payment_methods: intent.payment_methods,
    customer: intent.customer_phone
      ? {
          mobile_number: intent.customer_phone,
        }
      : undefined,
    items: intent.items,
    customer_notification_preference: {
      invoice_created: intent.customer_phone ? ["sms"] : [],
      invoice_paid: intent.customer_phone ? ["sms"] : [],
      invoice_expired: intent.customer_phone ? ["sms"] : [],
    },
  };

  try {
    const response = await fetch(`${XENDIT_API_URL}/v2/invoices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error: XenditError = await response.json();
      throw new Error(
        `Xendit API error: ${error.error_code} - ${error.message}`,
      );
    }

    const invoice: XenditInvoice = await response.json();
    return invoice;
  } catch (error) {
    console.error("Failed to create Xendit invoice:", error);
    throw error;
  }
}

/**
 * Get invoice status from Xendit
 */
export async function getXenditInvoice(
  invoiceId: string,
): Promise<XenditInvoice> {
  try {
    const response = await fetch(
      `${XENDIT_API_URL}/v2/invoices/${invoiceId}`,
      {
        method: "GET",
        headers: {
          Authorization: authHeader,
        },
      },
    );

    if (!response.ok) {
      const error: XenditError = await response.json();
      throw new Error(
        `Xendit API error: ${error.error_code} - ${error.message}`,
      );
    }

    const invoice: XenditInvoice = await response.json();
    return invoice;
  } catch (error) {
    console.error("Failed to get Xendit invoice:", error);
    throw error;
  }
}

/**
 * Check payment status and return normalized result
 */
export async function checkPaymentStatus(
  invoiceId: string,
): Promise<PaymentStatusResult> {
  const invoice = await getXenditInvoice(invoiceId);

  return {
    payment_id: invoice.id,
    external_id: invoice.external_id,
    status: mapXenditStatus(invoice.status),
    amount: invoice.amount,
    paid_amount: invoice.paid_amount,
    paid_at: invoice.paid_at,
    payment_method: invoice.payment_method,
    payment_channel: invoice.payment_channel,
    invoice_url: invoice.invoice_url,
    expiry_date: invoice.expiry_date,
  };
}

/**
 * Map Xendit invoice status to our internal payment status
 */
function mapXenditStatus(status: XenditInvoiceStatus): PaymentStatus {
  switch (status) {
    case "PENDING":
      return "PENDING";
    case "PAID":
    case "SETTLED":
      return "PAID";
    case "EXPIRED":
      return "EXPIRED";
    default:
      return "FAILED";
  }
}

/**
 * Expire an invoice (useful for order cancellation)
 */
export async function expireXenditInvoice(
  invoiceId: string,
): Promise<XenditInvoice> {
  try {
    const response = await fetch(
      `${XENDIT_API_URL}/v2/invoices/${invoiceId}/expire!`,
      {
        method: "POST",
        headers: {
          Authorization: authHeader,
        },
      },
    );

    if (!response.ok) {
      const error: XenditError = await response.json();
      throw new Error(
        `Xendit API error: ${error.error_code} - ${error.message}`,
      );
    }

    const invoice: XenditInvoice = await response.json();
    return invoice;
  } catch (error) {
    console.error("Failed to expire Xendit invoice:", error);
    throw error;
  }
}
