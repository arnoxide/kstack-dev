// Module: Kasify_Docs
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  ArrowRight,
  Package,
  Palette,
  CreditCard,
  Truck,
  Tag,
  BarChart3,
  Users,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  BookOpen,
} from "lucide-react";
import { useState } from "react";
import { getAuthState } from "@/lib/auth-store";

// ─── Inline SVG illustrations ──────────────────────────────────────────────────

function IllustrationProducts() {
  return (
    <svg viewBox="0 0 200 140" fill="none" className="w-full h-full">
      <rect width="200" height="140" fill="#f0f9ff" rx="12" />
      {/* shelf */}
      <rect x="20" y="95" width="160" height="6" rx="3" fill="#bae6fd" />
      {/* box left */}
      <rect x="28" y="58" width="38" height="37" rx="4" fill="#38bdf8" />
      <rect x="28" y="58" width="38" height="12" rx="4" fill="#0ea5e9" />
      <path d="M47 64l0 0" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <line x1="47" y1="62" x2="47" y2="70" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      {/* box center */}
      <rect x="80" y="48" width="42" height="47" rx="4" fill="#6366f1" />
      <rect x="80" y="48" width="42" height="14" rx="4" fill="#4f46e5" />
      <line x1="101" y1="51" x2="101" y2="62" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      {/* star on center */}
      <polygon points="101,72 103,78 109,78 104,82 106,88 101,84 96,88 98,82 93,78 99,78" fill="#e0e7ff" />
      {/* box right */}
      <rect x="136" y="62" width="36" height="33" rx="4" fill="#10b981" />
      <rect x="136" y="62" width="36" height="11" rx="4" fill="#059669" />
      <line x1="154" y1="65" x2="154" y2="73" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      {/* price tag */}
      <rect x="144" y="79" width="20" height="10" rx="3" fill="#d1fae5" />
      <line x1="148" y1="84" x2="160" y2="84" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
      {/* plus button */}
      <circle cx="168" cy="30" r="12" fill="#0ea5e9" />
      <line x1="168" y1="24" x2="168" y2="36" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="162" y1="30" x2="174" y2="30" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      {/* label */}
      <rect x="28" y="112" width="38" height="5" rx="2.5" fill="#bae6fd" />
      <rect x="80" y="112" width="42" height="5" rx="2.5" fill="#c7d2fe" />
      <rect x="136" y="112" width="36" height="5" rx="2.5" fill="#a7f3d0" />
    </svg>
  );
}

function IllustrationTheme() {
  return (
    <svg viewBox="0 0 200 140" fill="none" className="w-full h-full">
      <rect width="200" height="140" fill="#fdf4ff" rx="12" />
      {/* browser chrome */}
      <rect x="20" y="20" width="160" height="100" rx="8" fill="white" stroke="#e9d5ff" strokeWidth="1.5" />
      <rect x="20" y="20" width="160" height="22" rx="8" fill="#f3e8ff" />
      <rect x="20" y="30" width="160" height="12" fill="#f3e8ff" />
      <circle cx="34" cy="31" r="4" fill="#f0abfc" />
      <circle cx="48" cy="31" r="4" fill="#e879f9" />
      <circle cx="62" cy="31" r="4" fill="#d946ef" />
      <rect x="76" y="27" width="88" height="8" rx="4" fill="white" />
      {/* hero banner */}
      <rect x="28" y="50" width="144" height="40" rx="5" fill="#e9d5ff" />
      <rect x="28" y="50" width="144" height="40" rx="5" fill="url(#grad1)" />
      <defs>
        <linearGradient id="grad1" x1="28" y1="50" x2="172" y2="90" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a855f7" />
          <stop offset="1" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <rect x="40" y="59" width="50" height="7" rx="3.5" fill="white" opacity="0.9" />
      <rect x="40" y="71" width="32" height="5" rx="2.5" fill="white" opacity="0.6" />
      <rect x="120" y="62" width="36" height="16" rx="8" fill="white" opacity="0.9" />
      {/* product grid */}
      <rect x="28" y="97" width="42" height="16" rx="4" fill="#f3e8ff" />
      <rect x="79" y="97" width="42" height="16" rx="4" fill="#f3e8ff" />
      <rect x="130" y="97" width="42" height="16" rx="4" fill="#f3e8ff" />
      {/* paint brush */}
      <circle cx="168" cy="28" r="10" fill="#a855f7" />
      <text x="163" y="33" fill="white" fontSize="12" fontWeight="bold">✦</text>
    </svg>
  );
}

