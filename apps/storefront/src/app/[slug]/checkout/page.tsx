"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/context/cart-context";
import { useCustomerAuth } from "@/context/customer-auth-context";
import { formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle, Loader2, ShoppingBag, Tag, Truck, X } from "lucide-react";

interface ShippingRate {
  id: string;
  name: string;
  type: string;
  price: string;
  estimatedDays: string | null;
  minOrderAmount: string | null;
}

interface CouponResult {
  code: string;
  type: string;
  value: number;
  discountAmount: number;
  freeShipping: boolean;
}

function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        {...props}
        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-shop-primary"
      />
    </div>
  );
}

export default function CheckoutPage() {
  const { cart, total, count, clear } = useCart();
  const { customer } = useCustomerAuth();
  const params = useParams<{ slug: string }>();
  const router = useRouter();

  // Tenant ID — resolved from cart context
  const tenantId = cart.tenantId;

  // Form state — pre-filled from logged-in customer
  const [email, setEmail] = useState(customer?.email ?? "");
  const [firstName, setFirstName] = useState(customer?.firstName ?? "");
  const [lastName, setLastName] = useState(customer?.lastName ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");

  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("South Africa");

  // Sync contact + saved address when customer loads
  useEffect(() => {
    if (!customer) return;
    setEmail((v) => v || customer.email);
    setFirstName((v) => v || (customer.firstName ?? ""));
    setLastName((v) => v || (customer.lastName ?? ""));
    setPhone((v) => v || (customer.phone ?? ""));
    const addr = customer.defaultAddress;
    if (addr) {
      setFirstName((v) => v || addr.firstName);
      setLastName((v) => v || addr.lastName);
      setAddress1((v) => v || addr.address1);
      setAddress2((v) => v || (addr.address2 ?? ""));
      setCity((v) => v || addr.city);
      setProvince((v) => v || (addr.province ?? ""));
      setPostalCode((v) => v || addr.postalCode);
      setCountry((v) => v || addr.country);
      setPhone((v) => v || (addr.phone ?? ""));
    }
  }, [customer]);
  const [note, setNote] = useState("");

  // Shipping
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
  const [loadingRates, setLoadingRates] = useState(false);

  // Coupon
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<CouponResult | null>(null);
  const [couponError, setCouponError] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Load shipping rates when subtotal is known
  useEffect(() => {
    if (!tenantId || total <= 0) return;
    setLoadingRates(true);
    api.shipping.rates.query({ tenantId, subtotal: total })
      .then((rates) => {
        setShippingRates(rates);
        if (rates.length > 0 && !selectedRateId) setSelectedRateId(rates[0].id);
      })
      .catch(() => {})
      .finally(() => setLoadingRates(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, total]);

  const selectedRate = shippingRates.find((r) => r.id === selectedRateId) ?? null;
  const shippingCost = coupon?.freeShipping ? 0 : selectedRate ? Number(selectedRate.price) : 0;
  const orderTotal = Math.max(0, total - (coupon?.discountAmount ?? 0) + shippingCost);

  const applyCount = async () => {
    if (!couponInput.trim()) return;
    setValidatingCoupon(true);
    setCouponError("");
    try {
      const result = await api.coupons.validate.query({ tenantId, code: couponInput.trim(), subtotal: total });
      setCoupon({ ...result, code: couponInput.trim().toUpperCase() });
    } catch (e: unknown) {
      setCouponError((e as { message?: string }).message ?? "Invalid coupon");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");
    try {
      const result = await api.orders.create.mutate({
        tenantId,
        customerEmail: email,
        customerFirstName: firstName,
        customerLastName: lastName,
        customerPhone: phone || undefined,
        shippingAddress: { firstName, lastName, address1, address2: address2 || undefined, city, province: province || undefined, postalCode, country },
        shippingRateId: selectedRateId ?? undefined,
        couponCode: coupon?.code || undefined,
        note: note || undefined,
        items: cart.items.map((item) => ({
          variantId: item.variantId,
          title: item.title,
          variantTitle: item.variantTitle,
          quantity: item.quantity,
          unitPrice: item.price,
          imageUrl: item.imageUrl ?? undefined,
        })),
      });
      clear();
      router.push(`/${params.slug}/orders/${result.orderNumber}?email=${encodeURIComponent(email)}`);
    } catch (e: unknown) {
      setSubmitError((e as { message?: string }).message ?? "Failed to place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (count === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h1>
        <Link
          href={`/${params.slug}/products`}
          className="inline-block bg-shop-accent text-shop-accent-fg px-8 py-3 rounded-shop font-medium hover:bg-shop-accent transition-colors mt-4"
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Left — form */}
          <div className="space-y-8">
            {/* Contact */}
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900">Contact</h2>
              <Field label="Email address" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              <Field label="Phone (optional)" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+27 000 000 0000" />
            </section>

            {/* Shipping address */}
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900">Shipping Address</h2>
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" />
                <Field label="Last name" required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Smith" />
              </div>
              <Field label="Address" required value={address1} onChange={(e) => setAddress1(e.target.value)} placeholder="123 Main St" />
              <Field label="Apartment, suite, etc. (optional)" value={address2} onChange={(e) => setAddress2(e.target.value)} placeholder="Apt 4B" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="City" required value={city} onChange={(e) => setCity(e.target.value)} placeholder="Cape Town" />
                <Field label="Postal code" required value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="8001" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Province / State (optional)" value={province} onChange={(e) => setProvince(e.target.value)} placeholder="Western Cape" />
                <Field label="Country" required value={country} onChange={(e) => setCountry(e.target.value)} placeholder="South Africa" />
              </div>
            </section>

            {/* Shipping method */}
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-gray-500" /> Shipping Method
              </h2>
              {loadingRates ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading rates…
                </div>
              ) : shippingRates.length === 0 ? (
                <p className="text-sm text-gray-500 border border-gray-200 rounded-lg p-4">
                  No shipping rates configured for this store.
                </p>
              ) : (
                <div className="space-y-2">
                  {shippingRates.map((rate) => {
                    const price = coupon?.freeShipping ? 0 : Number(rate.price);
                    return (
                      <label
                        key={rate.id}
                        className={`flex items-center justify-between gap-3 border rounded-lg px-4 py-3 cursor-pointer transition-colors ${selectedRateId === rate.id ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:border-gray-400"}`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="shippingRate"
                            value={rate.id}
                            checked={selectedRateId === rate.id}
                            onChange={() => setSelectedRateId(rate.id)}
                            className="accent-gray-900"
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{rate.name}</p>
                            {rate.estimatedDays && <p className="text-xs text-gray-500">{rate.estimatedDays}</p>}
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">
                          {price === 0 ? <span className="text-green-600">Free</span> : formatCurrency(price)}
                        </p>
                      </label>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Note */}
            <section>
              <label className="block text-xs font-medium text-gray-600 mb-1">Order note (optional)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Special instructions for your order…"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-shop-primary resize-none"
              />
            </section>

            {/* Payment — placeholder */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Payment</h2>
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 text-sm text-gray-500 text-center">
                Cash on delivery / manual payment — online payment coming soon
              </div>
            </section>

            {submitError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                {submitError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-shop-accent text-shop-accent-fg py-3 rounded-shop font-medium hover:bg-shop-accent transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Placing order…</>
              ) : (
                <>Place Order — {formatCurrency(orderTotal)}</>
              )}
            </button>
          </div>

          {/* Right — order summary */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>

            {/* Items */}
            <div className="space-y-3">
              {cart.items.map((item) => (
                <div key={item.variantId} className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="w-5 h-5 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-500 text-white text-xs rounded-full flex items-center justify-center">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                    {item.variantTitle !== "Default Title" && (
                      <p className="text-xs text-gray-500">{item.variantTitle}</p>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-900">{formatCurrency(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>

            {/* Coupon */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" /> Coupon code
              </p>
              {coupon ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm">
                  <span className="text-green-700 font-medium">{coupon.code}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 text-xs">
                      {coupon.freeShipping ? "Free shipping" : `−${formatCurrency(coupon.discountAmount)}`}
                    </span>
                    <button type="button" onClick={() => { setCoupon(null); setCouponInput(""); }} className="text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyCount())}
                    placeholder="Enter code"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-shop-primary"
                  />
                  <button
                    type="button"
                    onClick={applyCount}
                    disabled={validatingCoupon || !couponInput.trim()}
                    className="px-4 py-2 bg-shop-accent text-shop-accent-fg text-sm rounded-lg hover:bg-shop-accent transition-colors disabled:opacity-50"
                  >
                    {validatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                  </button>
                </div>
              )}
              {couponError && <p className="text-xs text-red-500 mt-1">{couponError}</p>}
            </div>

            {/* Totals */}
            <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(total)}</span>
              </div>
              {coupon && !coupon.freeShipping && (
                <div className="flex justify-between text-green-600">
                  <span>Discount ({coupon.code})</span>
                  <span>−{formatCurrency(coupon.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>
                  {coupon?.freeShipping
                    ? <span className="text-green-600">Free</span>
                    : selectedRate
                    ? Number(selectedRate.price) === 0
                      ? <span className="text-green-600">Free</span>
                      : formatCurrency(Number(selectedRate.price))
                    : <span className="text-gray-400">—</span>}
                </span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-200">
                <span>Total</span>
                <span>{formatCurrency(orderTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
