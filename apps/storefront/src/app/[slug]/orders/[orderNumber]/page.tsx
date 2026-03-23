import { api } from "@/lib/api";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Package, Truck } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default async function OrderConfirmationPage({
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Order Confirmed!</h1>
        <p className="text-gray-500 text-sm">
          Thank you, {order.customerEmail}. We&apos;ve received your order.
        </p>
        <p className="mt-3 inline-block bg-gray-100 text-gray-700 text-sm font-mono px-4 py-1.5 rounded-full">
          Order #{order.orderNumber}
        </p>
      </div>

      {/* Status */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <Package className="w-5 h-5 text-blue-500 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Order status</p>
            <p className="text-sm font-semibold capitalize text-gray-900">{order.status}</p>
          </div>
        </div>
        <div className="border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <Truck className="w-5 h-5 text-purple-500 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Payment</p>
            <p className="text-sm font-semibold capitalize text-gray-900">{order.financialStatus}</p>
          </div>
        </div>
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
                <p className="text-sm text-gray-900">×{item.quantity}</p>
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
          <p className="text-sm text-gray-600">
            {shipping.firstName} {shipping.lastName}<br />
            {shipping.address1}{shipping.address2 ? `, ${shipping.address2}` : ""}<br />
            {shipping.city}, {shipping.postalCode}<br />
            {shipping.province ? `${shipping.province}, ` : ""}{shipping.country}
          </p>
        </div>
      )}

      {/* CTA */}
      <div className="text-center space-y-3">
        <Link
          href={`/${slug}/products`}
          className="inline-block bg-shop-accent text-shop-accent-fg px-8 py-3 rounded-shop font-medium hover:bg-shop-accent transition-colors"
        >
          Continue Shopping
        </Link>
        <p className="text-xs text-gray-400">
          Save your order number #{order.orderNumber} and email to check your order status.
        </p>
      </div>
    </div>
  );
}
