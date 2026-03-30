# KStack

A modern, open-source multi-tenant e-commerce framework. Deploy it on your own infrastructure and give merchants everything they need to run an online store — product management, order tracking, storefront rendering, custom domains, and payment processing.

Built as a TypeScript monorepo with Turborepo, tRPC, Next.js 15, Hono, Drizzle ORM, and PostgreSQL.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Quick start with `create-kstack-app`](#quick-start-with-create-kstack-app)
  - [Manual setup](#manual-setup)
- [CLI Reference](#cli-reference)
- [Environment Variables](#environment-variables)
- [License Plans](#license-plans)
- [Telemetry](#telemetry)
- [Packages](#packages)
  - [@kstack/db](#kstackdb)
  - [@kstack/auth](#kstackauth)
  - [@kstack/types](#kstacktypes)
  - [@kstack/config](#kstackconfig)
- [Apps](#apps)
  - [API](#api-appsapi)
  - [Dashboard](#dashboard-appsdashboard)
  - [Storefront](#storefront-appsstorefront)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Authentication](#authentication)
- [Multi-Tenancy](#multi-tenancy)
- [Role-Based Access Control](#role-based-access-control)
- [Development Commands](#development-commands)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Contributing](#contributing)

---

## Overview

KStack is a self-hosted e-commerce platform framework. You run it on your own domain, your own servers, and your own database. Merchants create stores through a dashboard you control.

Out of the box you get:

- Subdomain store routing (`mystore.yourdomain.com`) or custom domain per store
- Product and inventory management with variants
- Order management with fulfillment tracking
- Customer accounts and guest checkout
- Storefront with theme customization
- Multi-staff access with role-based permissions
- Payment processing (Paystack)
- Coupon and discount codes
- Product reviews
- Shipping rate configuration
- Contact message inbox
- AI-assisted product tools
- Legal pages (Privacy Policy, Terms, Disclaimer)
- Maintenance mode and store controls

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
│  Resolves *.yourdomain.com hostname → tenant     │
│  Injects X-KStack-Tenant-ID header               │
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
apps/storefront →  Next.js 15 public store    (Port 3003)
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
kstack/
├── apps/
│   ├── api/                    # Hono + tRPC API server (port 3001)
│   │   └── src/
│   │       ├── index.ts        # Hono app entry, CORS, health check
│   │       ├── context.ts      # tRPC context (JWT → user + tenantId)
│   │       ├── trpc.ts         # Procedure types (public / protected / admin)
│   │       ├── router.ts       # Root router composition
│   │       ├── lib/
│   │       │   ├── telemetry.ts  # Anonymous usage telemetry
│   │       │   └── license.ts   # License plan resolution
│   │       └── routers/
│   │           ├── auth.ts       # register, login, refresh, me, logout
│   │           ├── products.ts   # CRUD, variants, images
│   │           ├── orders.ts     # list, get, updateStatus, notes, cancel
│   │           ├── tenant.ts     # settings, domains, maintenance, controls
│   │           ├── public.ts     # resolveShop, storefront products, contact
│   │           ├── reviews.ts    # product reviews (purchase-gated)
│   │           ├── coupons.ts    # discount codes
│   │           ├── shipping.ts   # shipping rates
│   │           ├── contact.ts    # contact message inbox
│   │           └── storefront.ts # themes, pages
│   │
│   ├── dashboard/              # Next.js 15 merchant admin (port 3002)
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (auth)/
│   │       │   │   ├── login/page.tsx
│   │       │   │   └── register/page.tsx
│   │       │   └── [slug]/
│   │       │       ├── page.tsx           # Overview — stats, recent activity
│   │       │       ├── products/          # Product management
│   │       │       ├── orders/            # Order management
│   │       │       ├── customers/         # Customer list
│   │       │       ├── collections/       # Product collections
│   │       │       ├── coupons/           # Discount codes
│   │       │       ├── shipping/          # Shipping rates
│   │       │       ├── reviews/           # Review moderation
│   │       │       ├── contact/           # Contact message inbox
│   │       │       ├── analytics/         # Store analytics
│   │       │       └── settings/          # Store settings, domains, team
│   │       ├── components/
│   │       │   └── sidebar.tsx
│   │       └── lib/
│   │           ├── trpc.ts
│   │           └── auth-store.ts
│   │
│   └── storefront/             # Next.js 15 public storefront (port 3003)
│       └── src/
│           ├── app/[slug]/     # Per-tenant storefront pages
│           │   ├── page.tsx              # Home — product sections
│           │   ├── products/[handle]/    # Product detail
│           │   ├── cart/                 # Shopping cart
│           │   ├── checkout/             # Checkout (guest + account)
│           │   ├── orders/               # Order tracking
│           │   ├── account/              # Customer account
│           │   ├── contact/              # Contact form
│           │   ├── wishlist/             # Wishlist
│           │   └── legal/[page]/         # Privacy, Terms, Disclaimer
│           ├── components/
│           │   ├── shop-footer.tsx
│           │   └── ...
│           └── middleware.ts    # Subdomain → slug rewrite
│
├── packages/
│   ├── db/                     # Drizzle ORM: schema, client, migrations
│   │   └── src/
│   │       ├── client.ts
│   │       ├── index.ts
│   │       └── schema/
│   │           ├── tenants.ts
│   │           ├── users.ts
│   │           ├── products.ts
│   │           ├── orders.ts
│   │           ├── storefront.ts
│   │           ├── coupons.ts
│   │           ├── reviews.ts
│   │           ├── shipping.ts
│   │           ├── contact.ts
│   │           ├── analytics.ts
│   │           └── platform.ts  # frameworkConfig key/value store
│   │
│   ├── auth/
│   │   └── src/
│   │       ├── jwt.ts
│   │       ├── password.ts
│   │       └── middleware.ts
│   │
│   ├── types/
│   └── config/
│
├── infra/
│   └── docker-compose.yml
│
├── .env.example
├── biome.json
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## Getting Started

### Quick start with `create-kstack-app`

The fastest way. Run this anywhere — no cloning required:

```bash
npx create-kstack-app
```

Or with a project name:

```bash
npx create-kstack-app my-shop
```

The CLI will ask you a few questions (domain, Paystack keys, email, license key), then automatically clone the framework, generate a `.env` with strong random secrets, install dependencies, and — if Docker is running — start Postgres and push the schema. You'll be at the "create your first store" step in under two minutes.

**Testing locally against a local copy of the framework:**

```bash
npx create-kstack-app my-shop --source ./kstack-framework
```

---

### Manual setup

### Prerequisites

- Node.js >= 20
- pnpm >= 9 (`npm install -g pnpm`)
- Docker + Docker Compose

### 1. Clone and install

```bash
git clone <repo-url> kstack
cd kstack
pnpm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

- `JWT_SECRET` — at least 32 random characters (`openssl rand -base64 48`)
- `JWT_REFRESH_SECRET` — at least 32 random characters, different from above

Everything else can stay as defaults for local development.

### 3. Start the database

```bash
docker compose -f infra/docker-compose.yml up -d
```

### 4. Push the database schema

```bash
pnpm db:push
```

You should see `[✓] Changes applied`.

### 5. Start development servers

```bash
pnpm dev
```

| App | URL | Description |
|---|---|---|
| API | http://localhost:3001 | tRPC + REST server |
| Dashboard | http://localhost:3002 | Merchant admin panel |
| Storefront | http://localhost:3003 | Public storefront |

### 6. Create your first store

Open **http://localhost:3002/register** and fill in your name, email, password, and shop name. You'll land at your dashboard immediately.

To visit your storefront, go to `http://localhost:3003/{your-shop-slug}`.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://kstack:kstack@localhost:5432/kstack` | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `JWT_SECRET` | *(required)* | Access token signing secret (min 32 chars) |
| `JWT_REFRESH_SECRET` | *(required)* | Refresh token signing secret (min 32 chars) |
| `NODE_ENV` | `development` | `development` or `production` |
| `API_PORT` | `3001` | API server port |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | API URL used by the dashboard and storefront |
| `NEXT_PUBLIC_ROOT_DOMAIN` | — | Apex domain for subdomain routing (e.g. `yourdomain.com`) |
| `STORAGE_ENDPOINT` | — | S3-compatible storage endpoint (Cloudflare R2, MinIO, etc.) |
| `STORAGE_ACCESS_KEY_ID` | — | Storage access key |
| `STORAGE_SECRET_ACCESS_KEY` | — | Storage secret key |
| `STORAGE_BUCKET` | `kstack-dev` | Storage bucket name |
| `STORAGE_PUBLIC_URL` | — | Public CDN URL for stored assets |
| `PAYSTACK_SECRET_KEY` | — | Paystack secret key |
| `PAYSTACK_WEBHOOK_SECRET` | — | Paystack webhook signing secret |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | — | Paystack public key (client-side) |
| `RESEND_API_KEY` | — | Resend API key for transactional email |
| `EMAIL_FROM` | — | From address for outgoing emails |
| `KSTACK_LICENSE_KEY` | — | License key for Pro/Enterprise features (see [License Plans](#license-plans)) |
| `KSTACK_TELEMETRY` | `true` | Set to `false` to opt out of anonymous usage telemetry |

---

## License Plans

KStack is **free and open source** under the MIT license. The Community plan has no restrictions.

A license key unlocks **Pro** and **Enterprise** features for commercial deployments.

| Plan | Price | Who it's for |
|---|---|---|
| **Community** | Free | Developers, self-hosted personal projects |
| **Pro** | Paid | Businesses running KStack commercially |
| **Enterprise** | Paid | Large-scale or white-label deployments |

### Getting a license

Get a license key at **https://kstack.dev/pricing**, then add it to your environment:

```bash
KSTACK_LICENSE_KEY=your-key-here
```

On startup the API validates your key against the license server and prints:

```
KStack API  →  http://localhost:3001
  License   PRO ✓
```

### Gating features behind a license

In your API routers, import the helpers from the license module:

```typescript
import { isPro, isEnterprise, getCurrentPlan } from "../lib/license";

// Check before running a procedure
if (!isPro()) {
  throw new TRPCError({ code: "FORBIDDEN", message: "This feature requires a Pro license." });
}
```

### How validation works

- The license is validated **once at startup** against `https://api.kstack.dev/license/validate`
- The result is **cached in your local database for 24 hours** — your server keeps running even if the license API is unreachable
- If validation fails (network error, invalid key), the instance falls back to the **Community plan gracefully** — it never crashes
- The cache endpoint and API URL are configurable via `KSTACK_LICENSE_API_URL`

---

## Telemetry

KStack collects **anonymous usage data** to help prioritise features and fix bugs. This is enabled by default.

### What is collected

| Field | Description |
|---|---|
| `installId` | A random UUID generated once and stored in your local database |
| `version` | The KStack version string from `package.json` |
| `tenantCount` | Number of stores on this instance (an integer) |
| `nodeEnv` | `development` or `production` |

### What is NOT collected

- Any merchant, customer, product, or order data
- Personal or personally identifiable information
- IP addresses
- License keys or financial information

### Opting out

Set `KSTACK_TELEMETRY=false` in your `.env`:

```bash
KSTACK_TELEMETRY=false
```

### First-boot notice

On the very first startup, KStack prints a notice to the terminal explaining what is collected and how to opt out. This notice is shown **once only**.

---

## Packages

### @kstack/db

Drizzle ORM schema definitions, database client, and migration tooling.

**Exports:**
- `db` — Drizzle database instance
- `withTransaction(fn)` — Run operations in a transaction
- All schema table definitions

**Usage:**

```typescript
import { db, products, eq } from "@kstack/db";

const rows = await db.select().from(products).where(eq(products.tenantId, id));
```

**Commands:**

```bash
pnpm db:push       # Push schema directly to database (dev only)
pnpm db:generate   # Generate SQL migration files
pnpm db:migrate    # Apply migration files
pnpm db:studio     # Open Drizzle Studio at localhost:4983
pnpm db:seed       # Seed demo store with sample products
```

---

### @kstack/auth

JWT token management, password hashing, and Hono middleware.

**JWT functions:**

```typescript
import { signAccessToken, signRefreshToken, verifyAccessToken } from "@kstack/auth";

const accessToken = await signAccessToken({ sub, email, tenantId, role });  // 15min TTL
const refreshToken = await signRefreshToken(userId);                         // 30d TTL
const payload = await verifyAccessToken(token);                              // throws if invalid
```

**Password functions:**

```typescript
import { hashPassword, verifyPassword } from "@kstack/auth";

const hash = await hashPassword("mypassword");           // bcrypt, 12 rounds
const valid = await verifyPassword("mypassword", hash);  // boolean
```

**Hono middleware:**

```typescript
import { requireAuth, requireAdminRole } from "@kstack/auth";

app.get("/protected", requireAuth, (c) => {
  const user = c.get("user"); // JwtPayload
  return c.json({ user });
});
```

---

### @kstack/types

Shared Zod schemas and TypeScript types used across all apps and packages.

```typescript
import { TenantSchema, TenantPlan } from "@kstack/types";
// TenantPlan: "free" | "starter" | "pro" | "enterprise"

import { RegisterSchema, LoginSchema, JwtPayload, UserRole } from "@kstack/types";
// UserRole: "owner" | "admin" | "staff"

import { CreateProductSchema, ProductStatus } from "@kstack/types";
// ProductStatus: "draft" | "active" | "archived"

import { OrderSchema, OrderStatus, FinancialStatus } from "@kstack/types";
// OrderStatus: "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded"
// FinancialStatus: "pending" | "paid" | "refunded" | "partially_refunded" | "failed"
```

---

### @kstack/config

Shared base configurations.

- `@kstack/config/tsconfig` — TypeScript base config (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- `@kstack/config/tailwind` — Tailwind base theme

---

## Apps

### API (`apps/api`)

**Port:** 3001

Hono HTTP server with tRPC adapter. All business logic lives here.

**Endpoints:**

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Server health check |
| `POST` | `/webhook/paystack` | Paystack payment webhook |
| `ALL` | `/trpc/*` | tRPC batch handler |

**tRPC procedure types:**

| Type | Auth required | Role required |
|---|---|---|
| `publicProcedure` | No | — |
| `protectedProcedure` | Yes (Bearer JWT) | Any authenticated user |
| `adminProcedure` | Yes (Bearer JWT) | `owner` or `admin` only |

---

### Dashboard (`apps/dashboard`)

**Port:** 3002

Next.js 15 merchant admin. All routes are under `/{shopSlug}/`.

| Route | Description |
|---|---|
| `/login` | Sign in to existing shop |
| `/register` | Create a new shop + owner account |
| `/{slug}` | Overview — stats and recent activity |
| `/{slug}/products` | Product management |
| `/{slug}/orders` | Order management with fulfilment tracking |
| `/{slug}/customers` | Customer list |
| `/{slug}/collections` | Product collections |
| `/{slug}/coupons` | Discount codes |
| `/{slug}/shipping` | Shipping rates |
| `/{slug}/reviews` | Review moderation |
| `/{slug}/contact` | Contact message inbox |
| `/{slug}/analytics` | Store analytics |
| `/{slug}/settings` | Store settings, team, domains, legal pages, store controls |

---

### Storefront (`apps/storefront`)

**Port:** 3003

Next.js 15 SSR app that renders any tenant's shop.

**How tenant resolution works:**

- In development, stores are accessed at `http://localhost:3003/{slug}`
- In production with `NEXT_PUBLIC_ROOT_DOMAIN=yourdomain.com` set, stores can be accessed at `{slug}.yourdomain.com` via subdomain routing (handled by Next.js middleware)
- Merchants can also add a custom domain via Settings → Custom Domains

**Storefront routes:**

| Route | Description |
|---|---|
| `/{slug}` | Home page — On Sale, Recommended, New Arrivals sections |
| `/{slug}/products/{handle}` | Product detail with variant selector and reviews |
| `/{slug}/cart` | Shopping cart |
| `/{slug}/checkout` | Checkout (guest or account login) |
| `/{slug}/orders` | Order tracking |
| `/{slug}/account` | Customer account |
| `/{slug}/contact` | Contact form |
| `/{slug}/wishlist` | Wishlist |
| `/{slug}/legal/privacy` | Privacy Policy |
| `/{slug}/legal/terms` | Terms & Conditions |
| `/{slug}/legal/disclaimer` | Disclaimer |

Legal pages are auto-generated from a comprehensive default template. Merchants can customise them from Settings → Legal Pages in the dashboard.

---

## Database Schema

### Entity Relationship Overview

```
tenants ──< domains
tenants ──< merchantUsers >── users
users ──< refreshTokens
tenants ──< products ──< variants
products ──< productImages
tenants ──< collections ──<> products
tenants ──< customers ──< orders ──< orderLineItems
orders.lineItems >── variants
tenants ──< themes ──< pages
tenants ──< coupons
tenants ──< shippingRates
tenants ──< contactMessages
frameworkConfig (key/value)
```

### Key Tables

#### `tenants`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `slug` | text | Unique store slug |
| `name` | text | Display name |
| `plan` | enum | `free \| starter \| pro \| enterprise` |
| `email` | text | Contact email |
| `logo_url` | text | Optional |
| `maintenance_mode` | boolean | Shows maintenance page to visitors |
| `frozen_at` | timestamptz | `NULL` = active; non-null = store frozen |
| `legal_pages` | jsonb | `{ privacy?, terms?, disclaimer? }` custom markdown |
| `contact_info` | jsonb | Phone, address, business hours etc. |
| `social_links` | jsonb | Facebook, Instagram, Twitter etc. |

#### `products` / `variants`

Products have one or more variants. Each variant has price, inventory, SKU, and option values (e.g. `{ color: "red", size: "M" }`).

#### `orders`

| Column | Type | Notes |
|---|---|---|
| `status` | enum | `pending \| processing \| shipped \| delivered \| cancelled \| refunded` |
| `financial_status` | enum | `pending \| paid \| refunded \| partially_refunded \| failed` |
| `total` | numeric | Final amount charged |
| `shipping_address` | jsonb | Address snapshot |

#### `contact_messages`

Stores messages submitted through the storefront contact form.

| Column | Type | Notes |
|---|---|---|
| `status` | enum | `new \| read \| replied` |
| `name`, `email`, `subject`, `message` | text | |

#### `framework_config`

Internal key/value store used for install ID, telemetry notice state, and license cache.

---

## API Reference

All API calls go through tRPC at `POST http://localhost:3001/trpc/{procedure}`.

```bash
# Query
curl http://localhost:3001/trpc/auth.me \
  -H "Authorization: Bearer <token>"

# Mutation
curl -X POST "http://localhost:3001/trpc/auth.login?batch=1" \
  -H "Content-Type: application/json" \
  -d '{"0":{"json":{"email":"you@example.com","password":"yourpassword"}}}'
```

### `auth.register`

**Type:** Public mutation

**Input:**
```typescript
{
  name: string;
  email: string;
  password: string;      // min 8 characters
  shopName: string;
  shopSlug: string;      // lowercase, hyphens, 3–32 chars
}
```

**Returns:** `{ accessToken, refreshToken, user, tenant }`

---

### `auth.login`

**Type:** Public mutation

**Input:** `{ email: string; password: string; }`

**Returns:** Same shape as `auth.register`.

---

### `auth.refresh`

**Type:** Public mutation

**Input:** `{ refreshToken: string; }`

**Returns:** `{ accessToken, refreshToken }` — old token is immediately revoked.

---

### `auth.me`

**Type:** Protected query

**Returns:** `{ user: { id, email, name }, tenant: { id, slug, name, plan } }`

---

### `products.list`

**Type:** Protected query

**Input:** `{ status?, limit?, offset? }`

---

### `products.create`

**Type:** Protected mutation

**Input:** `{ title, description?, handle?, status?, tags? }`

---

### `products.createVariant`

**Type:** Protected mutation

**Input:**
```typescript
{
  productId: string;
  data: { title, price, sku?, comparePrice?, inventory?, options?, imageUrl? }
}
```

---

### `orders.list`

**Type:** Protected query

**Input:** `{ status?, financialStatus?, limit?, offset? }`

---

### `orders.updateStatus`

**Type:** Admin mutation

**Input:** `{ id: string; status: OrderStatus; reason?: string }`

---

### `tenant.update`

**Type:** Admin mutation

**Input:**
```typescript
{
  name?: string;
  email?: string;
  logoUrl?: string | null;
  socialLinks?: Record<string, string>;
  contactInfo?: Record<string, string>;
  legalPages?: { privacy?: string; terms?: string; disclaimer?: string };
}
```

---

### `tenant.setMaintenance`

**Type:** Admin mutation

**Input:** `{ enabled: boolean }`

---

### `tenant.setFrozen`

**Type:** Admin mutation

**Input:** `{ frozen: boolean }`

---

### `public.resolveShop`

**Type:** Public query

**Input:** `{ slug: string }`

Returns the public shop data used by the storefront. Returns `NOT_FOUND` if the store is frozen.

---

## Authentication

### Token Strategy

- **Access token** — 15-minute TTL, signed with `JWT_SECRET`, sent as `Authorization: Bearer <token>`
- **Refresh token** — 30-day TTL, stored server-side as a SHA-256 hash, rotated on every use

### Token Rotation

Every `auth.refresh` call revokes the old token and issues a fresh pair. A revoked token presented again signals potential theft and is rejected.

### Frontend Storage

Auth state persisted to `localStorage` under key `kstack_auth`:

```typescript
{
  accessToken: string | null;
  refreshToken: string | null;
  user: { id, email, name } | null;
  tenant: { id, slug, name } | null;
}
```

---

## Multi-Tenancy

Every table has a `tenant_id` column. All tRPC procedures scope queries to `ctx.tenantId` extracted from the JWT — a merchant can never access another merchant's data even with a valid token.

```typescript
// Always scoped — impossible to leak cross-tenant
await ctx.db.select().from(products).where(eq(products.tenantId, ctx.tenantId));
```

---

## Role-Based Access Control

| Role | Description |
|---|---|
| `owner` | Full access including billing, staff management, and store deletion |
| `admin` | Products, orders, settings, domains — everything except store deletion |
| `staff` | Read access, order processing |

- `protectedProcedure` — any authenticated role
- `adminProcedure` — `owner` or `admin` only

---

## CLI Reference

KStack ships two CLIs.

### `create-kstack-app` — project creator

Run with `npx` — no install needed.

```bash
npx create-kstack-app                        # interactive setup
npx create-kstack-app my-shop                # pre-fill project name
npx create-kstack-app my-shop --source ./kstack-framework  # use local copy
npx create-kstack-app --skip-install         # skip pnpm install step
npx create-kstack-app --skip-git             # skip git init
npx create-kstack-app --version              # print version
```

### `kstack` — in-project CLI

Run inside any KStack project with `pnpm kstack`.

```bash
# Scaffold a new module (generates router, dashboard page, DB schema, wires everything up)
pnpm kstack module:create KStack_Loyalty
pnpm kstack module:create KStack_Blog --description "Blog posts and articles"
pnpm kstack module:create KStack_Referrals --no-schema    # skip DB schema
pnpm kstack module:create KStack_Widget --dry-run         # preview without writing files

# List all registered modules and their status
pnpm kstack module:list

# Show framework version, module count, and license plan
pnpm kstack info
```

**What `module:create` generates:**

| File | Description |
|---|---|
| `apps/api/src/routers/{name}.ts` | tRPC router with `list`, `get`, `create`, `update`, `delete` stubs |
| `apps/dashboard/src/app/[slug]/{name}/page.tsx` | Dashboard page with table + create form |
| `packages/db/src/schema/{name}.ts` | Drizzle table with `id`, `tenantId`, `name`, `createdAt`, `updatedAt` |
| Patches `apps/api/src/router.ts` | Adds import + registers router in `appRouter` |
| Patches `packages/db/src/schema/index.ts` | Adds `export * from "./{name}"` |
| Patches `apps/dashboard/src/components/sidebar.tsx` | Adds nav item |
| Patches `apps/dashboard/src/lib/modules.ts` | Registers module in the Modules settings list |
| Updates `modules.json` | Registers module in the manifest |

---

## Development Commands

```bash
# Start all dev servers
pnpm dev

# Start individual apps
pnpm --filter=@kstack/api dev
pnpm --filter=@kstack/dashboard dev
pnpm --filter=@kstack/storefront dev

# Build all
pnpm build

# Type-check all
pnpm typecheck

# Lint + format
pnpm lint
pnpm format

# Database
pnpm db:push        # Push schema to DB (dev — no migration files)
pnpm db:generate    # Generate SQL migration files
pnpm db:migrate     # Apply migration files
pnpm db:studio      # Open Drizzle Studio at localhost:4983
pnpm db:seed        # Seed demo store

# Infrastructure
docker compose -f infra/docker-compose.yml up -d    # Start Postgres
docker compose -f infra/docker-compose.yml down     # Stop Postgres
docker compose -f infra/docker-compose.yml down -v  # Stop + wipe data
```

---

## Deployment

### Services to deploy

| Service | Recommended platform |
|---|---|
| `apps/api` | Railway, Fly.io, or any Node.js host |
| `apps/dashboard` | Vercel |
| `apps/storefront` | Vercel |
| PostgreSQL | Neon, Supabase, or managed RDS |
| File storage | Cloudflare R2 (zero egress fees) |

### DNS setup for subdomain routing

1. Add a wildcard DNS record: `*.yourdomain.com` → CNAME to your storefront host
2. Set `NEXT_PUBLIC_ROOT_DOMAIN=yourdomain.com` on your storefront deployment
3. Set `ROOT_DOMAIN=yourdomain.com` on your API deployment
4. For merchant custom domains: the merchant adds a CNAME `shop.theirdomain.com → yourdomain.com`, then verifies via the dashboard by adding a DNS TXT record `_kstack-verify=<token>`

### Required production environment variables

```bash
# Generate strong secrets
openssl rand -base64 48   # run twice — one for JWT_SECRET, one for JWT_REFRESH_SECRET

NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:5432/kstack
JWT_SECRET=<generated>
JWT_REFRESH_SECRET=<generated>
NEXT_PUBLIC_ROOT_DOMAIN=yourdomain.com
ROOT_DOMAIN=yourdomain.com
ALLOWED_ORIGINS=https://dashboard.yourdomain.com,https://yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
EMAIL_FROM=noreply@yourdomain.com
RESEND_API_KEY=<your key>
```

---

## Roadmap

### Complete
- [x] Monorepo setup (Turborepo + pnpm)
- [x] Full database schema
- [x] Auth package (JWT, bcrypt, middleware)
- [x] API server (tRPC — all modules)
- [x] Merchant dashboard
- [x] Storefront (SSR, subdomain routing, custom domains)
- [x] Product management with variants, images, collections
- [x] Order management with fulfilment and notes
- [x] Customer accounts and guest checkout
- [x] Paystack payment integration
- [x] Coupon and discount codes
- [x] Shipping rate configuration
- [x] Product reviews (purchase-gated)
- [x] Contact form with inbox
- [x] Store controls (maintenance mode, freeze, delete)
- [x] Legal pages (Privacy, Terms, Disclaimer)
- [x] License plan system
- [x] Anonymous telemetry with opt-out
- [x] `create-kstack-app` — interactive project creator (`npx create-kstack-app`)
- [x] `kstack` CLI — module scaffold, `module:list`, `info` commands

### In Progress / Planned
- [ ] Page builder (Craft.js drag-and-drop)
- [ ] Monaco code editor for raw HTML/CSS/JS pages
- [ ] Analytics dashboard (revenue charts, top products)
- [ ] Multi-currency support
- [ ] Staff invitation via email
- [ ] DNS verification worker
- [ ] Plugin / app marketplace
- [ ] Mobile merchant app (Expo)
- [ ] B2B / wholesale pricing tiers
- [ ] AI-assisted product descriptions

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Follow the module naming convention in [CLAUDE.md](CLAUDE.md)
4. Ensure `pnpm typecheck` and `pnpm lint` pass
5. Open a pull request with a clear description of what and why

---

## License

MIT — free to use, modify, and distribute. See [LICENSE](LICENSE) for the full text.

For commercial deployments with Pro or Enterprise features, a license key is required. See [License Plans](#license-plans).