function IllustrationPayments() {
  return (
    <svg viewBox="0 0 200 140" fill="none" className="w-full h-full">
      <rect width="200" height="140" fill="#f0fdf4" rx="12" />
      {/* card */}
      <rect x="24" y="38" width="100" height="64" rx="10" fill="#1e293b" />
      <rect x="24" y="38" width="100" height="64" rx="10" fill="url(#cardGrad)" />
      <defs>
        <linearGradient id="cardGrad" x1="24" y1="38" x2="124" y2="102" gradientUnits="userSpaceOnUse">
          <stop stopColor="#166534" />
          <stop offset="1" stopColor="#15803d" />
        </linearGradient>
      </defs>
      <rect x="36" y="57" width="20" height="15" rx="3" fill="#fbbf24" />
      <rect x="44" y="57" width="20" height="15" rx="3" fill="#f59e0b" opacity="0.7" />
      <rect x="34" y="82" width="14" height="5" rx="2.5" fill="white" opacity="0.5" />
      <rect x="52" y="82" width="14" height="5" rx="2.5" fill="white" opacity="0.5" />
      <rect x="70" y="82" width="14" height="5" rx="2.5" fill="white" opacity="0.5" />
      <rect x="88" y="82" width="14" height="5" rx="2.5" fill="white" opacity="0.5" />
      {/* paystack label */}
      <rect x="34" y="92" width="40" height="6" rx="3" fill="white" opacity="0.3" />
      {/* checkmark circle */}
      <circle cx="152" cy="70" r="28" fill="#dcfce7" />
      <circle cx="152" cy="70" r="20" fill="#22c55e" />
      <path d="M142 70l7 7 13-14" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {/* coins */}
      <circle cx="34" cy="120" r="8" fill="#fbbf24" />
      <circle cx="50" cy="120" r="8" fill="#f59e0b" />
      <circle cx="66" cy="120" r="8" fill="#fbbf24" />
      <circle cx="34" cy="120" r="8" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" />
      <text x="30" y="124" fill="#92400e" fontSize="9" fontWeight="bold">$</text>
      <text x="46" y="124" fill="#92400e" fontSize="9" fontWeight="bold">$</text>
      <text x="62" y="124" fill="#92400e" fontSize="9" fontWeight="bold">$</text>
    </svg>
  );
}

function IllustrationOrders() {
  return (
    <svg viewBox="0 0 200 140" fill="none" className="w-full h-full">
      <rect width="200" height="140" fill="#fff7ed" rx="12" />
      {/* order list */}
      <rect x="20" y="22" width="160" height="96" rx="8" fill="white" stroke="#fed7aa" strokeWidth="1.5" />
      {/* header */}
      <rect x="20" y="22" width="160" height="22" rx="8" fill="#fff7ed" />
      <rect x="20" y="34" width="160" height="10" fill="#fff7ed" />
      <rect x="30" y="28" width="40" height="7" rx="3.5" fill="#fb923c" />
      <rect x="148" y="28" width="22" height="7" rx="3.5" fill="#fed7aa" />
      {/* row 1 */}
      <rect x="28" y="52" width="144" height="22" rx="5" fill="#fff7ed" />
      <circle cx="40" cy="63" r="7" fill="#fb923c" opacity="0.3" />
      <rect x="52" y="59" width="40" height="5" rx="2.5" fill="#c2410c" opacity="0.6" />
      <rect x="52" y="66" width="24" height="4" rx="2" fill="#fdba74" />
      <rect x="138" y="59" width="26" height="8" rx="4" fill="#dcfce7" />
      <text x="141" y="66" fill="#16a34a" fontSize="7" fontWeight="600">Paid</text>
      {/* row 2 */}
      <rect x="28" y="78" width="144" height="22" rx="5" fill="#fff7ed" />
      <circle cx="40" cy="89" r="7" fill="#6366f1" opacity="0.3" />
      <rect x="52" y="85" width="50" height="5" rx="2.5" fill="#c2410c" opacity="0.6" />
      <rect x="52" y="92" width="24" height="4" rx="2" fill="#fdba74" />
      <rect x="138" y="85" width="34" height="8" rx="4" fill="#fef9c3" />
      <text x="140" y="92" fill="#a16207" fontSize="7" fontWeight="600">Pending</text>
      {/* row 3 */}
      <rect x="28" y="104" width="144" height="8" rx="4" fill="#f1f5f9" />
      {/* truck icon at top right */}
      <circle cx="170" cy="28" r="12" fill="#fb923c" />
      <path d="M163 32h10l3-4h-13z" fill="white" />
      <rect x="163" y="28" width="7" height="4" rx="1" fill="white" />
      <circle cx="165" cy="34" r="1.5" fill="white" />
      <circle cx="172" cy="34" r="1.5" fill="white" />
    </svg>
  );
}

