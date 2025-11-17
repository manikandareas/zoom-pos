# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hotel Zoom POS is a Next.js 15 food ordering system for hotels with QR code-based ordering for anonymous guests and an admin dashboard for order management. Built with Supabase for backend services including authentication, real-time updates, and storage.

## Development Commands

- `bun run dev` - Start Next.js development server with Turbopack at localhost:3000
- `bun run build` - Build production bundle with Turbopack
- `bun start` - Serve production build
- `bun install` - Install dependencies (preferred over npm due to committed lockfile)

## Architecture

### Stack
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **UI**: shadcn/ui components with Tailwind CSS
- **Auth**: Supabase anonymous sign-in for guests, email/password for admins
- **Payment**: Xendit integration for guest order payments (QRIS, Virtual Account, E-Wallet, etc.)

### Key Patterns

**Route Groups**: Uses App Router route groups for organization:
- `(guest)` - Guest ordering interface at `/order/[code]`
- `(admin)` - Admin dashboard at `/admin/*`
- `(auth)` - Authentication at `/admin/login`

**Server Actions**: Admin operations use Next.js Server Actions for security:
- Located in `actions.ts` files alongside pages
- Handle order status updates, catalog management, room management
- Protected by `requireAdmin()` helper from `lib/supabase/auth.ts`
- Trigger `revalidatePath()` for cache invalidation after mutations
- Broadcast real-time updates to guests after status changes

**Supabase Integration**: Three distinct client patterns:
- **Server Client** (`lib/supabase/server.ts`) - SSR with cookie-based sessions, respects RLS
- **Browser Client** (`lib/supabase/client.ts`) - Client components and real-time subscriptions
- **Service Client** (`lib/supabase/service.ts`) - Bypasses RLS for admin operations (server-only)
- Middleware (`middleware.ts`) protects admin routes with role verification
- Guest sessions via `ensureGuestSession()` in `lib/auth/guest.ts`

**Real-time Updates**:
- Broadcast channels for room-specific status updates (`room:{room_id}`)
- Postgres Changes subscriptions for admin dashboard synchronization
- Uses both patterns for optimal performance and scalability

### Database Schema

Core tables in `app/MASTER.sql`:
- `rooms` & `room_codes` - Room management with QR codes
- `menu_categories` & `menu_items` - Catalog with image storage
- `orders` & `order_items` - Order lifecycle with status tracking
- `profiles` - Admin role management

Order status flow: `PENDING → ACCEPTED/REJECTED → IN_PREP → READY → DELIVERED → BILLED`

Payment status flow: `PENDING → PAID/FAILED/EXPIRED`

All major tables use soft deletes (`deleted_at` timestamp) for audit trails and data recovery.

### File Organization

- `lib/` - Utilities, validators, data access, and Supabase clients
  - `lib/supabase/` - Client configurations (server, browser, service)
  - `lib/data/` - Database operations organized by feature (orders, menu, rooms, catalog-admin, rooms-admin, billing, payments)
  - `lib/validators/` - Zod schemas for form validation
  - `lib/auth/` - Authentication helpers (guest sessions)
  - `lib/xendit/` - Xendit payment gateway integration (client, webhook validation)
  - `lib/realtime.ts` - Broadcast channel utilities
- `components/` - Reusable UI components with shadcn/ui
  - `components/ui/` - Base UI components
  - `components/admin/` - Admin-specific components (orders-board, catalog-manager, rooms-manager, billing-board)
  - `components/order/` - Guest ordering components
  - `components/providers/` - Supabase context providers

### Environment Variables

Required for Supabase integration (store in `.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

Required for Xendit payment integration:
- `XENDIT_SECRET_KEY` (server-side only)
- `XENDIT_WEBHOOK_TOKEN` (server-side only, for webhook verification)

See `.env.local.example` for detailed setup instructions.

## Security

**Row Level Security (RLS)**: All tables use Supabase RLS policies
- Guests can only access their own orders via `auth.uid()`
- Admins have full access via `profiles.role = 'admin'`
- Public read access for active menu items and categories

**Anonymous Authentication**: Guests use Supabase anonymous sign-in for order tracking without registration

**Payment Security**: Xendit webhooks are verified using HMAC signature validation in `lib/xendit/webhook-validator.ts`

## Key Features

- **Guest Ordering**: QR code → anonymous sign-in → browse menu → place order → payment → real-time status updates
- **Admin Dashboard**: Real-time order board, catalog management, room/QR management, billing export
- **Real-time Updates**: Instant status updates via Supabase Realtime
- **Image Management**: Menu images via Supabase Storage with proper access controls
- **Payment Processing**: Xendit integration for multiple payment methods (QRIS, Virtual Account, E-Wallet, Retail Outlet, Credit Card)

## Testing

No test framework configured yet. Add Vitest + Testing Library for units, Playwright for integration when needed.

## Code Style

- TypeScript everywhere with strict mode
- Two-space indentation, double quotes, trailing semicolons
- Tailwind CSS for styling, avoid custom CSS
- PascalCase for components, camelCase for utilities
- Follow existing patterns in similar files
