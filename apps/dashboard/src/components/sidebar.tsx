"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FolderOpen,
  ShoppingCart,
  Users,
  Palette,
  Settings,
  BarChart3,
  LogOut,
  Store,
  Plug,
  Tag,
  Truck,
  MessageSquare,
  Layout,
  Box,
  Bot,
  Mail,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { clearAuthState, getAuthState } from "@/lib/auth-store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getDisabledModules } from "@/lib/modules";

const navItems = (slug: string) => [
  { href: `/${slug}`, label: "Overview", icon: LayoutDashboard, module: null },
  { href: `/${slug}/products`, label: "Products", icon: Package, module: "Kasify_Catalog" },
  { href: `/${slug}/collections`, label: "Collections", icon: FolderOpen, module: "Kasify_Collections" },
  { href: `/${slug}/orders`, label: "Orders", icon: ShoppingCart, module: "Kasify_Orders" },
  { href: `/${slug}/customers`, label: "Customers", icon: Users, module: "Kasify_Customers" },
  { href: `/${slug}/themes`, label: "Themes & Pages", icon: Palette, module: "Kasify_Storefront" },
  { href: `/${slug}/pages`, label: "Pages", icon: Layout, module: "Kasify_Storefront" },
  { href: `/${slug}/analytics`, label: "Analytics", icon: BarChart3, module: "Kasify_Analytics" },
  { href: `/${slug}/coupons`, label: "Coupons", icon: Tag, module: "Kasify_Coupons" },
  { href: `/${slug}/shipping`, label: "Shipping", icon: Truck, module: "Kasify_Shipping" },
  { href: `/${slug}/reviews`, label: "Reviews", icon: MessageSquare, module: "Kasify_Reviews" },
  { href: `/${slug}/integrations`, label: "Integrations", icon: Plug, module: "Kasify_Integrations" },
  { href: `/${slug}/ai-assistant`, label: "AI Assistant", icon: Bot, module: "Kasify_AIAssistant" },
  { href: `/${slug}/email`, label: "Email", icon: Mail, module: "Kasify_Email" },
  // ── Custom modules added by scaffold CLI appear below ───────────────────────
  { href: `/${slug}/docs`, label: "Help & Docs", icon: BookOpen, module: null },
  { href: `/${slug}/settings`, label: "Settings", icon: Settings, module: null },
];

export function Sidebar({ slug }: { slug: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = getAuthState();
  const [disabledModules, setDisabledModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    setDisabledModules(getDisabledModules(slug));
  }, [slug]);

  const handleLogout = () => {
    clearAuthState();
    router.push("/login");
  };

  const visibleItems = navItems(slug).filter(
    (item) => !item.module || !disabledModules.has(item.module),
  );

  return (
    <aside className="w-60 flex-shrink-0 bg-gray-900 text-gray-100 h-screen overflow-y-auto flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Store className="w-6 h-6 text-blue-400" />
          <div>
            <p className="font-semibold text-sm leading-none">Kasify</p>
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[140px]">
              {auth.tenant?.name ?? slug}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {visibleItems.map((item) => {
          const isActive =
            item.href === `/${slug}`
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-100",
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-gray-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-xs font-medium flex-shrink-0">
            {auth.user?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{auth.user?.name ?? "User"}</p>
            <p className="text-xs text-gray-400 truncate">{auth.user?.email ?? ""}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
