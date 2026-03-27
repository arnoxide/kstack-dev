// Central module catalog — kept in sync with modules.json at the project root.
// The scaffold CLI (tools/scaffold.ts) patches this file when creating a new module.

export interface ModuleDef {
  /** Full module name e.g. "KStack_Collections" */
  name: string;
  /** Human-readable sidebar/settings label */
  label: string;
  /** Short description shown in settings */
  description: string;
  /** Core modules cannot be disabled */
  core: boolean;
  /** Dashboard route slug (null if no dashboard page) */
  route: string | null;
}

/** Modules that can never be disabled */
const CORE: Set<string> = new Set([
  "KStack_Catalog",
  "KStack_Orders",
  "KStack_Customers",
  "KStack_Storefront",
]);

export const MODULES: ModuleDef[] = [
  {
    name: "KStack_Catalog",
    label: "Catalog",
    description: "Products, variants, images and inventory management",
    core: true,
    route: "products",
  },
  {
    name: "KStack_Collections",
    label: "Collections",
    description: "Product collections and category grouping",
    core: false,
    route: "collections",
  },
  {
    name: "KStack_Orders",
    label: "Orders",
    description: "Order creation, line items, status and fulfilment",
    core: true,
    route: "orders",
  },
  {
    name: "KStack_Customers",
    label: "Customers",
    description: "Customer accounts, profiles and authentication",
    core: true,
    route: "customers",
  },
  {
    name: "KStack_Coupons",
    label: "Coupons",
    description: "Discount codes — percentage, fixed amount, free shipping",
    core: false,
    route: "coupons",
  },
  {
    name: "KStack_Shipping",
    label: "Shipping",
    description: "Shipping rates and methods",
    core: false,
    route: "shipping",
  },
  {
    name: "KStack_Reviews",
    label: "Reviews",
    description: "Product reviews submission and admin moderation",
    core: false,
    route: "reviews",
  },
  {
    name: "KStack_Storefront",
    label: "Themes & Pages",
    description: "Themes, drag-and-drop page builder and block rendering",
    core: true,
    route: "themes",
  },
  {
    name: "KStack_Integrations",
    label: "Integrations",
    description: "Third-party service integrations (payment, analytics, marketing)",
    core: false,
    route: "integrations",
  },
  {
    name: "KStack_Analytics",
    label: "Analytics",
    description: "Store analytics: revenue, orders, top products and customer stats",
    core: false,
    route: "analytics",
  },
  {
    name: "KStack_Wishlist",
    label: "Wishlist",
    description: "Customer wishlist stored client-side (localStorage)",
    core: false,
    route: null, // storefront-only, no dashboard page
  },
  {
    name: "KStack_Loader",
    label: "Loader",
    description: "Loading skeletons and spinners for route transitions",
    core: true,
    route: null,
  },

  // ── Planned modules ──────────────────────────────────────────────────────────
  {
    name: "KStack_AIAssistant",
    label: "AI Assistant",
    description: "AI product descriptions, customer chatbot and smart recommendations",
    core: false,
    route: "ai-assistant",
  },
  {
    name: "KStack_Realtime",
    label: "Real-Time Engine",
    description: "Live inventory, purchase notifications and cross-device cart sync",
    core: false,
    route: null,
  },
  {
    name: "KStack_SmartCart",
    label: "Smart Cart",
    description: "Upsells, cross-sells, bundle recommendations and dynamic pricing",
    core: false,
    route: "smart-cart",
  },
  {
    name: "KStack_Personalization",
    label: "Personalization",
    description: "Geo-based pricing, behavior recommendations and personalized homepages",
    core: false,
    route: "personalization",
  },
  {
    name: "KStack_Marketplace",
    label: "App Marketplace",
    description: "Third-party plugin and app marketplace",
    core: false,
    route: "marketplace",
  },
  {
    name: "KStack_Headless",
    label: "Headless API",
    description: "Public REST/GraphQL API with SDKs for external integrations",
    core: false,
    route: "headless",
  },
  {
    name: "KStack_ShoppableMedia",
    label: "Shoppable Media",
    description: "Clickable products in videos and interactive showcases",
    core: false,
    route: "shoppable-media",
  },
  {
    name: "KStack_FraudDetection",
    label: "Fraud Detection",
    description: "Risk scoring, suspicious activity detection and IP/behavior tracking",
    core: false,
    route: "fraud-detection",
  },
  {
    name: "KStack_Automation",
    label: "Automation",
    description: "Rule-based workflows, automated emails and inventory/order triggers",
    core: false,
    route: "automation",
  },
  {
    name: "KStack_MobileAdmin",
    label: "Mobile Admin",
    description: "Mobile merchant app with push notifications and on-the-go analytics",
    core: false,
    route: null,
  },
  {
    name: "KStack_IoT",
    label: "IoT",
    description: "Smart inventory tracking, device-triggered automation and voice control",
    core: false,
    route: null,
  },

  // ── Custom modules added by scaffold CLI appear below ───────────────────────
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = (slug: string) => `kstack_disabled_modules_${slug}`;

export function getDisabledModules(slug: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY(slug));
    return new Set<string>(JSON.parse(raw ?? "[]"));
  } catch {
    return new Set();
  }
}

export function saveDisabledModules(slug: string, disabled: Set<string>) {
  localStorage.setItem(STORAGE_KEY(slug), JSON.stringify([...disabled]));
}

export function isModuleEnabled(slug: string, moduleName: string): boolean {
  if (CORE.has(moduleName)) return true;
  return !getDisabledModules(slug).has(moduleName);
}
