"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  Plus,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { OnboardingChecklist } from "./onboarding";

export default function DashboardOverviewPage() {
  const params = useParams<{ slug: string }>();
  const { data: ordersData } = trpc.orders.list.useQuery({ limit: 5 });
  const { data: productsData } = trpc.products.list.useQuery({ limit: 5 });
  const { data: customersData } = trpc.orders.customers.useQuery({ limit: 1 });
  const { data: allOrders } = trpc.orders.list.useQuery({ limit: 100 });
  const { data: tenant } = trpc.tenant.get.useQuery();

  const totalRevenue =
    allOrders?.filter((o) => o.financialStatus === "paid").reduce((s, o) => s + Number(o.total), 0) ?? 0;

  const stats = [
    {
      label: "Total Products",
      value: productsData?.length ?? 0,
      icon: Package,
      color: "bg-blue-500",
      href: `/${params.slug}/products`,
    },
    {
      label: "Total Orders",
      value: allOrders?.length ?? 0,
      icon: ShoppingCart,
      color: "bg-green-500",
      href: `/${params.slug}/orders`,
    },
    {
      label: "Revenue",
      value: formatCurrency(totalRevenue),
      icon: TrendingUp,
      color: "bg-purple-500",
      href: `/${params.slug}/analytics`,
    },
    {
      label: "Customers",
      value: customersData?.length ?? 0,
      icon: Users,
      color: "bg-orange-500",
      href: `/${params.slug}/customers`,
    },
  ];

  const storeUrl = `${process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3003"}/${params.slug}`;
  const hasPayments = false; // TODO: wire up integrations check

  return (
    <div>
      {/* Onboarding */}
      <OnboardingChecklist
        hasProducts={(productsData?.length ?? 0) > 0}
        hasOrders={(allOrders?.length ?? 0) > 0}
        hasPayments={hasPayments}
        storeUrl={storeUrl}
      />

      {/* Welcome */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back{tenant ? `, ${tenant.name}` : ""}
          </h1>
          <p className="text-gray-500 mt-1 text-sm flex items-center gap-1.5">
            Your store is live at{" "}
            <a
              href={storeUrl}
              className="text-blue-600 hover:underline inline-flex items-center gap-1"
              target="_blank"
              rel="noreferrer"
            >
              {storeUrl.replace(/^https?:\/\//, "")}
              <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>
        <Link
          href={`/${params.slug}/products/new`}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add product
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Add product", href: `/${params.slug}/products/new`, icon: Package },
          { label: "View orders", href: `/${params.slug}/orders`, icon: ShoppingCart },
          { label: "Themes", href: `/${params.slug}/themes`, icon: TrendingUp },
          { label: "Settings", href: `/${params.slug}/settings`, icon: Users },
        ].map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 p-3 text-sm font-medium text-gray-700 hover:border-gray-400 hover:text-gray-900 transition-all"
          >
            <action.icon className="w-4 h-4 text-gray-500" />
            {action.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Orders</h2>
            <Link
              href={`/${params.slug}/orders`}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {ordersData && ordersData.length > 0 ? (
            <div className="space-y-0">
              {ordersData.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">#{order.orderNumber}</p>
                    <p className="text-xs text-gray-500">{order.customerEmail ?? "Guest"} · {formatDate(order.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(Number(order.total))}</p>
                    <span
                      className={`inline-block text-xs px-2 py-0.5 rounded-full ${
                        order.financialStatus === "paid"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {order.financialStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center">
              <ShoppingCart className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No orders yet</p>
            </div>
          )}
        </div>

        {/* Recent Products */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Products</h2>
            <Link
              href={`/${params.slug}/products`}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {productsData && productsData.length > 0 ? (
            <div className="space-y-0">
              {productsData.map((product) => (
                <Link
                  key={product.id}
                  href={`/${params.slug}/products/${product.id}`}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{product.title}</p>
                    <p className="text-xs text-gray-400">/{product.handle}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      product.status === "active"
                        ? "bg-green-100 text-green-700"
                        : product.status === "archived"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {product.status}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center">
              <Package className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-500 mb-3">No products yet</p>
              <Link
                href={`/${params.slug}/products/new`}
                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                Add your first product
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
