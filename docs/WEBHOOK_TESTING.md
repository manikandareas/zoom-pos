# Xendit Webhook Testing Guide

## Setup

### 1. Get Verification Token dari Xendit Dashboard

1. Login ke [Xendit Dashboard](https://dashboard.xendit.co)
2. Pilih environment (Test Mode untuk development)
3. Go to **Settings → Developers → Webhooks**
4. Copy **Verification Token** (bukan Callback Token!)
5. Paste ke `.env.local`:
   ```bash
   XENDIT_WEBHOOK_TOKEN=your_verification_token_here
   ```

⚠️ **PENTING:** Test mode dan Live mode punya token berbeda!

### 2. Setup Webhook URL

#### Production
```
https://your-domain.com/api/webhooks/xendit
```

#### Local Development dengan ngrok

1. Install ngrok: `brew install ngrok` (Mac) atau download dari [ngrok.com](https://ngrok.com)

2. Start development server:
   ```bash
   bun run dev
   ```

3. Di terminal baru, start ngrok:
   ```bash
   ngrok http 3000
   ```

4. Copy HTTPS URL dari ngrok (contoh: `https://abc123.ngrok.io`)

5. Update webhook URL di Xendit Dashboard:
   ```
   https://abc123.ngrok.io/api/webhooks/xendit
   ```

## Testing Webhook

### Method 1: Xendit Dashboard Webhook Simulator

1. Go to Xendit Dashboard → Settings → Developers → Webhooks
2. Scroll ke "Webhook Simulator" atau "Test Webhook"
3. Pilih event type: **Invoice Paid**
4. Click "Send Test Webhook"
5. Check response (harusnya 200 OK)

### Method 2: Manual cURL Test

```bash
curl -X POST http://localhost:3000/api/webhooks/xendit \
  -H "Content-Type: application/json" \
  -H "x-callback-token: YOUR_VERIFICATION_TOKEN" \
  -d '{
    "id": "test-invoice-123",
    "external_id": "order-1234567890-abcd",
    "status": "PAID",
    "paid_amount": 50000,
    "paid_at": "2024-01-15T10:30:00.000Z",
    "payment_method": "QRIS",
    "payment_channel": "QRIS"
  }'
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "order_id": "...",
  "payment_status": "PAID"
}
```

### Method 3: Real Transaction Test

1. Buat order baru dari guest page
2. Pilih payment method (QRIS recommended untuk testing)
3. Scan QRIS code dengan Xendit test account atau simulator
4. Xendit akan otomatis kirim webhook ke URL yang sudah dikonfigurasi
5. Monitor logs untuk melihat webhook diterima

## Troubleshooting

### 401 Unauthorized Error

**Penyebab:**
- ❌ XENDIT_WEBHOOK_TOKEN tidak sesuai dengan Verification Token di dashboard
- ❌ Salah environment (test vs live)
- ❌ Token belum di-set di `.env.local`

**Solusi:**
1. Verify token di `.env.local` sama persis dengan Xendit Dashboard
2. Pastikan pakai token dari environment yang benar (test/live)
3. Restart development server setelah update `.env.local`

### 404 Not Found

**Penyebab:**
- URL webhook salah

**Solusi:**
- Pastikan URL: `/api/webhooks/xendit` (bukan `/webhooks/xendit`)

### Webhook tidak terkirim

**Penyebab:**
- ngrok tunnel mati
- Webhook URL belum di-set di dashboard

**Solusi:**
1. Check ngrok masih running
2. Verify webhook URL di Xendit Dashboard sudah benar
3. Test dengan curl terlebih dahulu

### Tombol "Buka Halaman Pembayaran" tidak muncul

**Penyebab:**
- payment_url tidak tersimpan di database
- RLS policy mencegah update (sudah di-fix dengan service role client)
- Race condition saat redirect

**Solusi:**
1. Check browser console untuk log error
2. Click tombol "Refresh Halaman" yang muncul sebagai fallback
3. Verify XENDIT_SECRET_KEY sudah di-set dengan benar
4. Check server logs untuk error saat create invoice atau update payment info

**Logs yang harus muncul:**
```
[Order] Creating Xendit invoice for order: <order-id>
[Order] Xendit invoice created: { invoiceId, hasInvoiceUrl: true }
[Payment] Payment info updated successfully: { orderId, paymentId, hasPaymentUrl: true }
[Payment Page] Loaded payment data: { hasPaymentUrl: true, paymentUrlLength: >0 }
```

## Monitoring Logs

### Development
Check terminal output untuk log seperti:
```
[Xendit Webhook] Received webhook request
[Xendit Webhook] Token validated successfully
Xendit webhook received: { external_id, status, payment_method }
Payment confirmed for order: <order-id>
```

### Production (Vercel/Netlify)
Check function logs di dashboard masing-masing platform

## Best Practices

1. ✅ Selalu validate verification token
2. ✅ Return 200 OK segera setelah terima webhook
3. ✅ Process webhook secara asynchronous jika butuh waktu lama
4. ✅ Log semua webhook events untuk audit trail
5. ✅ Handle idempotency (webhook bisa dikirim multiple kali)
6. ✅ Test dengan semua payment methods (QRIS, VA, E-Wallet)

## Common Payment Methods untuk Testing

### QRIS
- Fastest untuk testing
- Bisa pakai Xendit simulator atau scan dengan app e-wallet

### Virtual Account
- BCA, Mandiri, BNI, BRI
- Butuh transfer manual (atau pakai simulator)

### E-Wallet
- GoPay, OVO, DANA
- Redirect ke app, slower untuk testing

## Security Checklist

- [ ] XENDIT_WEBHOOK_TOKEN di-set di environment variables
- [ ] Token tidak di-commit ke git
- [ ] Webhook endpoint hanya accept POST
- [ ] Validate token di setiap request
- [ ] Use HTTPS di production
- [ ] Monitor failed webhook attempts
