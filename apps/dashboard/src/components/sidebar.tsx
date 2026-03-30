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
  Plug,
  Tag,
  Truck,
  MessageSquare,
  Layout,
  Bot,
  Mail,
  BookOpen,
  Inbox,
  ChevronDown,
  Store,
  Wrench,
  Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { clearAuthState, getAuthState } from "@/lib/auth-store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getDisabledModules } from "@/lib/modules";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  module: string | null;
};

type NavGroup = {
  label: string;
  icon?: React.ElementType;
  items: NavItem[];
};

const navGroups = (slug: string): NavGroup[] => [
  {
    label: "",
    items: [
      { href: `/${slug}`, label: "Overview", icon: LayoutDashboard, module: null },
      { href: `/${slug}/analytics`, label: "Analytics", icon: BarChart3, module: "KStack_Analytics" },
    ],
  },
  {
    label: "Store",
    icon: Store,
    items: [
      { href: `/${slug}/products`, label: "Products", icon: Package, module: "KStack_Catalog" },
      { href: `/${slug}/collections`, label: "Collections", icon: FolderOpen, module: "KStack_Collections" },
      { href: `/${slug}/themes`, label: "Themes", icon: Palette, module: "KStack_Storefront" },
      { href: `/${slug}/pages`, label: "Pages", icon: Layout, module: "KStack_Storefront" },
      { href: `/${slug}/coupons`, label: "Coupons", icon: Tag, module: "KStack_Coupons" },
      { href: `/${slug}/shipping`, label: "Shipping", icon: Truck, module: "KStack_Shipping" },
      { href: `/${slug}/integrations`, label: "Integrations", icon: Plug, module: "KStack_Integrations" },
      { href: `/${slug}/email`, label: "Email", icon: Mail, module: "KStack_Email" },
    ],
  },
  {
    label: "Customers",
    icon: Users,
    items: [
      { href: `/${slug}/orders`, label: "Orders", icon: ShoppingCart, module: "KStack_Orders" },
      { href: `/${slug}/customers`, label: "Customers", icon: Users, module: "KStack_Customers" },
      { href: `/${slug}/reviews`, label: "Reviews", icon: MessageSquare, module: "KStack_Reviews" },
      { href: `/${slug}/contact`, label: "Contact Messages", icon: Inbox, module: "KStack_Contact" },
    ],
  },
  {
    label: "Tools",
    icon: Wrench,
    items: [
      { href: `/${slug}/ai-assistant`, label: "AI Assistant", icon: Bot, module: "KStack_AIAssistant" },
    ],
  },
  {
    label: "System",
    icon: Cpu,
    items: [
      { href: `/${slug}/docs`, label: "Help & Docs", icon: BookOpen, module: null },
      { href: `/${slug}/settings`, label: "Settings", icon: Settings, module: null },
    ],
  },
];

function NavGroup({ group, slug, pathname, disabledModules }: {
  group: NavGroup & { icon?: React.ElementType };
  slug: string;
  pathname: string;
  disabledModules: Set<string>;
}) {
  const items = group.items.filter((item) => !item.module || !disabledModules.has(item.module));
  if (items.length === 0) return null;

  const hasActive = items.some((item) =>
    item.href === `/${slug}` ? pathname === item.href : pathname.startsWith(item.href)
  );

  const [open, setOpen] = useState(hasActive || group.label === "");

  // No collapsible header for the top ungrouped items
  if (!group.label) {
    return (
      <div className="space-y-0.5">
        {items.map((item) => {
          const isActive = item.href === `/${slug}` ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                isActive ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-gray-100",
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors group"
      >
        {group.icon && <group.icon className="w-4 h-4 text-gray-400 group-hover:text-gray-200 flex-shrink-0" />}
        <span className="flex-1 text-left text-sm font-medium text-gray-300 group-hover:text-gray-100">{group.label}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 text-gray-500 group-hover:text-gray-300 transition-transform duration-200", open ? "rotate-0" : "-rotate-90")} />
      </button>

      {open && (
        <div className="mt-0.5 space-y-0.5 pl-2">
          {items.map((item) => {
            const isActive = item.href === `/${slug}` ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-gray-100",
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

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

  return (
    <aside className="w-56 flex-shrink-0 bg-gray-900 text-gray-100 h-screen overflow-y-auto flex flex-col">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-gray-800">
        <span className="text-white font-bold text-lg tracking-tight mb-2 block">KStack</span>
        <p className="text-xs text-gray-400 truncate">{auth.tenant?.name ?? slug}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-2">
        {navGroups(slug).map((group) => (
          <NavGroup
            key={group.label || "__top__"}
            group={group}
            slug={slug}
            pathname={pathname}
            disabledModules={disabledModules}
          />
        ))}
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
