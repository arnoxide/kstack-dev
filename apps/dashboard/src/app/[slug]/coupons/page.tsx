"use client";

import { use, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Plus, Trash2, Copy, CheckCircle, XCircle, Loader2, Tag } from "lucide-react";

type CouponType = "percentage" | "fixed_amount" | "free_shipping";

const TYPE_LABELS: Record<CouponType, string> = {
  percentage: "% Discount",
  fixed_amount: "Fixed Amount",
  free_shipping: "Free Shipping",
};

function formatValue(type: CouponType, value: string) {
  if (type === "percentage") return `${value}% off`;
  if (type === "fixed_amount") return `R${Number(value).toFixed(2)} off`;
  return "Free shipping";
}

export default function CouponsPage({ params }: { params: Promise<{ slug: string }> }) {
  use(params);

  const { data: coupons, refetch } = trpc.coupons.list.useQuery();
  const createMut = trpc.coupons.create.useMutation({ onSuccess: () => { refetch(); setShowForm(false); resetForm(); } });
  const updateMut = trpc.coupons.update.useMutation({ onSuccess: () => refetch() });
  const deleteMut = trpc.coupons.delete.useMutation({ onSuccess: () => refetch() });

  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Form
  const [code, setCode] = useState("");
  const [type, setType] = useState<CouponType>("percentage");
  const [value, setValue] = useState("");
  const [minOrder, setMinOrder] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const resetForm = () => { setCode(""); setType("percentage"); setValue(""); setMinOrder(""); setMaxUses(""); setExpiresAt(""); };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMut.mutate({
      code,
      type,
      value: Number(value) || 0,
      minOrderAmount: minOrder ? Number(minOrder) : undefined,
      maxUses: maxUses ? Number(maxUses) : undefined,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
    });
  };

  const copyCode = (c: string) => {
    navigator.clipboard.writeText(c);
    setCopied(c);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
          <p className="text-sm text-gray-500 mt-1">Create discount codes for your customers.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> New Coupon
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="border border-gray-200 rounded-xl p-5 bg-gray-50 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">New Coupon</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Code *</label>
              <input required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="SUMMER20"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white uppercase" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type *</label>
              <select value={type} onChange={(e) => setType(e.target.value as CouponType)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {(Object.keys(TYPE_LABELS) as CouponType[]).map((t) => (
                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            {type !== "free_shipping" && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {type === "percentage" ? "Discount %" : "Discount Amount (R)"} *
                </label>
                <input required type="number" min="0" step={type === "percentage" ? "1" : "0.01"} value={value} onChange={(e) => setValue(e.target.value)}
                  placeholder={type === "percentage" ? "20" : "50.00"}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Minimum Order (R, optional)</label>
              <input type="number" min="0" step="0.01" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} placeholder="0.00"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Max Uses (optional)</label>
              <input type="number" min="1" step="1" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="unlimited"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Expires At (optional)</label>
              <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
            </div>
          </div>
          {createMut.error && <p className="text-xs text-red-500">{createMut.error.message}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">Cancel</button>
            <button type="submit" disabled={createMut.isPending}
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60">
              {createMut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Create Coupon
            </button>
          </div>
        </form>
      )}

      {/* Coupon list */}
      {!coupons || coupons.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl">
          <Tag className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No coupons yet. Create your first discount code.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map((coupon) => {
            const expired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
            const exhausted = coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses;
            const active = coupon.isActive && !expired && !exhausted;

            return (
              <div key={coupon.id} className="flex items-center gap-4 border border-gray-200 rounded-xl px-5 py-4 bg-white">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => copyCode(coupon.code)} className="flex items-center gap-1.5 font-mono text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                      {coupon.code}
                      {copied === coupon.code ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3 h-3 text-gray-400" />}
                    </button>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${active ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                      {active ? "Active" : expired ? "Expired" : exhausted ? "Exhausted" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatValue(coupon.type as CouponType, coupon.value)}
                    {coupon.minOrderAmount && ` · min R${Number(coupon.minOrderAmount).toFixed(2)}`}
                    {coupon.maxUses && ` · ${coupon.usedCount}/${coupon.maxUses} used`}
                    {!coupon.maxUses && coupon.usedCount > 0 && ` · ${coupon.usedCount} used`}
                    {coupon.expiresAt && ` · expires ${new Date(coupon.expiresAt).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => updateMut.mutate({ id: coupon.id, isActive: !coupon.isActive })}
                    disabled={updateMut.isPending}
                    className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {coupon.isActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => deleteMut.mutate({ id: coupon.id })}
                    disabled={deleteMut.isPending}
                    className="text-xs text-red-400 hover:text-red-600 border border-red-100 hover:border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
