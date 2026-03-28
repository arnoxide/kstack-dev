"use client";

import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp,
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  BarChart3,
  Eye,
  MousePointerClick,
} from "lucide-react";

// Simple bar chart using pure CSS
function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full bg-blue-500 rounded-t-md transition-all duration-500"
            style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? "4px" : "0" }}
          />
          <span className="text-xs text-gray-500 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const { data: traffic } = trpc.analytics.stats.useQuery({ days: 30 });
  const { data: traffic7 } = trpc.analytics.stats.useQuery({ days: 7 });
  const { data: orders } = trpc.orders.list.useQuery({ limit: 100 });
  const { data: products } = trpc.products.list.useQuery({ limit: 100 });
  const { data: customers } = trpc.orders.customers.useQuery({ limit: 100 });

  const totalRevenue = orders?.reduce((sum, o) => {
    if (o.financialStatus === "paid") return sum + Number(o.total);
    return sum;
  }, 0) ?? 0;

  const paidOrders = orders?.filter((o) => o.financialStatus === "paid") ?? [];
  const pendingOrders = orders?.filter((o) => o.financialStatus === "pending") ?? [];
  const activeProducts = products?.filter((p) => p.status === "active") ?? [];

  // Revenue by financial status
  const revenueBreakdown = [
    { label: "Paid", value: orders?.filter((o) => o.financialStatus === "paid").reduce((s, o) => s + Number(o.total), 0) ?? 0 },
    { label: "Pending", value: orders?.filter((o) => o.financialStatus === "pending").reduce((s, o) => s + Number(o.total), 0) ?? 0 },
    { label: "Refunded", value: orders?.filter((o) => o.financialStatus === "refunded").reduce((s, o) => s + Number(o.total), 0) ?? 0 },
  ];

  // Orders by fulfillment status
  const fulfillmentData = [
    { label: "Pending", value: orders?.filter((o) => o.status === "pending").length ?? 0 },
    { label: "Processing", value: orders?.filter((o) => o.status === "processing").length ?? 0 },
    { label: "Shipped", value: orders?.filter((o) => o.status === "shipped").length ?? 0 },
    { label: "Delivered", value: orders?.filter((o) => o.status === "delivered").length ?? 0 },
    { label: "Cancelled", value: orders?.filter((o) => o.status === "cancelled").length ?? 0 },
  ];

  // Product status breakdown
  const productData = [
    { label: "Active", value: products?.filter((p) => p.status === "active").length ?? 0 },
    { label: "Draft", value: products?.filter((p) => p.status === "draft").length ?? 0 },
    { label: "Archived", value: products?.filter((p) => p.status === "archived").length ?? 0 },
  ];

  const avgOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

  const stats = [
    { label: "Total Revenue", value: formatCurrency(totalRevenue), icon: DollarSign, color: "bg-green-500", sub: `${paidOrders.length} paid orders` },
    { label: "Total Orders", value: orders?.length ?? 0, icon: ShoppingCart, color: "bg-blue-500", sub: `${pendingOrders.length} pending` },
    { label: "Products", value: products?.length ?? 0, icon: Package, color: "bg-orange-500", sub: `${activeProducts.length} active` },
    { label: "Customers", value: customers?.length ?? 0, icon: Users, color: "bg-purple-500", sub: "registered" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-1">A snapshot of your store's performance</p>
      </div>

      {/* Web Traffic */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Storefront Traffic</h2>
          <span className="ml-auto text-xs text-gray-400">Last 30 days</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Page Views", value: traffic?.totalPageviews ?? 0, icon: Eye },
            { label: "Sessions", value: traffic?.uniqueSessions ?? 0, icon: MousePointerClick },
            { label: "Views (7d)", value: traffic7?.totalPageviews ?? 0, icon: Eye },
            { label: "Sessions (7d)", value: traffic7?.uniqueSessions ?? 0, icon: MousePointerClick },
          ].map((m) => (
            <div key={m.label} className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">{m.label}</p>
              <p className="text-2xl font-bold text-gray-900">{m.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {/* Daily chart — last 7 days */}
        {(traffic7?.daily?.length ?? 0) > 0 ? (
          <div>
            <p className="text-xs text-gray-500 mb-2">Daily views (last 7 days)</p>
            <BarChart data={(traffic7?.daily ?? []).map((d) => ({ label: d.date.slice(5), value: d.views }))} />
          </div>
        ) : (
          <div className="text-center py-6 text-gray-400 text-sm">No traffic data yet — visitors will appear here once the storefront is live.</div>
        )}

        {/* Top pages */}
        {(traffic?.topPages?.length ?? 0) > 0 && (
          <div className="mt-5 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-3">Top pages (30 days)</p>
            <div className="space-y-2">
              {(traffic?.topPages ?? []).map((p) => {
                const maxViews = traffic?.topPages?.[0]?.views ?? 1;
                return (
                  <div key={p.path} className="flex items-center gap-3 text-sm">
                    <span className="text-gray-600 truncate flex-1 font-mono text-xs">{p.path}</span>
                    <div className="w-24 bg-gray-100 rounded-full h-1.5 flex-shrink-0">
                      <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${(p.views / maxViews) * 100}%` }} />
                    </div>
                    <span className="text-gray-900 font-medium w-8 text-right">{p.views}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{stat.sub}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            <h2 className="font-semibold text-gray-900">Revenue by Status</h2>
          </div>
          {(orders?.length ?? 0) === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No orders yet</div>
          ) : (
            <BarChart data={revenueBreakdown.map((d) => ({ label: d.label, value: d.value }))} />
          )}
          <div className="mt-4 space-y-2">
            {revenueBreakdown.map((d) => (
              <div key={d.label} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{d.label}</span>
                <span className="font-medium text-gray-900">{formatCurrency(d.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Order fulfilment */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="w-4 h-4 text-gray-500" />
            <h2 className="font-semibold text-gray-900">Orders by Fulfilment Status</h2>
          </div>
          {(orders?.length ?? 0) === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No orders yet</div>
          ) : (
            <BarChart data={fulfillmentData} />
          )}
          <div className="mt-4 space-y-2">
            {fulfillmentData.filter((d) => d.value > 0).map((d) => (
              <div key={d.label} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{d.label}</span>
                <span className="font-medium text-gray-900">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product status */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-gray-500" />
            <h2 className="font-semibold text-gray-900">Products Overview</h2>
          </div>
          <BarChart data={productData} />
          <div className="mt-4 space-y-2">
            {productData.map((d) => (
              <div key={d.label} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{d.label}</span>
                <span className="font-medium text-gray-900">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Summary metrics */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-gray-500" />
            <h2 className="font-semibold text-gray-900">Key Metrics</h2>
          </div>
          <div className="space-y-4">
            {[
              { label: "Average Order Value", value: formatCurrency(avgOrderValue) },
              { label: "Total Revenue", value: formatCurrency(totalRevenue) },
              { label: "Conversion (paid / total)", value: orders && orders.length > 0 ? `${Math.round((paidOrders.length / orders.length) * 100)}%` : "—" },
              { label: "Avg. orders per customer", value: customers && customers.length > 0 ? (( orders?.length ?? 0) / customers.length).toFixed(1) : "—" },
            ].map((m) => (
              <div key={m.label} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-600">{m.label}</span>
                <span className="text-sm font-bold text-gray-900">{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
