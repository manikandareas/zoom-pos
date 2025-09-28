# PRD — Hotel Zoom Food Ordering

**Stack:** Next.js 15 (App Router, Server Actions) + Supabase (Postgres, Auth, Realtime, Storage)
**Role Aplikasi:** Hanya **admin** (tamu = anonymous)
**Status:** Draft untuk persetujuan

---

## 1) Latar Belakang & Visi

Hotel ingin memindahkan pemesanan makanan ke web lewat **QR unik per kamar**. Tamu cukup scan → pesan tanpa registrasi → status realtime. Semua penagihan disatukan saat checkout (tanpa payment gateway online).
**Alasan teknis:**

* **Anonymous Sign-in Supabase** → tamu bisa “login” tanpa PII, tetap punya `user_id` untuk RLS. ([Supabase][1])
* **App Router + Server Actions** di Next.js 15 menjaga mutasi sensitif di server (tanpa expose service key), cocok untuk dashboard admin. ([Next.js][2])
* **Realtime Supabase**: kombinasi **Broadcast** (event per kamar, latensi rendah) dan **Postgres Changes** (sinkron DB untuk board admin). Broadcast umumnya lebih scalable/aman untuk event aplikasi; DB Changes sederhana tapi tidak se-skalable broadcast. ([Supabase][3])
* **RLS wajib** di schema public agar aman dipanggil dari browser. ([Supabase][4])
* **SSR client** via `@supabase/ssr` untuk session berbasis cookie di Server Components/Actions. (Beta, tapi direkomendasikan; aware potensi breaking changes.) ([Supabase][5])

---

## 2) Tujuan & KPI

* **< 2 dtk** order baru terlihat di dashboard admin (realtime).
* **< 1–2 dtk** update status tampil di perangkat tamu.
* **100%** akurasi tagihan (status **BILLED** saat checkout).
* **0 insiden** data tamu melihat order kamar lain (uji RLS).

**Non-goal:** pembayaran online, inventori bahan baku, akuntansi pajak.

---

## 3) Persona & Cerita Pengguna

* **Guest (tamu, anonymous)**

  * Scan QR → landing kamar → lihat menu → tambah ke keranjang → kirim order (**PENDING**).
  * Lihat status realtime (**ACCEPTED/REJECTED/IN\_PREP/READY/DELIVERED/BILLED**).
* **Admin (gabungan kitchen/FO/resepsionis)**

  * Lihat **order board** realtime; terima/tolak; atur status; tandai **BILLED** saat checkout.
  * CRUD **rooms & QR**, **kategori & menu**, kelola **gambar**.

---

## 4) Ruang Lingkup (Fase)

**Fase 1 (MVP)**

* QR per kamar, anonymous sign-in, order flow lengkap, dashboard admin realtime, export data (CSV), Storage gambar menu.
* Kode kamar digenerate otomatis (tanpa input manual) dan admin bisa unduh QRIS siap cetak dari dashboard.
  **Fase 2**
* Role manajemen admin (tambah admin lain), laporan periode, templated invoice (PDF).
  **Out-of-scope:** payment online, stok, multi-hotel.

---

## 5) Alur Utama (ringkas)

```mermaid
flowchart LR
A[Guest scan QR] --> B[Anon sign-in]
B --> C[Lihat katalog]
C --> D[Checkout -> orders(PENDING)]
D -->|Realtime| E[Admin board]
E --> F{Accept / Reject}
F -->|Reject| G[Notify guest + reason]
F -->|Accept| H[IN_PREP -> READY -> DELIVERED]
H --> I[Resepsionis: BILLED saat checkout]
I --> J[Rekap penagihan]
```

* Kanal per kamar: **Broadcast** `room:{room_id}` untuk push status cepat ke tamu. ([Supabase][6])
* Sinkron dashboard admin: **Postgres Changes** `orders` (+ `order_items`). ([Supabase][7])

---

## 6) UX Prinsip & UI Framework

* Tanpa login/daftar untuk tamu. ([Supabase][8])
* Status order informatif, tidak spammy.
* Admin board: filter per status/kamar, pencarian cepat.
* **UI Components**: menggunakan shadcn/ui untuk konsistensi desain dan aksesibilitas. ([shadcn/ui][13])

### 6.1 Komponen UI Utama (shadcn/ui)

* **Guest Interface**:
  * `Card` - untuk display menu items dan order summary
  * `Button` - untuk aksi order dan navigation
  * `Badge` - untuk status order dan kategori menu
  * `Sheet` - untuk keranjang belanja (mobile-friendly)
  * `Alert` - untuk notifikasi status order

* **Admin Dashboard**:
  * `Table` - untuk order board dan data management
  * `Dialog` - untuk konfirmasi aksi dan form input
  * `Select` - untuk filter status dan kategori
  * `Tabs` - untuk navigasi antar section (orders, catalog, rooms)
  * `Form` - untuk CRUD operations dengan validasi
  * `Toast` - untuk feedback realtime actions

