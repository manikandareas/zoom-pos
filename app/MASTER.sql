-- =========================================================
-- SQL MASTER: Hotel Zoom Food Ordering (Single-role Admin)
-- =========================================================

-- 0) EXTENSIONS
create extension if not exists "uuid-ossp";
-- (alternatif lain adalah pgcrypto+gen_random_uuid; gunakan salah satu saja)

-- 1) TABLES (inti)
create table if not exists public.rooms (
  id uuid primary key default uuid_generate_v4(),
  label text not null,
  number text not null,
  is_active boolean default true,
  deleted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.room_codes (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  code text unique not null,
  is_active boolean default true,
  deleted_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.menu_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  position int default 0,
  is_active boolean default true,
  deleted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.menu_items (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid not null references public.menu_categories(id) on delete cascade,
  name text not null,
  price numeric(10,2) not null,
  is_available boolean default true,
  image_url text,
  position int default 0,
  deleted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.orders (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references public.rooms(id),
  guest_id uuid not null, -- = auth.uid()
  status text not null default 'PENDING'
    check (status in ('PENDING','ACCEPTED','REJECTED','IN_PREP','READY','DELIVERED','BILLED')),
  note text,
  sub_total numeric(10,2) not null,
  rejection_reason text,
  -- Payment fields (Xendit integration)
  payment_status text default 'PENDING'
    check (payment_status in ('PENDING','PAID','FAILED','EXPIRED')),
  payment_method text
    check (payment_method is null or payment_method in ('QRIS','VIRTUAL_ACCOUNT','EWALLET','RETAIL_OUTLET','CREDIT_CARD')),
  payment_id text, -- Xendit invoice/payment ID
  external_id text unique, -- unique transaction reference for idempotency
  payment_url text, -- Xendit payment page URL
  paid_at timestamptz, -- timestamp when payment confirmed
  guest_phone text, -- optional phone number for payment notifications
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id),
  menu_item_name text not null,
  unit_price numeric(10,2) not null,
  quantity int not null check (quantity > 0),
  note text,
  created_at timestamptz default now()
);

-- Single-role admin registry
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' -- enforce ke admin saja di bawah (opsional constraint)
);

-- 2) INDEXES
create index if not exists idx_orders_room_id on public.orders (room_id);
create index if not exists idx_orders_status  on public.orders (status);
create index if not exists idx_orders_payment_status on public.orders (payment_status);
create index if not exists idx_orders_external_id on public.orders (external_id);
create index if not exists idx_orders_payment_id on public.orders (payment_id);
create index if not exists idx_order_items_order_id on public.order_items (order_id);
create index if not exists idx_room_codes_code on public.room_codes (code);
create index if not exists idx_menu_items_category on public.menu_items (category_id);

-- 3) ENABLE RLS
alter table public.rooms enable row level security;
alter table public.room_codes enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.profiles enable row level security;

-- 4) HELPERS (SECURITY DEFINER untuk melewati RLS saat cek role)
drop function if exists public.is_admin(uuid);
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = uid and p.role = 'admin'
  );
$$;

-- (opsional enforce role = 'admin' saja)
-- HATI-HATI: pastikan data lama sesuai sebelum enable constraint ini
-- do $$ begin
--   alter table public.profiles
--     add constraint profiles_role_admin_only check (role = 'admin');
-- exception when duplicate_object then null; end $$;

-- 5) POLICIES (gunakan drop-then-create; Postgres tidak punya IF NOT EXISTS untuk policy)

-- PROFILES
drop policy if exists "profiles_read_self" on public.profiles;
create policy "profiles_read_self" on public.profiles
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
for all to authenticated
using (public.is_admin(auth.uid()));

-- KATALOG (public read)
drop policy if exists "cat_read_active" on public.menu_categories;
create policy "cat_read_active" on public.menu_categories
for select to public
using (is_active = true and deleted_at is null);

