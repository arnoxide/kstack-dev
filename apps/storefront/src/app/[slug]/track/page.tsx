"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Search, Package, Loader2 } from "lucide-react";

export default function TrackOrderPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();

  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail]             = useState("");
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(orderNumber.trim(), 10);
    if (isNaN(num) || !email.trim()) {
      setError("Please enter a valid order number and email address.");
      return;
    }
    setError("");
    setLoading(true);
    // Redirect to the order page — it will 404 if not found
    router.push(`/${params.slug}/orders/${num}?email=${encodeURIComponent(email.trim())}`);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-20">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 mb-4">
          <Package className="w-7 h-7 text-gray-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Track Your Order</h1>
        <p className="text-sm text-gray-500 mt-2">
          Enter your order number and email address to see your order status.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 shadow-sm">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Order number</label>
          <input
            type="text"
            required
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="e.g. 1042"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-shop-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-shop-primary"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-shop-accent text-shop-accent-fg py-3 rounded-shop font-medium hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Looking up…</>
            : <><Search className="w-4 h-4" /> Track Order</>
          }
        </button>
      </form>

      <p className="text-center text-xs text-gray-400 mt-6">
        Your order number is in your confirmation email.
      </p>
    </div>
  );
}