---

## 7) Arsitektur Teknis

### 7.1 Frontend (Next.js 15)

* **App Router** + **Server Actions** untuk mutasi admin (accept/reject/update/billed). ([Next.js][2])
* **`@supabase/ssr`**: `createServerClient` (server) & `createBrowserClient` (client) untuk session cookies; dipakai di layout/route handlers. (Package masih beta). ([Supabase][5])
* **UI Framework**: shadcn/ui untuk komponen UI yang konsisten dan modern. ([shadcn/ui][13])
* React 19 alignment (Next 15), siap SSR/streaming. ([Next.js][9])

### 7.2 Backend (Supabase)

* **Database**: Postgres + **RLS** (wajib). ([Supabase][4])
* **Auth**: Anonymous (guest) + email/password/OAuth (admin). ([Supabase][1])
* **Realtime**: Broadcast (kamar), Postgres Changes (admin board). ([Supabase][3])
* **Storage**: bucket `menu-images`; public read + admin write (RLS). ([Supabase][10])

---

## 8) Skema Data (intisari)

Tabel inti: `rooms`, `room_codes`, `menu_categories`, `menu_items`, `orders`, `order_items`, `profiles(user_id, role='admin')`.
Relasi:

* `room_codes.room_id -> rooms.id`
* `orders.room_id -> rooms.id`, `orders.guest_id = auth.uid()` (tamu)
* `order_items.order_id -> orders.id`, `order_items.menu_item_id -> menu_items.id`

**Soft delete:** `rooms`, `room_codes`, `menu_categories`, dan `menu_items` kini memiliki kolom `deleted_at` + flag aktif (`is_active`/`is_available`). Aksi "hapus" admin hanya mengisi `deleted_at` dan mematikan flag sehingga histori order tetap konsisten.

> **SQL migrasi lengkap** (tabel, index, RLS, policy, trigger `updated_at`, view billing, realtime publication, Storage) sudah gue kasih sebelumnya; tinggal pakai. RLS memastikan tamu hanya akses order miliknya; admin bebas (via `is_admin()`). ([Supabase][4])

---

## 9) Keamanan & RLS (ringkas)

* **Katalog**: public **SELECT** dengan filter aktif/tersedia.
* **Orders**:

  * Guest (authenticated anonim): **INSERT** + **SELECT** di order miliknya (`guest_id = auth.uid()`).
  * Admin (via `profiles.role='admin'`): **ALL** (orders & order\_items).
* **Rooms/Room codes/Menu**: hanya admin (ALL).
* **Storage**: `menu-images` **SELECT** public; **INSERT/UPDATE/DELETE** admin saja. (Contoh pola RLS ada di dok resmi). ([Supabase][10])

---

## 10) Realtime Desain

* **Kamar channel (Broadcast)**: `room:{room_id}` → payload minimal (`order_id`, `status`, `reason?`). Cocok untuk latensi rendah & skala. ([Supabase][3])
* **Admin board (DB Changes)**: subscribe `INSERT/UPDATE` di `orders`, filtered by RLS (JWT). ([Supabase][7])
* **Publication**: pastikan `orders` & `order_items` masuk `supabase_realtime`. ([Supabase][11])

---

## 11) Server Actions (kontrak)

* `acceptOrderAction(orderId)` → `orders.status='ACCEPTED'` + broadcast kamar.
* `rejectOrderAction(orderId, reason)` → `status='REJECTED'` + broadcast.
* `updateOrderStatusAction(orderId, status)` → `IN_PREP|READY|DELIVERED`.
* `markAsBilledAction(orderId|roomId)` → `status='BILLED'`.
  **Guard**: cek admin di server (read `@supabase/ssr` session → `is_admin`). ([Supabase][5])

---

## 12) Halaman & Routing

* **Guest** `/order/[code]` → SSR resolve room → katalog → keranjang → submit → subscribe `room:{room_id}`.
* **Admin** `/admin/orders` (board), `/admin/catalog`, `/admin/rooms`, `/admin/billing`.
* Middleware proteksi `/admin/**` (cek admin di server).

---

## 13) Observability & Operasional

* **Monitoring**: Supabase dashboard (Auth, Realtime, DB perf, Storage). ([Supabase][6])
* **Log**: error Server Actions, latency broadcast & DB Changes.
* **Backup**: jadwal snapshot DB, uji restore bulanan.
* **Runbook**:

  * Realtime macet → cek publication & RLS; fall back polling sementara.

---

## 14) Performance & A11y

* LCP **< 2.5s**, bundle admin dipisah (route-level).
* Gambar menu via Next/Image.
* Aksesibilitas dasar: fokus, kontras, ARIA status updates pada perubahan status order.

---

## 15) Risiko & Mitigasi

