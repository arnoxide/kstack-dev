"use client";

import Link from "next/link";
import Image from "next/image";
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
  { href: `/${slug}/products`, label: "Products", icon: Package, module: "KStack_Catalog" },
  { href: `/${slug}/collections`, label: "Collections", icon: FolderOpen, module: "KStack_Collections" },
  { href: `/${slug}/orders`, label: "Orders", icon: ShoppingCart, module: "KStack_Orders" },
  { href: `/${slug}/customers`, label: "Customers", icon: Users, module: "KStack_Customers" },
  { href: `/${slug}/themes`, label: "Themes & Pages", icon: Palette, module: "KStack_Storefront" },
  { href: `/${slug}/pages`, label: "Pages", icon: Layout, module: "KStack_Storefront" },
  { href: `/${slug}/analytics`, label: "Analytics", icon: BarChart3, module: "KStack_Analytics" },
  { href: `/${slug}/coupons`, label: "Coupons", icon: Tag, module: "KStack_Coupons" },
  { href: `/${slug}/shipping`, label: "Shipping", icon: Truck, module: "KStack_Shipping" },
  { href: `/${slug}/reviews`, label: "Reviews", icon: MessageSquare, module: "KStack_Reviews" },
  { href: `/${slug}/integrations`, label: "Integrations", icon: Plug, module: "KStack_Integrations" },
  { href: `/${slug}/ai-assistant`, label: "AI Assistant", icon: Bot, module: "KStack_AIAssistant" },
  { href: `/${slug}/email`, label: "Email", icon: Mail, module: "KStack_Email" },
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
      <div className="px-4 py-4 border-b border-gray-800">
        <Image src="/zansify-logo.png" alt="Zansify" width={120} height={40} className="mb-2 brightness-0 invert" unoptimized />
        <p className="text-xs text-gray-400 truncate">
          {auth.tenant?.name ?? slug}
        </p>
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
