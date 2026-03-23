# Kasify

A modern, open-source multi-tenant e-commerce platform. Merchants create and manage online stores with full customization freedom — drag-and-drop page builder, raw HTML/CSS/JS code editor, product management, order tracking, and payment processing.

Built as a TypeScript monorepo with Turborepo, tRPC, Next.js 15, Hono, Drizzle ORM, and PostgreSQL.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Packages](#packages)
  - [@kasify/db](#kasifydb)
  - [@kasify/auth](#kasifyauth)
  - [@kasify/types](#kasifytypes)
  - [@kasify/config](#kasifyconfig)
- [Apps](#apps)
  - [API (`apps/api`)](#api-appsapi)
  - [Dashboard (`apps/dashboard`)](#dashboard-appsdashboard)
  - [Storefront (`apps/storefront`) — Planned](#storefront-appsstorefront--planned)
  - [Builder (`apps/builder`) — Planned](#builder-appsbuilder--planned)
  - [Gateway (`apps/gateway`) — Planned](#gateway-appsgateway--planned)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Authentication](#authentication)
- [Multi-Tenancy](#multi-tenancy)
- [Role-Based Access Control](#role-based-access-control)
- [Development Commands](#development-commands)
- [Deployment](#deployment)
- [Roadmap](#roadmap)

---

## Overview

Kasify lets anyone create a fully functional online store with:

- A subdomain out of the box (`yourshop.kasify.com`)
- Custom domain support with automatic SSL
- Drag-and-drop page builder (Craft.js — planned)
- Raw HTML/CSS/JS code editor for unlimited customization (planned)
- Product & inventory management
- Order management and tracking
- Stripe Connect payments — merchants receive payouts directly (planned)
- Multi-staff access with role-based permissions

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│               EDGE / CDN (Cloudflare)            │
│  SSL termination, wildcard subdomain routing     │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│         apps/gateway  (Hono — planned)           │
│  Resolves *.kasify.com hostname → tenant         │
│  Injects X-Kasify-Tenant-ID header               │
└──────┬─────────────────────────────┬────────────┘
       │                             │
┌──────▼──────┐             ┌────────▼──────────┐
│ apps/store- │             │    apps/api        │
│ front       │             │  Hono + tRPC       │
│ Next.js SSR │             │  Port 3001         │
└─────────────┘             └────────────────────┘
                                     │
                            ┌────────▼──────────┐
                            │    PostgreSQL      │
                            │    Port 5432       │
                            └────────────────────┘

apps/dashboard  →  Next.js 15 merchant admin  (Port 3002)
apps/builder    →  Craft.js page builder      (Port 3004, planned)
apps/worker     →  BullMQ background jobs     (planned)
```

---

## Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Monorepo | Turborepo + pnpm | Incremental builds, workspace linking |
| Language | TypeScript 5.x (strict) | End-to-end type safety |
| API server | Hono + tRPC v11 | Fast edge-ready HTTP, type-safe RPC |
| Frontend | Next.js 15 (App Router) | SSR, ISR, server components |
| UI | Tailwind CSS v3 + lucide-react | Utility-first, no runtime CSS |
| ORM | Drizzle ORM | Type-safe, zero-magic, readable SQL output |
| Database | PostgreSQL 16 | JSONB columns, row-level isolation |
| Auth | Custom JWT (jose) + bcryptjs | No third-party lock-in |
| Validation | Zod | Shared schemas across client & server |
| Linting | Biome | Single binary replaces ESLint + Prettier |
| Containers | Docker Compose | Local Postgres |

---

## Project Structure

```
kasify/
├── apps/
│   ├── api/                    # Hono + tRPC API server (port 3001)
│   │   └── src/
│   │       ├── index.ts        # Hono app entry, CORS, health check
│   │       ├── context.ts      # tRPC context (JWT → user + tenantId)
│   │       ├── trpc.ts         # Procedure types (public / protected / admin)
│   │       ├── router.ts       # Root router composition
│   │       └── routers/
│   │           ├── auth.ts     # register, login, refresh, me, logout
│   │           ├── products.ts # CRUD, variants
│   │           ├── orders.ts   # list, get, updateStatus, customers
│   │           ├── tenant.ts   # settings, custom domains
│   │           └── storefront.ts # themes, pages
│   │
│   ├── dashboard/              # Next.js 15 merchant admin (port 3002)
│   │   └── src/
│   │       ├── app/
│   │       │   ├── layout.tsx               # Root layout + TrpcProvider
│   │       │   ├── page.tsx                 # → redirects to /login
│   │       │   ├── (auth)/
│   │       │   │   ├── login/page.tsx       # Login form
│   │       │   │   └── register/page.tsx    # Registration + shop creation
│   │       │   └── [slug]/
│   │       │       ├── layout.tsx           # Dashboard shell + Sidebar
│   │       │       ├── page.tsx             # Overview (stats, recent activity)
│   │       │       ├── products/page.tsx    # Product list table
│   │       │       └── orders/page.tsx      # Orders table
│   │       ├── components/
│   │       │   └── sidebar.tsx             # Navigation sidebar
│   │       ├── providers/
│   │       │   └── trpc-provider.tsx        # React Query + tRPC client setup
│   │       └── lib/
│   │           ├── trpc.ts                  # Typed tRPC React client
│   │           ├── auth-store.ts            # localStorage auth persistence
│   │           └── utils.ts                 # cn(), formatCurrency(), formatDate()
│   │
│   ├── storefront/             # Planned: SSR tenant shop (port 3003)
│   ├── builder/                # Planned: Craft.js + Monaco editor (port 3004)
│   ├── gateway/                # Planned: Subdomain resolver proxy (port 3000)
│   └── worker/                 # Planned: BullMQ background jobs
│
├── packages/
│   ├── db/                     # Drizzle ORM: schema, client, migrations
│   │   ├── src/
│   │   │   ├── client.ts       # postgres.js pool + drizzle instance
│   │   │   ├── index.ts        # Public exports
│   │   │   └── schema/
│   │   │       ├── tenants.ts  # tenants, domains
│   │   │       ├── users.ts    # users, merchantUsers, refreshTokens
│   │   │       ├── products.ts # products, variants, images, collections
│   │   │       ├── orders.ts   # customers, orders, orderLineItems
│   │   │       └── storefront.ts # themes, pages
│   │   └── drizzle.config.ts
│   │
│   ├── auth/                   # JWT signing/verify, bcrypt, Hono middleware
│   │   └── src/
│   │       ├── jwt.ts          # signAccessToken, signRefreshToken, verify*
│   │       ├── password.ts     # hashPassword, verifyPassword
│   │       └── middleware.ts   # requireAuth, requireAdminRole (Hono)
│   │
│   ├── types/                  # Zod schemas + TypeScript types (shared)
│   │   └── src/
│   │       ├── tenant.ts       # Tenant, Domain, TenantPlan schemas
│   │       ├── auth.ts         # User, RegisterSchema, LoginSchema, JwtPayload
│   │       ├── product.ts      # Product, Variant, CreateProduct schemas
│   │       ├── order.ts        # Order, Address, LineItem schemas
│   │       └── builder.ts      # Page, Theme, BuilderNode, CustomCode schemas
│   │
│   └── config/                 # Shared tsconfig, Tailwind config
│
├── infra/
│   └── docker-compose.yml      # PostgreSQL 16 container
│
├── .env.example                # All environment variables with descriptions
├── .npmrc                      # shamefully-hoist=true for pnpm
├── biome.json                  # Linting + formatting rules
├── turbo.json                  # Turborepo pipeline config
├── pnpm-workspace.yaml         # Workspace package locations
└── package.json                # Root scripts, devDependencies
```

---

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 9 (`npm install -g pnpm`)
- Docker + Docker Compose (`sudo apt install docker.io docker-compose-v2`)

### 1. Clone and install dependencies

```bash
git clone <repo-url> kasify
cd kasify
pnpm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:
- `JWT_SECRET` — at least 32 random characters
- `JWT_REFRESH_SECRET` — at least 32 random characters (different from JWT_SECRET)

Everything else can stay as the defaults for local development.

### 3. Start the database

```bash
# Add yourself to the docker group (once)
sudo usermod -aG docker $USER && newgrp docker

# Start PostgreSQL
docker compose -f infra/docker-compose.yml up -d
```

> **Note:** Redis is expected to already be running on port 6379. If not, install it: `sudo apt install redis-server`

### 4. Push the database schema

```bash
pnpm db:push
```

This creates all tables in the database. You should see `[✓] Changes applied`.

### 5. Start development servers

```bash
pnpm dev
```

This starts all apps in parallel via Turborepo:

| App | URL | Description |
|---|---|---|
| API | http://localhost:3001 | tRPC + REST server |
| Dashboard | http://localhost:3002 | Merchant admin panel |

### 6. Create your first store

Open **http://localhost:3002/register** and fill in:

- Your name
- Email address
- Password (min 8 characters)
- Shop name (e.g. "My Awesome Store")
- Shop URL slug (e.g. `my-store` → `my-store.kasify.com`)

You'll be taken straight to your dashboard at `http://localhost:3002/my-store`.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://kasify:kasify@localhost:5432/kasify` | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `JWT_SECRET` | *(must set)* | Secret for signing access tokens (min 32 chars) |
| `JWT_REFRESH_SECRET` | *(must set)* | Secret for signing refresh tokens (min 32 chars) |
| `NODE_ENV` | `development` | `development` or `production` |
| `API_PORT` | `3001` | Port for the API server |
| `GATEWAY_PORT` | `3000` | Port for the gateway proxy |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | API URL used by the dashboard |
| `NEXT_PUBLIC_BASE_DOMAIN` | `kasify.localhost` | Base domain for tenant subdomains |
| `STORAGE_ENDPOINT` | — | S3-compatible storage endpoint (Cloudflare R2) |
| `STORAGE_ACCESS_KEY_ID` | — | Storage access key |
| `STORAGE_SECRET_ACCESS_KEY` | — | Storage secret key |
| `STORAGE_BUCKET` | `kasify-dev` | Storage bucket name |
| `STORAGE_PUBLIC_URL` | — | Public CDN URL for stored assets |
| `STRIPE_SECRET_KEY` | — | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | — | Stripe webhook signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | — | Stripe publishable key (client-side) |
| `RESEND_API_KEY` | — | Resend API key for transactional email |
| `EMAIL_FROM` | `noreply@kasify.com` | From address for emails |

---

## Packages

### @kasify/db

Drizzle ORM schema definitions, database client, and migration tooling.

**Exports:**
- `db` — Drizzle database instance (postgres.js connection pool, max 10 connections)
- `withTransaction(fn)` — Helper to run operations in a transaction
- All schema table definitions (for use in queries)

**Usage:**

```typescript
import { db, products, eq } from "@kasify/db";

const rows = await db.select().from(products).where(eq(products.tenantId, id));
```

**Commands:**

```bash
pnpm db:push       # Push schema directly to database (dev only)
pnpm db:generate   # Generate SQL migration files
pnpm db:migrate    # Apply migration files
pnpm db:studio     # Open Drizzle Studio visual editor at localhost:4983
```

---

### @kasify/auth

JWT token management, password hashing, and Hono middleware.

**JWT functions:**

```typescript
import { signAccessToken, signRefreshToken, verifyAccessToken } from "@kasify/auth";

// Sign tokens
const accessToken = await signAccessToken({ sub, email, tenantId, role });  // 15min TTL
const refreshToken = await signRefreshToken(userId);                         // 30d TTL

// Verify tokens
const payload = await verifyAccessToken(token);   // throws if invalid/expired
```

**Password functions:**

```typescript
import { hashPassword, verifyPassword } from "@kasify/auth";

const hash = await hashPassword("mypassword");          // bcrypt, 12 rounds
const valid = await verifyPassword("mypassword", hash); // boolean
```

**Hono middleware:**

```typescript
import { requireAuth, requireAdminRole } from "@kasify/auth";

app.get("/protected", requireAuth, (c) => {
  const user = c.get("user"); // JwtPayload
  return c.json({ user });
});

app.delete("/admin-only", requireAuth, requireAdminRole, (c) => {
  // Only owner/admin can reach here
});
```

---

### @kasify/types

Shared Zod schemas and TypeScript types used across all apps and packages.

**Tenant types:**
```typescript
import { TenantSchema, CreateTenantSchema, TenantPlan } from "@kasify/types";
// TenantPlan: "free" | "starter" | "pro" | "enterprise"
```

**Auth types:**
```typescript
import { RegisterSchema, LoginSchema, JwtPayload, UserRole } from "@kasify/types";
// UserRole: "owner" | "admin" | "staff"
```

**Product types:**
```typescript
import { CreateProductSchema, CreateVariantSchema, ProductStatus } from "@kasify/types";
// ProductStatus: "draft" | "active" | "archived"
```

**Order types:**
```typescript
import { OrderSchema, AddressSchema, OrderStatus, FinancialStatus } from "@kasify/types";
// OrderStatus: "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded"
// FinancialStatus: "pending" | "paid" | "refunded" | "partially_refunded" | "failed"
```

**Builder types:**
```typescript
import { PageSchema, ThemeSchema, CustomCodeSchema, PageType } from "@kasify/types";
// PageType: "home" | "product" | "collection" | "blog" | "custom" | "404"
// Theme.settings: { primaryColor, secondaryColor, accentColor, fontHeading, fontBody, borderRadius }
// Page.mode: "visual" | "code"
// Page.content: Craft.js serialized node tree (JSONB)
// Page.customCode: { html, css, js }
```

---

### @kasify/config

Shared base configurations.

- `@kasify/config/tsconfig` — TypeScript base config (strict, noUncheckedIndexedAccess)
- `@kasify/config/tailwind` — Tailwind base theme (CSS variable colors, border radius)

---

## Apps

### API (`apps/api`)

**Port:** 3001

Hono HTTP server with tRPC adapter. All business logic lives here.

**Endpoints:**

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Server health check |
| `POST` | `/trpc/*` | tRPC batch handler (all mutations/queries) |

**tRPC procedures** are documented in the [API Reference](#api-reference) section.

**tRPC procedure types:**

| Type | Auth required | Role required |
|---|---|---|
| `publicProcedure` | No | — |
| `protectedProcedure` | Yes (Bearer JWT) | Any authenticated user |
| `adminProcedure` | Yes (Bearer JWT) | `owner` or `admin` only |

---

### Dashboard (`apps/dashboard`)

**Port:** 3002

Next.js 15 merchant admin SPA. All routes are under `/{shopSlug}/`.

**Routes:**

| Route | Description |
|---|---|
| `/` | Redirects to `/login` |
| `/login` | Sign in to existing shop |
| `/register` | Create a new shop + owner account |
| `/{slug}` | Dashboard overview — stats, recent orders and products |
| `/{slug}/products` | Product list with status badges |
| `/{slug}/orders` | Order list with financial status badges |
| `/{slug}/customers` | Customer list (planned) |
| `/{slug}/themes` | Theme & page management (planned) |
| `/{slug}/analytics` | Analytics dashboard (planned) |
| `/{slug}/settings` | Store settings, custom domains, billing (planned) |

**Auth flow:**

1. User submits login/register form
2. tRPC mutation fires to `http://localhost:3001/trpc/auth.login`
3. On success, `{ accessToken, refreshToken, user, tenant }` stored in `localStorage` under key `kasify_auth`
4. Every subsequent tRPC request reads the access token from `localStorage` and attaches it as `Authorization: Bearer <token>` header
5. Logout clears localStorage and redirects to `/login`

---

### Storefront (`apps/storefront`) — Planned

Next.js 15 SSR app that renders any tenant's shop. Will be powered by:
- Gateway-injected `X-Kasify-Tenant-ID` request header for tenant resolution
- `pages.content` (Craft.js JSON) hydrated into React components in read-only mode
- `pages.customCode` rendered inside a sandboxed `<iframe>` with strict CSP
- Per-tenant `unstable_cache` with 60s revalidation for product/collection pages
- No-store cache for cart and checkout pages

---

### Builder (`apps/builder`) — Planned

Full-screen collaborative page editor.

- **Visual mode** — Craft.js drag-and-drop with block palette (Hero, Text, Product Grid, Image, etc.) and property inspector panel
- **Code mode** — Monaco Editor (VS Code) for raw HTML/CSS/JS with syntax highlighting and live sandboxed preview
- Switching from visual → code snapshots the page to HTML
- Switching from code → visual is not supported (free-form code cannot be parsed back into a node tree)
- Page content saved to `pages.content` (visual) or `pages.customCode` (code) via `storefront.pages.saveContent` tRPC mutation

---

### Gateway (`apps/gateway`) — Planned

Hono reverse proxy that handles tenant resolution and routing.

**Request flow:**
1. Incoming request arrives at `*.kasify.com` or a custom domain
2. Gateway reads `Host` header
3. If `*.kasify.com` — extracts slug, looks up `tenants` table (Redis cache → Postgres, 5min TTL)
4. If custom domain — looks up `domains` table for verified hostname → tenant
5. Injects `X-Kasify-Tenant-ID` and `X-Kasify-Tenant-Slug` headers
6. Proxies request to `apps/storefront`

---

## Database Schema

### Entity Relationship Overview

```
tenants ──< domains          (custom domains)
tenants ──< merchantUsers >── users
users ──< refreshTokens
tenants ──< products ──< variants
products ──< productImages
tenants ──< collections ──<> products (via collectionProducts)
tenants ──< customers ──< orders ──< orderLineItems
orders.lineItems >── variants
tenants ──< themes ──< pages
```

### Tables

#### `tenants`
The root of every store.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `slug` | text | Unique, used in subdomain (`slug.kasify.com`) |
| `name` | text | Display name |
| `plan` | enum | `free \| starter \| pro \| enterprise` |
| `email` | text | Billing/contact email |
| `logo_url` | text | Optional |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |
| `suspended_at` | timestamptz | `NULL` = active |

#### `domains`
Custom domain mappings.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `tenant_id` | uuid | FK → tenants |
| `hostname` | text | Unique, e.g. `shop.mybrand.com` |
| `verified` | boolean | DNS verification status |
| `ssl_status` | enum | `pending \| active \| failed` |
| `verification_token` | text | TXT record value for DNS verification |

#### `users`
Platform user accounts (not shoppers).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `email` | text | Unique |
| `name` | text | |
| `password_hash` | text | bcrypt, 12 rounds |
| `avatar_url` | text | Optional |
| `email_verified` | boolean | |

#### `merchant_users`
Links users to tenants with roles. A user can be staff on multiple shops.

| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid | FK → users |
| `tenant_id` | uuid | FK → tenants |
| `role` | enum | `owner \| admin \| staff` |

#### `refresh_tokens`
Server-side refresh token rotation.

| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid | FK → users |
| `token_hash` | text | SHA-256 hash of the raw token |
| `expires_at` | timestamptz | |
| `revoked_at` | timestamptz | `NULL` = still valid |

#### `products`

| Column | Type | Notes |
|---|---|---|
| `tenant_id` | uuid | FK → tenants |
| `title` | text | |
| `description` | text | |
| `handle` | text | URL-safe slug (auto-generated from title) |
| `status` | enum | `draft \| active \| archived` |
| `tags` | jsonb | `string[]` array |

#### `variants`
Each product has at least one variant (the "Default Title" variant is created automatically).

| Column | Type | Notes |
|---|---|---|
| `product_id` | uuid | FK → products |
| `tenant_id` | uuid | |
| `sku` | text | Optional |
| `price` | numeric(10,2) | |
| `compare_price` | numeric(10,2) | Optional, for showing "was" price |
| `inventory` | integer | Stock count |
| `options` | jsonb | e.g. `{ "color": "red", "size": "M" }` |

#### `orders`

| Column | Type | Notes |
|---|---|---|
| `tenant_id` | uuid | FK → tenants |
| `customer_id` | uuid | FK → customers (nullable) |
| `order_number` | serial | Auto-incrementing per-database (not per-tenant — use for display only) |
| `status` | enum | Fulfillment status |
| `financial_status` | enum | Payment status |
| `currency` | text | ISO 4217 code, default `ZAR` |
| `subtotal` | numeric | Before tax + shipping |
| `tax_total` | numeric | |
| `shipping_total` | numeric | |
| `total` | numeric | Final amount charged |
| `shipping_address` | jsonb | Address snapshot |
| `billing_address` | jsonb | Address snapshot |
| `stripe_payment_intent_id` | text | For reconciliation |

#### `themes`

| Column | Type | Notes |
|---|---|---|
| `tenant_id` | uuid | FK → tenants |
| `name` | text | Theme display name |
| `is_active` | boolean | Only one theme should be active at a time |
| `settings` | jsonb | `{ primaryColor, secondaryColor, accentColor, fontHeading, fontBody, borderRadius }` |

#### `pages`

| Column | Type | Notes |
|---|---|---|
| `tenant_id` | uuid | FK → tenants |
| `theme_id` | uuid | FK → themes |
| `slug` | text | URL path, e.g. `/about` |
| `type` | enum | `home \| product \| collection \| blog \| custom \| 404` |
| `mode` | enum | `visual \| code` |
| `content` | jsonb | Craft.js serialized node tree (visual mode) |
| `custom_code` | jsonb | `{ html, css, js }` (code mode) |
| `is_published` | boolean | Only published pages are shown on storefront |

---

## API Reference

All API calls go through tRPC at `POST http://localhost:3001/trpc/{procedure}`.

When using the tRPC client (in the dashboard), calls are made automatically. For direct HTTP testing use the batch format:

```bash
# Query example
curl http://localhost:3001/trpc/auth.me \
  -H "Authorization: Bearer <token>"

# Mutation example
curl -X POST "http://localhost:3001/trpc/auth.login?batch=1" \
  -H "Content-Type: application/json" \
  -d '{"0":{"json":{"email":"you@example.com","password":"yourpassword"}}}'
```

### `auth.register`

**Type:** Public mutation

**Input:**
```typescript
{
  name: string;          // Full name
  email: string;         // Valid email address
  password: string;      // Min 8 characters
  shopName: string;      // Display name for the store
  shopSlug: string;      // URL slug: lowercase letters, numbers, hyphens (3–32 chars)
}
```

**Returns:**
```typescript
{
  accessToken: string;   // JWT, 15 minute TTL
  refreshToken: string;  // 30-day token, rotate via auth.refresh
  user: { id, email, name };
  tenant: { id, slug, name };
}
```

**Errors:** `CONFLICT` if email or slug already taken.

---

### `auth.login`

**Type:** Public mutation

**Input:**
```typescript
{ email: string; password: string; }
```

**Returns:** Same shape as `auth.register`.

**Errors:** `UNAUTHORIZED` if credentials invalid. `FORBIDDEN` if shop is suspended.

---

### `auth.refresh`

**Type:** Public mutation

**Input:**
```typescript
{ refreshToken: string; }
```

**Returns:**
```typescript
{ accessToken: string; refreshToken: string; }
```

Old refresh token is immediately revoked. Store the new refresh token.

---

### `auth.me`

**Type:** Protected query

**Returns:**
```typescript
{
  user: { id, email, name, avatarUrl };
  tenant: { id, slug, name, plan } | null;
}
```

---

### `auth.logout`

**Type:** Protected mutation

**Input:**
```typescript
{ refreshToken: string; }
```

Revokes the refresh token server-side. Always clear localStorage on the client regardless of the response.

---

### `products.list`

**Type:** Protected query

**Input:**
```typescript
{
  status?: "draft" | "active" | "archived";
  limit?: number;   // 1–100, default 20
  offset?: number;  // default 0
}
```

**Returns:** `Product[]` scoped to authenticated tenant.

---

### `products.get`

**Type:** Protected query

**Input:** `{ id: string }`

**Returns:** `Product & { variants: Variant[]; images: ProductImage[] }`

---

### `products.create`

**Type:** Protected mutation

**Input:**
```typescript
{
  title: string;
  description?: string | null;
  handle?: string;    // Auto-generated from title if not provided
  status?: "draft" | "active" | "archived";  // default "draft"
  tags?: string[];
}
```

Creates the product and one default variant with price 0.

---

### `products.update`

**Type:** Protected mutation

**Input:** `{ id: string; data: Partial<CreateProductInput> }`

---

### `products.delete`

**Type:** Protected mutation

**Input:** `{ id: string }`

Cascades to variants, images, and collection memberships.

---

### `products.createVariant`

**Type:** Protected mutation

**Input:**
```typescript
{
  productId: string;
  data: {
    sku?: string | null;
    title: string;
    price: number;
    comparePrice?: number | null;
    inventory?: number;
    options?: Record<string, string>;   // e.g. { color: "red", size: "M" }
    imageUrl?: string | null;
  }
}
```

---

### `orders.list`

**Type:** Protected query

**Input:**
```typescript
{
  status?: OrderStatus;
  financialStatus?: FinancialStatus;
  limit?: number;
  offset?: number;
}
```

---

### `orders.get`

**Type:** Protected query

**Input:** `{ id: string }`

**Returns:** `Order & { lineItems: OrderLineItem[] }`

---

### `orders.updateStatus`

**Type:** Admin mutation

**Input:** `{ id: string; status: OrderStatus }`

---

### `orders.customers`

**Type:** Protected query

Returns paginated customer list for the tenant.

---

### `tenant.get`

**Type:** Protected query

Returns the full tenant object for the authenticated user's shop.

---

### `tenant.update`

**Type:** Admin mutation

**Input:** `{ name?: string; email?: string; logoUrl?: string | null }`

---

### `tenant.domains.list`

**Type:** Protected query

Returns all custom domains registered for the tenant.

---

### `tenant.domains.add`

**Type:** Admin mutation

**Input:** `{ hostname: string }`

Creates a domain record with a `verificationToken`. The merchant must add a DNS TXT record `_kasify-verify=<token>` to verify ownership.

---

### `tenant.domains.remove`

**Type:** Admin mutation

**Input:** `{ id: string }`

---

### `storefront.themes.list`

**Type:** Protected query

Returns all themes for the tenant.

---

### `storefront.themes.create`

**Type:** Admin mutation

**Input:** `{ name: string }`

---

### `storefront.themes.activate`

**Type:** Admin mutation

**Input:** `{ id: string }`

Deactivates all other themes and activates the specified one.

---

### `storefront.themes.updateSettings`

**Type:** Admin mutation

**Input:**
```typescript
{
  id: string;
  settings: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    fontHeading?: string;
    fontBody?: string;
    borderRadius?: string;
  }
}
```

---

### `storefront.pages.create`

**Type:** Admin mutation

**Input:**
```typescript
{
  themeId: string;
  title: string;
  slug: string;
  type?: "home" | "product" | "collection" | "blog" | "custom" | "404";
}
```

---

### `storefront.pages.saveContent`

**Type:** Admin mutation

**Input:**
```typescript
{
  id: string;
  mode: "visual" | "code";
  content?: Record<string, unknown>;           // Craft.js node tree
  customCode?: { html: string; css: string; js: string; };
}
```

---

### `storefront.pages.publish`

**Type:** Admin mutation

**Input:** `{ id: string; isPublished: boolean }`

---

## Authentication

### Token Strategy

Kasify uses a dual-token JWT strategy:

- **Access token** — Short-lived (15 minutes), signed with `JWT_SECRET`, sent as `Authorization: Bearer <token>` on every request. Never stored in a cookie.
- **Refresh token** — Long-lived (30 days), stored server-side as a SHA-256 hash in `refresh_tokens`. The raw token is sent to the client once and stored in `localStorage`. Used only to obtain new access tokens via `auth.refresh`.

### Token Rotation

Every call to `auth.refresh`:
1. Looks up the token hash in the database
2. Verifies it is not revoked and not expired
3. Marks the old token as revoked (`revoked_at = NOW()`)
4. Issues a new access token and a new refresh token
5. Returns both to the client

If a refresh token is presented that has already been revoked, it may indicate token theft — the system rejects the request.

### Frontend Storage

Auth state is persisted to `localStorage` under the key `kasify_auth`:

```typescript
{
  accessToken: string | null;
  refreshToken: string | null;
  user: { id, email, name } | null;
  tenant: { id, slug, name } | null;
}
```

The tRPC client reads `accessToken` from localStorage before every request and attaches it as a Bearer header.

---

## Multi-Tenancy

Every database table includes a `tenant_id` column. All queries in `protectedProcedure` and `adminProcedure` are automatically scoped to `ctx.tenantId`, which is extracted from the JWT payload.

Example — products are always fetched for the authenticated tenant only:

```typescript
await ctx.db.select().from(products).where(eq(products.tenantId, ctx.tenantId));
```

This ensures:
- No merchant can access another merchant's data, even with a valid JWT
- A single database serves all tenants (no schema-per-tenant overhead)
- Row-level filtering is enforced at the application layer on every query

---

## Role-Based Access Control

| Role | Description | Can do |
|---|---|---|
| `owner` | Shop creator | Everything — billing, staff, delete shop |
| `admin` | Trusted staff | Products, orders, themes, domains, settings |
| `staff` | Basic access | View products, process orders |

In tRPC:
- `protectedProcedure` — any role
- `adminProcedure` — `owner` or `admin` only

In Hono middleware:
- `requireAuth` — verifies Bearer token, sets `ctx.var.user`
- `requireAdminRole` — additionally checks `role === "owner" || "admin"`

---

## Development Commands

```bash
# Start all dev servers
pnpm dev

# Start only the API
pnpm --filter=@kasify/api dev

# Start only the dashboard
pnpm --filter=@kasify/dashboard dev

# Build all packages
pnpm build

# Type-check all packages
pnpm typecheck

# Lint everything
pnpm lint

# Format everything
pnpm format

# Database
pnpm db:push        # Push schema to DB (dev, no migration files)
pnpm db:generate    # Generate SQL migration files from schema diff
pnpm db:migrate     # Apply migration files
pnpm db:studio      # Open Drizzle Studio at localhost:4983

# Infrastructure
docker compose -f infra/docker-compose.yml up -d    # Start Postgres
docker compose -f infra/docker-compose.yml down     # Stop Postgres
docker compose -f infra/docker-compose.yml down -v  # Stop + delete all data
```

---

## Deployment

> Production deployment guide is a work in progress. The following describes the intended target architecture.

### Services to deploy

| Service | Recommended platform |
|---|---|
| `apps/api` | Railway, Fly.io, or any Node.js host |
| `apps/dashboard` | Vercel (Next.js native) |
| `apps/storefront` | Vercel (Next.js native) |
| `apps/gateway` | Cloudflare Workers (Hono is edge-compatible) |
| `apps/worker` | Railway or a VPS |
| PostgreSQL | Neon, Supabase, or managed RDS |
| Redis | Upstash (serverless), Redis Cloud, or managed ElastiCache |
| File storage | Cloudflare R2 (no egress fees) |

### DNS setup

1. Point `*.kasify.com` as a wildcard CNAME to the gateway
2. Enable Cloudflare proxy on the wildcard record for SSL termination
3. Merchants add a CNAME for their custom domain pointing to `shops.kasify.com`
4. The domain verification worker checks for a DNS TXT record `_kasify-verify=<token>`

### Required environment variables for production

- Set `NODE_ENV=production`
- Generate strong random values for `JWT_SECRET` and `JWT_REFRESH_SECRET` (32+ chars)
- Set `DATABASE_URL` to your production PostgreSQL connection string
- Set `REDIS_URL` to your production Redis URL
- Configure all `STORAGE_*` variables for file uploads
- Configure `STRIPE_*` variables for payments

---

## Roadmap

### Phase 1 — Foundation (complete)
- [x] Monorepo setup (Turborepo + pnpm)
- [x] Database schema (all tables)
- [x] Auth package (JWT, bcrypt, middleware)
- [x] Shared types (Zod schemas)
- [x] API server (tRPC — auth, products, orders, tenant, storefront)
- [x] Dashboard (login, register, overview, products, orders)

### Phase 2 — Storefront (next)
- [ ] `apps/gateway` — subdomain + custom domain resolver
- [ ] `apps/storefront` — SSR tenant shop with default theme
- [ ] Cart (Redis-backed session cart)
- [ ] Product listing and detail pages

### Phase 3 — Checkout & Payments
- [ ] Stripe Connect merchant onboarding
- [ ] Checkout page (Stripe Payment Element)
- [ ] Stripe webhook handler → order financial status updates
- [ ] Order confirmation email (Resend + BullMQ worker)

### Phase 4 — Page Builder
- [ ] `apps/builder` — Craft.js drag-and-drop editor
- [ ] Core blocks: Hero, Text, Product Grid, Image, Button, Spacer
- [ ] Monaco Editor for HTML/CSS/JS code mode
- [ ] Sandboxed iframe preview for code mode
- [ ] Publish flow: dashboard → builder → storefront

### Phase 5 — Custom Domains & Growth
- [ ] DNS verification worker
- [ ] Cloudflare API integration for SSL
- [ ] Analytics dashboard (revenue, orders, top products)
- [ ] Staff invitation flow

### Future
- [ ] Multi-currency support
- [ ] App marketplace / plugin system
- [ ] Mobile merchant app (Expo)
- [ ] B2B / wholesale pricing
- [ ] AI-assisted product descriptions

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes and ensure `pnpm typecheck` and `pnpm lint` pass
4. Open a pull request with a clear description

---

## License

MIT
# kasify