* **Abuse anon user** → RLS ketat. ([Supabase][8])
* **Perubahan API `@supabase/ssr` (beta)** → bungkus client init di util; pin versi & siapkan catatan upgrade. ([Supabase][12])
* **Skalabilitas realtime** → gunakan Broadcast untuk event aplikasi; DB Changes hanya sinkron state. ([Supabase][3])

---

## 16) Rencana Implementasi (4–5 minggu)

**M1 — Foundation (Week 1)**

* Setup project, `@supabase/ssr`, auth anonymous & admin, schema & RLS, Storage bucket + policy. ([Supabase][5])

**M2 — Guest Ordering (Week 2)**

* QR flow, katalog, keranjang, checkout → orders(PENDING), Broadcast channel kamar.

**M3 — Admin Dashboard (Week 3)**

* Board realtime (DB Changes), aksi Server Actions, CRUD katalog/rooms, upload gambar.

**M4 — Billing & Polishing (Week 4)**

* Mark **BILLED**, export CSV, loading states, empty states, QA RLS.

**M5 — Hardening (Week 5, opsional)**

* Observability, backup drills, security review, A11y/perf tweaks.

---

## 17) Uji & Penerimaan

* **RLS tests**: guest tidak bisa akses order kamar lain; admin bebas. (Gunakan token berbeda untuk simulasi). ([Supabase][4])
* **Realtime tests**: insert → muncul di admin < 2 dtk; update status → push ke tamu < 2 dtk. ([Supabase][6])
* **Auth tests**: anon; admin login; middleware blokir akses tanpa admin. ([Supabase][8])
* **Storage tests**: tamu hanya baca; admin bisa upload/hapus. ([Supabase][10])

---

## 18) Lampiran Teknis

* **SQL migrasi lengkap**: tabel, index, RLS/policies, trigger, view, publication, Storage (sudah disediakan di thread sebelumnya).
* **Contoh `createServerClient` & middleware Next** (`@supabase/ssr`) untuk SSR session. ([Supabase][5])
* **Contoh subscribe**: Broadcast (kamar) & Postgres Changes (admin). ([Supabase][6])

---

## 19) Status Implementasi (16 September 2025)

* **Guest ordering** `/order/[code]` aktif: auto anon sign-in, katalog realtime, keranjang + checkout, subscribe broadcast status, riwayat order.
* **Admin dashboard**: `/admin/orders` (realtime board + aksi server), `/admin/catalog` (CRUD kategori/menu + upload Storage), `/admin/rooms` (rooms & QR), `/admin/billing` (ringkasan + export CSV + mark billed).
* **Auth & Guard**: middleware cek admin, halaman login server action, logout, Supabase provider SSR/CSR sinkron.
* **Infra**: komponen UI shadcn-style (Button, Card, Table, Sheet, Dialog, Tabs, Select, Switch, Alert, Badge, Skeleton), Supabase clients (server/browser/service), hooks realtime, storage helper.
* **Dokumentasi & metadata**: landing page, export CSV route, PRD ini diperbarui dengan status implementasi.

---

[1]: https://supabase.com/docs/guides/auth/auth-anonymous?utm_source=chatgpt.com "Anonymous Sign-Ins | Supabase Docs"
[2]: https://nextjs.org/docs/14/app/building-your-application/data-fetching/server-actions-and-mutations?utm_source=chatgpt.com "Server Actions and Mutations - Data Fetching"
[3]: https://supabase.com/docs/guides/realtime/subscribing-to-database-changes?utm_source=chatgpt.com "Subscribing to Database Changes | Supabase Docs"
[4]: https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com "Row Level Security | Supabase Docs"
[5]: https://supabase.com/docs/guides/auth/server-side/creating-a-client?utm_source=chatgpt.com "Creating a Supabase client for SSR"
[6]: https://supabase.com/docs/guides/realtime?utm_source=chatgpt.com "Realtime | Supabase Docs"
[7]: https://supabase.com/docs/guides/realtime/postgres-changes?utm_source=chatgpt.com "Postgres Changes | Supabase Docs"
[8]: https://supabase.com/docs/reference/javascript/auth-signinanonymously?utm_source=chatgpt.com "JavaScript: Create an anonymous user"
[9]: https://nextjs.org/blog/next-15?utm_source=chatgpt.com "Next.js 15"
[10]: https://supabase.com/docs/guides/storage/security/access-control?utm_source=chatgpt.com "Storage Access Control | Supabase Docs"
[11]: https://supabase.com/docs/guides/realtime/architecture?utm_source=chatgpt.com "Realtime Architecture | Supabase Docs"
[12]: https://supabase.com/docs/guides/auth/server-side?utm_source=chatgpt.com "Server-Side Rendering | Supabase Docs"
[13]: https://ui.shadcn.com/docs/components "shadcn/ui Components"
