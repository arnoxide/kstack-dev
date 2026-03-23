import { api } from "@/lib/api";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Package, Truck, MapPin, XCircle, RotateCcw, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// ── Status timeline config ────────────────────────────────────────────────────

const STEPS = [
  { key: "pending",    label: "Order Placed",  icon: Clock },
  { key: "processing", label: "Processing",    icon: Package },
  { key: "shipped",    label: "Shipped",       icon: Truck },
  { key: "delivered",  label: "Delivered",     icon: MapPin },
] as const;

const TERMINAL: Record<string, { label: string; icon: typeof XCircle; color: string }> = {
  cancelled: { label: "Cancelled", icon: XCircle, color: "text-red-500" },
  refunded:  { label: "Refunded",  icon: RotateCcw, color: "text-gray-500" },
};

function StatusTimeline({ status }: { status: string }) {
  const terminal = TERMINAL[status];

  if (terminal) {
    const Icon = terminal.icon;
    return (
      <div className={`flex items-center gap-3 ${terminal.color} bg-gray-50 border border-gray-200 rounded-xl p-4 mb-8`}>
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="font-semibold text-sm">Order {terminal.label}</span>
      </div>
    );
  }

  const currentIndex = STEPS.findIndex((s) => s.key === status);
  const activeIndex = currentIndex === -1 ? 0 : currentIndex;

  return (
    <div className="mb-8">
      <div className="flex items-start justify-between relative">
        {/* Progress bar */}
        <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200 -z-0">
          <div
            className="h-full bg-green-500 transition-all duration-500"
            style={{ width: `${(activeIndex / (STEPS.length - 1)) * 100}%` }}
          />
        </div>

        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const done = i <= activeIndex;
          return (
            <div key={step.key} className="flex flex-col items-center gap-2 z-10 flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                done
                  ? "bg-green-500 border-green-500 text-white"
                  : "bg-white border-gray-300 text-gray-400"
              }`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className={`text-xs font-medium text-center leading-tight ${done ? "text-gray-900" : "text-gray-400"}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function OrderTrackingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; orderNumber: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const [{ slug, orderNumber }, { email }] = await Promise.all([params, searchParams]);

  if (!email) notFound();

  const num = parseInt(orderNumber, 10);
  if (isNaN(num)) notFound();

  let shop: Awaited<ReturnType<typeof api.public.resolveShop.query>>;
  try {
    shop = await api.public.resolveShop.query({ slug });
  } catch {
    notFound();
  }

  let order: Awaited<ReturnType<typeof api.orders.getByNumber.query>>;
  try {
    order = await api.orders.getByNumber.query({ tenantId: shop.tenant.id, orderNumber: num, email });
  } catch {
    notFound();
  }

  const shipping = order.shippingAddress as Record<string, string> | null;
  const isNew    = order.status === "pending" || order.status === "processing";

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      {/* Header */}
      <div className="text-center mb-10">
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
          order.status === "cancelled" ? "bg-red-100" :
          order.status === "delivered" ? "bg-green-100" : "bg-blue-100"
        }`}>
          {order.status === "cancelled"
            ? <XCircle className="w-8 h-8 text-red-500" />
            : order.status === "delivered"
            ? <CheckCircle className="w-8 h-8 text-green-600" />
            : <Package className="w-8 h-8 text-blue-500" />
          }
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          {isNew ? "Order Confirmed!" : `Order ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}`}
        </h1>
        <p className="text-gray-500 text-sm">
          {isNew
            ? `Thank you, ${order.customerEmail}. We've received your order.`
            : `Here's the latest status for your order.`}
        </p>
        <p className="mt-3 inline-block bg-gray-100 text-gray-700 text-sm font-mono px-4 py-1.5 rounded-full">
          Order #{order.orderNumber}
        </p>
      </div>

      {/* Status timeline */}
      <StatusTimeline status={order.status} />

      {/* Tracking number */}
      {(order as typeof order & { trackingNumber?: string | null; trackingCarrier?: string | null }).trackingNumber && (
        <div className="border border-indigo-200 bg-indigo-50 rounded-xl p-4 mb-6 flex items-start gap-3">
          <Truck className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-indigo-900">Tracking number</p>
            <p className="font-mono text-sm text-indigo-700 mt-0.5">
              {(order as typeof order & { trackingCarrier?: string | null }).trackingCarrier && (
                <span className="text-indigo-500 mr-1">
                  {(order as typeof order & { trackingCarrier?: string | null }).trackingCarrier}:
                </span>
              )}
              {(order as typeof order & { trackingNumber?: string | null }).trackingNumber}
            </p>
          </div>
        </div>
      )}

      {/* Payment status */}
      <div className="flex items-center gap-3 mb-6">
        <span className={`text-xs px-3 py-1 rounded-full font-medium border ${
          order.financialStatus === "paid"
            ? "bg-green-50 text-green-700 border-green-200"
            : order.financialStatus === "failed"
            ? "bg-red-50 text-red-600 border-red-200"
            : "bg-yellow-50 text-yellow-700 border-yellow-200"
        }`}>
          Payment: {order.financialStatus === "paid" ? "Paid" : order.financialStatus === "failed" ? "Failed" : "Pending"}
        </span>
      </div>

      {/* Line items */}
      <div className="border border-gray-200 rounded-xl overflow-hidden mb-6">
        <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
          <p className="text-sm font-semibold text-gray-700">Items ordered</p>
        </div>
        <div className="divide-y divide-gray-100">
          {order.lineItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-5 py-3 gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                {item.variantTitle && item.variantTitle !== "Default Title" && (
                  <p className="text-xs text-gray-500">{item.variantTitle}</p>
                )}
                {item.sku && <p className="text-xs text-gray-400 font-mono">SKU: {item.sku}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm text-gray-500">×{item.quantity}</p>
                <p className="text-sm font-medium text-gray-900">{formatCurrency(Number(item.totalPrice))}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="bg-gray-50 border-t border-gray-200 px-5 py-4 space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>{formatCurrency(Number(order.subtotal))}</span>
          </div>
          {Number(order.discountTotal) > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</span>
              <span>−{formatCurrency(Number(order.discountTotal))}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-600">
            <span>Shipping</span>
            <span>
              {Number(order.shippingTotal) === 0
                ? <span className="text-green-600">Free</span>
                : formatCurrency(Number(order.shippingTotal))}
            </span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-200 pt-2">
            <span>Total</span>
            <span>{formatCurrency(Number(order.total))}</span>
          </div>
        </div>
      </div>

      {/* Shipping address */}
      {shipping && (
        <div className="border border-gray-200 rounded-xl p-5 mb-8">
          <p className="text-sm font-semibold text-gray-700 mb-2">Shipping to</p>
          <address className="not-italic text-sm text-gray-600 leading-relaxed">
            {shipping["firstName"]} {shipping["lastName"]}<br />
            {shipping["address1"]}{shipping["address2"] ? `, ${shipping["address2"]}` : ""}<br />
            {shipping["city"]}, {shipping["postalCode"]}<br />
            {shipping["province"] ? `${shipping["province"]}, ` : ""}{shipping["country"]}
          </address>
        </div>
      )}

      {/* CTAs */}
      <div className="text-center space-y-3">
        <Link
          href={`/${slug}/products`}
          className="inline-block bg-shop-accent text-shop-accent-fg px-8 py-3 rounded-shop font-medium hover:opacity-90 transition-opacity"
        >
          Continue Shopping
        </Link>
        <div>
          <Link
            href={`/${slug}/track`}
            className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2"
          >
            Track another order
          </Link>
        </div>
      </div>
    </div>
  );
}
