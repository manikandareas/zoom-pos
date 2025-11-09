// Xendit API Types
// Documentation: https://developers.xendit.co/api-reference/

export type PaymentMethod =
  | "QRIS"
  | "VIRTUAL_ACCOUNT"
  | "EWALLET"
  | "RETAIL_OUTLET"
  | "CREDIT_CARD";

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "EXPIRED";

export type XenditInvoiceStatus =
  | "PENDING"
  | "PAID"
  | "SETTLED"
  | "EXPIRED";

export type XenditPaymentChannel =
  | "QRIS"
  | "BCA"
  | "BNI"
  | "BRI"
  | "MANDIRI"
  | "PERMATA"
  | "GOPAY"
  | "OVO"
  | "DANA"
  | "SHOPEEPAY"
  | "LINKAJA"
  | "ALFAMART"
  | "INDOMARET";

// Xendit Invoice Request
export interface CreateInvoiceRequest {
  external_id: string;
  amount: number;
  payer_email?: string;
  description: string;
  invoice_duration?: number; // in seconds, default 86400 (24 hours)
  success_redirect_url?: string;
  failure_redirect_url?: string;
  payment_methods?: PaymentMethod[];
  currency?: string; // default "IDR"
  customer?: {
    given_names?: string;
    email?: string;
    mobile_number?: string;
  };
  customer_notification_preference?: {
    invoice_created?: string[];
    invoice_reminder?: string[];
    invoice_paid?: string[];
    invoice_expired?: string[];
  };
  items?: Array<{
    name: string;
    quantity: number;
    price: number;
    category?: string;
  }>;
}

// Xendit Invoice Response
export interface XenditInvoice {
  id: string;
  external_id: string;
  user_id: string;
  status: XenditInvoiceStatus;
  merchant_name: string;
  merchant_profile_picture_url: string;
  amount: number;
  payer_email?: string;
  description: string;
  expiry_date: string;
  invoice_url: string;
  available_banks: Array<{
    bank_code: string;
    collection_type: string;
    transfer_amount: number;
    bank_branch: string;
    account_holder_name: string;
    identity_amount: number;
  }>;
  available_retail_outlets: Array<{
    retail_outlet_name: string;
    payment_code: string;
    transfer_amount: number;
  }>;
  available_ewallets: Array<{
    ewallet_type: string;
  }>;
  available_qr_codes: Array<{
    qr_string: string;
  }>;
  should_exclude_credit_card: boolean;
  should_send_email: boolean;
  created: string;
  updated: string;
  currency: string;
  paid_amount?: number;
  paid_at?: string;
  payment_method?: string;
  payment_channel?: XenditPaymentChannel;
  payment_destination?: string;
  items?: Array<{
    name: string;
    quantity: number;
    price: number;
    category?: string;
  }>;
}

// Xendit Webhook Payload for Invoice
export interface XenditInvoiceWebhook {
  id: string;
  external_id: string;
  user_id: string;
  status: XenditInvoiceStatus;
  merchant_name: string;
  amount: number;
  paid_amount?: number;
  paid_at?: string;
  payer_email?: string;
  description: string;
  adjusted_received_amount?: number;
  fees_paid_amount?: number;
  updated: string;
  created: string;
  currency: string;
  payment_method?: string;
  payment_channel?: XenditPaymentChannel;
  payment_destination?: string;
  payment_id?: string;
  payment_details?: {
    receipt_id?: string;
    source?: string;
  };
}

// Error Response from Xendit
export interface XenditError {
  error_code: string;
  message: string;
  errors?: Array<{
    path: string[];
    message: string;
  }>;
}

// Payment Intent (our internal type)
export interface PaymentIntent {
  external_id: string;
  order_id?: string;
  amount: number;
  payment_methods: PaymentMethod[];
  customer_phone?: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

// Payment Status Check Result
export interface PaymentStatusResult {
  payment_id: string;
  external_id: string;
  status: PaymentStatus;
  amount: number;
  paid_amount?: number;
  paid_at?: string;
  payment_method?: string;
  payment_channel?: XenditPaymentChannel;
  invoice_url?: string;
  expiry_date?: string;
}