drop policy if exists "item_read_available" on public.menu_items;
create policy "item_read_available" on public.menu_items
for select to public
using (is_available = true and deleted_at is null);

-- ROOMS / ROOM_CODES
drop policy if exists "rooms_admin_all" on public.rooms;
create policy "rooms_admin_all" on public.rooms
for all to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "room_codes_admin_all" on public.room_codes;
create policy "room_codes_admin_all" on public.room_codes
for all to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "room_codes_public_read" on public.room_codes;
create policy "room_codes_public_read" on public.room_codes
for select to public
using (is_active = true and deleted_at is null);

-- ORDERS
-- Note: Guests can INSERT and READ their own orders, but NOT UPDATE
-- Payment info updates (payment_url, payment_id, etc.) must use service role client
-- to bypass RLS, as guests don't have UPDATE permission
drop policy if exists "orders_guest_insert_own" on public.orders;
create policy "orders_guest_insert_own" on public.orders
for insert to authenticated
with check (auth.uid() = guest_id);

drop policy if exists "orders_guest_read_own" on public.orders;
create policy "orders_guest_read_own" on public.orders
for select to authenticated
using (auth.uid() = guest_id);

drop policy if exists "orders_admin_all" on public.orders;
create policy "orders_admin_all" on public.orders
for all to authenticated
using (public.is_admin(auth.uid()));

-- ORDER ITEMS
drop policy if exists "order_items_guest_read_own" on public.order_items;
create policy "order_items_guest_read_own" on public.order_items
for select to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_id and o.guest_id = auth.uid()
  )
);

drop policy if exists "order_items_admin_all" on public.order_items;
create policy "order_items_admin_all" on public.order_items
for all to authenticated
using (public.is_admin(auth.uid()));

-- 6) TRIGGERS (updated_at)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_rooms_updated on public.rooms;
create trigger trg_rooms_updated
before update on public.rooms
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_menu_categories_updated on public.menu_categories;
create trigger trg_menu_categories_updated
before update on public.menu_categories
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_menu_items_updated on public.menu_items;
create trigger trg_menu_items_updated
before update on public.menu_items
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_orders_updated on public.orders;
create trigger trg_orders_updated
before update on public.orders
for each row execute procedure public.set_updated_at();

-- 7) VIEWS (billing)
create or replace view public.unbilled_orders as
select *
from public.orders
where status <> 'BILLED';

create or replace view public.unbilled_orders_by_room as
select
  room_id,
  count(*) as total_orders,
  sum(case when status = 'DELIVERED' then 1 else 0 end) as delivered_count,
  sum(sub_total) as total_amount
from public.orders
where status <> 'BILLED'
group by room_id;

-- 8) REALTIME (publication): jadikan idempotent pakai DO ... EXCEPTION
do $$
begin
  alter publication supabase_realtime add table public.orders;
exception
  when duplicate_object then null;
end$$;

do $$
begin
  alter publication supabase_realtime add table public.order_items;
exception
  when duplicate_object then null;
end$$;

-- 9) STORAGE (bucket + policies)
insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do nothing;

drop policy if exists "menu_images_public_read" on storage.objects;
create policy "menu_images_public_read" on storage.objects
for select to public
using (bucket_id = 'menu-images');

drop policy if exists "menu_images_admin_insert" on storage.objects;
create policy "menu_images_admin_insert" on storage.objects
for insert to authenticated
with check (bucket_id = 'menu-images' and public.is_admin(auth.uid()));

drop policy if exists "menu_images_admin_update" on storage.objects;
create policy "menu_images_admin_update" on storage.objects
for update to authenticated
using (bucket_id = 'menu-images' and public.is_admin(auth.uid()));

drop policy if exists "menu_images_admin_delete" on storage.objects;
create policy "menu_images_admin_delete" on storage.objects
for delete to authenticated
using (bucket_id = 'menu-images' and public.is_admin(auth.uid()));
