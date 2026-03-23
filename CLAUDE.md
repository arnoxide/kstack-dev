# Kasify — Project Rules for Claude

## Module Naming Convention

All new modules **must** follow the `Vendor_ModuleName` pattern, identical to Magento's convention.

- **Vendor** — always `Kasify` (or a partner/custom vendor prefix if building a third-party module)
- **ModuleName** — PascalCase, describes the feature domain

### Examples
| Module | Description |
|---|---|
| `Kasify_Catalog` | Products, variants, images, collections |
| `Kasify_Orders` | Order creation, line items, status management |
| `Kasify_Customers` | Customer accounts, profiles, auth |
| `Kasify_Coupons` | Discount codes and usage tracking |
| `Kasify_Shipping` | Shipping rates and methods |
| `Kasify_Reviews` | Product reviews and moderation |
| `Kasify_Storefront` | Themes, pages, page builder |
| `Kasify_Integrations` | Third-party service integrations |
| `Kasify_Analytics` | Store analytics and reporting |
| `Kasify_Collections` | Product collections / categories |

### Rules
1. **Before adding any new feature**, check `modules.json` at the project root to see if a module for that domain already exists. If it does, extend it rather than creating a new one.
2. **Every new module** must be registered in `modules.json` with its name, description, status, and the files it owns.
3. **Module name in code** — use the `Vendor_ModuleName` string as a comment header at the top of the primary router file, e.g.:
   ```typescript
   // Module: Kasify_Collections
   ```
4. **File ownership** — each module owns:
   - One API router: `apps/api/src/routers/<moduleName>.ts`
   - One dashboard page: `apps/dashboard/src/app/[slug]/<moduleName>/page.tsx` (if it has UI)
   - One or more storefront components/pages (if customer-facing)
   - Any DB schema additions in `packages/db/src/schema/`
5. **Never split a module's core logic** across multiple routers. If a feature grows, add procedures to the existing router.
6. **Handle conflicts** — if two modules need to interact (e.g., `Kasify_Orders` reading `Kasify_Catalog` inventory), import from the other module's schema directly. Do not create a separate "bridge" router.

### Adding a New Module — Checklist
- [ ] Check `modules.json` — module doesn't already exist
- [ ] Choose name: `Kasify_<PascalCase>`
- [ ] Add DB schema to `packages/db/src/schema/` if needed, export from `index.ts`, run `pnpm db:push`
- [ ] Create API router at `apps/api/src/routers/<camelCase>.ts` with `// Module: Kasify_<Name>` header
- [ ] Register router in `apps/api/src/router.ts`
- [ ] Create dashboard page at `apps/dashboard/src/app/[slug]/<camelCase>/page.tsx` if needed
- [ ] Add nav item to `apps/dashboard/src/components/sidebar.tsx` if needed
- [ ] Create storefront page/component if customer-facing
- [ ] Register module in `modules.json`