function IllustrationShipping() {
  return (
    <svg viewBox="0 0 200 140" fill="none" className="w-full h-full">
      <rect width="200" height="140" fill="#f0f9ff" rx="12" />
      {/* road */}
      <path d="M0 110 Q100 90 200 110" stroke="#cbd5e1" strokeWidth="3" fill="none" />
      {/* truck */}
      <rect x="50" y="72" width="60" height="32" rx="4" fill="#0ea5e9" />
      <rect x="110" y="80" width="26" height="24" rx="4" fill="#7dd3fc" />
      <rect x="112" y="82" width="22" height="14" rx="2" fill="#e0f2fe" />
      <circle cx="62" cy="104" r="8" fill="#1e293b" />
      <circle cx="62" cy="104" r="4" fill="#94a3b8" />
      <circle cx="100" cy="104" r="8" fill="#1e293b" />
      <circle cx="100" cy="104" r="4" fill="#94a3b8" />
      <circle cx="125" cy="104" r="8" fill="#1e293b" />
      <circle cx="125" cy="104" r="4" fill="#94a3b8" />
      {/* package on truck */}
      <rect x="60" y="76" width="22" height="22" rx="3" fill="#fbbf24" />
      <line x1="71" y1="76" x2="71" y2="98" stroke="#f59e0b" strokeWidth="1.5" />
      <line x1="60" y1="87" x2="82" y2="87" stroke="#f59e0b" strokeWidth="1.5" />
      {/* location pin destination */}
      <path d="M170 50 C170 40 180 35 180 45 C180 52 170 60 170 60 C170 60 160 52 160 45 C160 35 170 40 170 50z" fill="#ef4444" />
      <circle cx="170" cy="45" r="5" fill="white" />
      {/* speed lines */}
      <line x1="20" y1="82" x2="44" y2="82" stroke="#bae6fd" strokeWidth="2" strokeLinecap="round" />
      <line x1="24" y1="90" x2="44" y2="90" stroke="#bae6fd" strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="98" x2="44" y2="98" stroke="#bae6fd" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IllustrationAnalytics() {
  return (
    <svg viewBox="0 0 200 140" fill="none" className="w-full h-full">
      <rect width="200" height="140" fill="#f8fafc" rx="12" />
      {/* chart area */}
      <rect x="20" y="20" width="160" height="100" rx="8" fill="white" stroke="#e2e8f0" strokeWidth="1.5" />
      {/* grid lines */}
      <line x1="30" y1="100" x2="170" y2="100" stroke="#f1f5f9" strokeWidth="1" />
      <line x1="30" y1="80" x2="170" y2="80" stroke="#f1f5f9" strokeWidth="1" />
      <line x1="30" y1="60" x2="170" y2="60" stroke="#f1f5f9" strokeWidth="1" />
      <line x1="30" y1="40" x2="170" y2="40" stroke="#f1f5f9" strokeWidth="1" />
      {/* bars */}
      <rect x="38" y="70" width="18" height="30" rx="3" fill="#bfdbfe" />
      <rect x="64" y="55" width="18" height="45" rx="3" fill="#6366f1" />
      <rect x="90" y="63" width="18" height="37" rx="3" fill="#bfdbfe" />
      <rect x="116" y="42" width="18" height="58" rx="3" fill="#6366f1" />
      <rect x="142" y="50" width="18" height="50" rx="3" fill="#a5b4fc" />
      {/* trend line */}
      <path d="M47 75 L73 60 L99 68 L125 46 L151 54" stroke="#f97316" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* dots on line */}
      <circle cx="47" cy="75" r="3.5" fill="#f97316" />
      <circle cx="73" cy="60" r="3.5" fill="#f97316" />
      <circle cx="99" cy="68" r="3.5" fill="#f97316" />
      <circle cx="125" cy="46" r="3.5" fill="#f97316" />
      <circle cx="151" cy="54" r="3.5" fill="#f97316" />
      {/* stat chip */}
      <rect x="108" y="26" width="52" height="20" rx="10" fill="#dcfce7" />
      <text x="118" y="40" fill="#16a34a" fontSize="10" fontWeight="700">↑ 24%</text>
    </svg>
  );
}

function IllustrationTracking() {
  return (
    <svg viewBox="0 0 200 140" fill="none" className="w-full h-full">
      <rect width="200" height="140" fill="#fefce8" rx="12" />
      {/* timeline track */}
      <line x1="30" y1="70" x2="170" y2="70" stroke="#fde68a" strokeWidth="4" strokeLinecap="round" />
      <line x1="30" y1="70" x2="130" y2="70" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
      {/* step 1 — done */}
      <circle cx="30" cy="70" r="12" fill="#f59e0b" />
      <path d="M24 70l4 4 8-8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="18" y="88" width="24" height="8" rx="4" fill="#fde68a" />
      <text x="21" y="95" fill="#92400e" fontSize="6" fontWeight="600">Order</text>
      {/* step 2 — done */}
      <circle cx="80" cy="70" r="12" fill="#f59e0b" />
      <path d="M74 70l4 4 8-8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="62" y="88" width="36" height="8" rx="4" fill="#fde68a" />
      <text x="65" y="95" fill="#92400e" fontSize="6" fontWeight="600">Processing</text>
      {/* step 3 — done */}
      <circle cx="130" cy="70" r="12" fill="#f59e0b" />
      <path d="M124 70l4 4 8-8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="116" y="88" width="28" height="8" rx="4" fill="#fde68a" />
      <text x="119" y="95" fill="#92400e" fontSize="6" fontWeight="600">Shipped</text>
      {/* step 4 — pending */}
      <circle cx="170" cy="70" r="12" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" />
      <circle cx="170" cy="70" r="4" fill="#fbbf24" />
      <rect x="154" y="88" width="32" height="8" rx="4" fill="#fde68a" />
      <text x="156" y="95" fill="#92400e" fontSize="6" fontWeight="600">Delivered</text>
      {/* package icon above */}
      <rect x="120" y="32" width="26" height="26" rx="5" fill="#fbbf24" />
      <line x1="133" y1="32" x2="133" y2="58" stroke="#f59e0b" strokeWidth="1.5" />
      <line x1="120" y1="45" x2="146" y2="45" stroke="#f59e0b" strokeWidth="1.5" />
      {/* arrow down */}
      <path d="M133 58 L133 62 M130 60 L133 63 L136 60" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Setup checklist steps ──────────────────────────────────────────────────────

const SETUP_STEPS = [
  { id: "store", label: "Configure your store name and logo", href: "settings" },
  { id: "product", label: "Add your first product", href: "products/new" },
  { id: "theme", label: "Choose and customise a theme", href: "themes" },
  { id: "payment", label: "Connect Paystack for payments", href: "integrations" },
  { id: "shipping", label: "Set up a shipping rate", href: "shipping" },
  { id: "domain", label: "Share your store link with customers", href: "" },
];

// ─── Feature guides ─────────────────────────────────────────────────────────────

const GUIDES = [
  {
    id: "products",
    title: "Add & manage products",
    description:
      "Create product listings with images, variants (size, colour), stock levels, and pricing. Organise them into collections so customers can browse easily.",
    steps: [
      "Go to Products → New product",
      "Add a title, description, and at least one image",
      "Set price and stock quantity",
      "Toggle status to Active when ready",
      "Group products into Collections for easy browsing",
    ],
    icon: Package,
    color: "blue",
    illustration: <IllustrationProducts />,
    href: "products",
  },
  {
    id: "theme",
    title: "Customise your storefront",
    description:
      "Pick a theme colour palette, upload your logo, and edit your homepage layout using the page builder — no coding required.",
    steps: [
      "Go to Themes & Pages → select a theme",
      "Edit primary and secondary colours to match your brand",
      "Upload your logo in Settings",
      "Use the Pages editor to build your homepage sections",
      "Preview your store before publishing",
    ],
    icon: Palette,
    color: "purple",
    illustration: <IllustrationTheme />,
    href: "themes",
  },
  {
    id: "payments",
    title: "Accept payments with Paystack",
    description:
      "Connect your Paystack account so customers can pay securely by card, EFT, or mobile money. Keys are stored per store — no developer needed.",
    steps: [
      "Sign up at paystack.com and get your API keys",
      "Go to Integrations → Paystack → Configure",
      "Paste your Public Key, Secret Key, and Webhook Secret",
      "Enable the integration and test with a small order",
      "Paystack handles the payment popup automatically",
    ],
    icon: CreditCard,
    color: "green",
    illustration: <IllustrationPayments />,
    href: "integrations",
  },
  {
    id: "orders",
    title: "Manage your orders",
    description:
      "See every order in one place. Update fulfilment status, add a tracking number, send shipping notifications, or cancel with automatic stock restore.",
    steps: [
      "Go to Orders to see all incoming orders",
      "Click an order to open the detail panel",
      "Change fulfilment status as you pack and ship",
      "Add a tracking number and carrier to notify the customer",
      "Cancel an order to automatically restore stock",
    ],
    icon: ShoppingCart,
    color: "orange",
    illustration: <IllustrationOrders />,
    href: "orders",
  },
  {
    id: "shipping",
    title: "Set up shipping rates",
    description:
      "Create flat-rate or free shipping options per region. Customers see your shipping cost at checkout before they pay.",
    steps: [
      "Go to Shipping → Add shipping rate",
      "Set a name (e.g. \"Standard delivery\")",
      "Enter the price (or 0 for free shipping)",
      "Optionally restrict to a region or minimum order amount",
      "Save — it appears at checkout immediately",
    ],
    icon: Truck,
    color: "cyan",
    illustration: <IllustrationShipping />,
    href: "shipping",
  },
  {
    id: "tracking",
    title: "Order tracking for customers",
    description:
      "Customers can track their order status on your storefront by entering their order number and email — no account needed.",
    steps: [
      "Your store already has a /track page",
      "Share the link: yourstore.com/[slug]/track",
      "Customers enter their order number + email",
      "They see a live status timeline and tracking number",
      "Update the order status in your dashboard to keep it current",
    ],
    icon: Tag,
    color: "yellow",
    illustration: <IllustrationTracking />,
    href: "",
  },
  {
    id: "analytics",
    title: "Track your store performance",
    description:
      "View total sales, order counts, and top products. Understand which days drive the most revenue so you can plan promotions.",
    steps: [
      "Go to Analytics for an overview",
      "Check revenue trends over the last 30 days",
      "See your best-selling products",
      "Use Coupons to drive sales during slow periods",
      "Review customer data to understand your audience",
    ],
    icon: BarChart3,
    color: "indigo",
    illustration: <IllustrationAnalytics />,
    href: "analytics",
  },
  {
    id: "customers",
    title: "Know your customers",
    description:
      "Browse all customers who have placed orders. See their order history, contact details, and lifetime value at a glance.",
    steps: [
      "Go to Customers to see everyone who has ordered",
      "Click a customer to view their order history",
      "Use the email field to reach out directly",
      "Offer returning customers a coupon code",
      "Customers are added automatically on checkout",
    ],
    icon: Users,
    color: "pink",
    illustration: <IllustrationAnalytics />,
    href: "customers",
  },
];

const COLOR_MAP: Record<string, { bg: string; ring: string; icon: string; badge: string; badgeText: string }> = {
  blue:   { bg: "bg-blue-50",   ring: "ring-blue-100",   icon: "text-blue-600",   badge: "bg-blue-100",   badgeText: "text-blue-700" },
  purple: { bg: "bg-purple-50", ring: "ring-purple-100", icon: "text-purple-600", badge: "bg-purple-100", badgeText: "text-purple-700" },
  green:  { bg: "bg-green-50",  ring: "ring-green-100",  icon: "text-green-600",  badge: "bg-green-100",  badgeText: "text-green-700" },
  orange: { bg: "bg-orange-50", ring: "ring-orange-100", icon: "text-orange-600", badge: "bg-orange-100", badgeText: "text-orange-700" },
  cyan:   { bg: "bg-cyan-50",   ring: "ring-cyan-100",   icon: "text-cyan-600",   badge: "bg-cyan-100",   badgeText: "text-cyan-700" },
  yellow: { bg: "bg-yellow-50", ring: "ring-yellow-100", icon: "text-yellow-600", badge: "bg-yellow-100", badgeText: "text-yellow-700" },
  indigo: { bg: "bg-indigo-50", ring: "ring-indigo-100", icon: "text-indigo-600", badge: "bg-indigo-100", badgeText: "text-indigo-700" },
  pink:   { bg: "bg-pink-50",   ring: "ring-pink-100",   icon: "text-pink-600",   badge: "bg-pink-100",   badgeText: "text-pink-700" },
};

// ─── Guide card ─────────────────────────────────────────────────────────────────

function GuideCard({ guide, slug }: { guide: (typeof GUIDES)[number]; slug: string }) {
  const [open, setOpen] = useState(false);
  const c = COLOR_MAP[guide.color] ?? COLOR_MAP["blue"]!;
  const Icon = guide.icon;

  return (
    <div className={`rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow`}>
      {/* illustration */}
      <div className={`${c.bg} h-36 p-2`}>
        {guide.illustration}
      </div>

      <div className="p-5 bg-white">
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-8 h-8 rounded-lg ${c.badge} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-4 h-4 ${c.icon}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm leading-snug">{guide.title}</h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{guide.description}</p>
          </div>
        </div>

        {/* expandable steps */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors mt-1"
        >
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {open ? "Hide steps" : "Show steps"}
        </button>

        {open && (
          <ol className="mt-3 space-y-1.5 pl-1">
            {guide.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                <span className={`mt-0.5 w-4 h-4 rounded-full ${c.badge} ${c.badgeText} text-[10px] font-bold flex items-center justify-center flex-shrink-0`}>
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        )}

        {guide.href && (
          <Link
            href={`/${slug}/${guide.href}`}
            className={`mt-4 flex items-center gap-1.5 text-xs font-medium ${c.icon} hover:underline`}
          >
            Go to {guide.title.split(" ")[0]} <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function DocsPage() {
  const params = useParams<{ slug: string }>();
  const auth = getAuthState();
  const storeName = auth.tenant?.name ?? params.slug;

  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const toggleStep = (id: string) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const progress = Math.round((completedSteps.size / SETUP_STEPS.length) * 100);

  return (
    <div className="max-w-5xl">
      {/* Hero */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 mb-8 text-white relative overflow-hidden">
        {/* decorative circles */}
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-blue-500 opacity-10 rounded-full" />
        <div className="absolute -bottom-10 -right-4 w-52 h-52 bg-purple-500 opacity-10 rounded-full" />
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">Getting started</p>
            <h1 className="text-xl font-bold">Welcome to Kasify, {storeName} 👋</h1>
          </div>
        </div>
        <p className="text-gray-300 text-sm max-w-xl leading-relaxed">
          Everything you need to launch your online store. Follow the setup checklist below, then explore the feature guides to get the most out of your dashboard.
        </p>

        {/* progress */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">Store setup progress</span>
            <span className="text-xs font-semibold text-white">{completedSteps.size}/{SETUP_STEPS.length} steps</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div
              className="bg-blue-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          {progress === 100 && (
            <p className="text-xs text-green-400 mt-2 font-medium">🎉 Your store is fully set up!</p>
          )}
        </div>
      </div>

      {/* Setup checklist */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-8 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Setup checklist</h2>
        <p className="text-xs text-gray-500 mb-5">Tick each step as you complete it. Click the link to go straight there.</p>
        <div className="space-y-3">
          {SETUP_STEPS.map((step) => {
            const done = completedSteps.has(step.id);
            return (
              <div key={step.id} className="flex items-center gap-3 group">
                <button
                  onClick={() => toggleStep(step.id)}
                  className="flex-shrink-0 text-gray-300 hover:text-green-500 transition-colors"
                >
                  {done ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </button>
                <span className={`flex-1 text-sm ${done ? "line-through text-gray-400" : "text-gray-700"}`}>
                  {step.label}
                </span>
                {step.href && (
                  <Link
                    href={`/${params.slug}/${step.href}`}
                    className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-blue-600 hover:underline transition-opacity"
                  >
                    Go <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature guides grid */}
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Feature guides</h2>
        <p className="text-xs text-gray-500">Click "Show steps" on any card to see how to use that feature.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pb-12">
        {GUIDES.map((guide) => (
          <GuideCard key={guide.id} guide={guide} slug={params.slug} />
        ))}
      </div>
    </div>
  );
}
