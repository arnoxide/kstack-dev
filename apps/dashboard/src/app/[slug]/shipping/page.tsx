"use client";

import { use, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Plus, Trash2, Loader2, Truck } from "lucide-react";

type ShippingType = "flat_rate" | "free_over" | "free";

const TYPE_LABELS: Record<ShippingType, string> = {
  flat_rate: "Flat Rate",
  free_over: "Free Over Amount",
  free: "Always Free",
};

export default function ShippingPage({ params }: { params: Promise<{ slug: string }> }) {
  use(params);

  const { data: rates, refetch } = trpc.shipping.list.useQuery();
  const createMut = trpc.shipping.create.useMutation({ onSuccess: () => { refetch(); setShowForm(false); resetForm(); } });
  const updateMut = trpc.shipping.update.useMutation({ onSuccess: () => refetch() });
  const deleteMut = trpc.shipping.delete.useMutation({ onSuccess: () => refetch() });

  const [showForm, setShowForm] = useState(false);

  // Form
  const [name, setName] = useState("");
  const [type, setType] = useState<ShippingType>("flat_rate");
  const [price, setPrice] = useState("");
  const [minOrder, setMinOrder] = useState("");
  const [estimatedDays, setEstimatedDays] = useState("");

  const resetForm = () => { setName(""); setType("flat_rate"); setPrice(""); setMinOrder(""); setEstimatedDays(""); };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMut.mutate({
      name,
      type,
      price: type === "free" ? 0 : Number(price) || 0,
      minOrderAmount: type === "free_over" ? Number(minOrder) || undefined : undefined,
      estimatedDays: estimatedDays || undefined,
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shipping Rates</h1>
          <p className="text-sm text-gray-500 mt-1">Configure shipping options shown during checkout.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Rate
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="border border-gray-200 rounded-xl p-5 bg-gray-50 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">New Shipping Rate</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Standard Shipping"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type *</label>
              <select value={type} onChange={(e) => setType(e.target.value as ShippingType)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {(Object.keys(TYPE_LABELS) as ShippingType[]).map((t) => (
                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            {type === "flat_rate" && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Price (R) *</label>
                <input required type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="99.00"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
              </div>
            )}
            {type === "free_over" && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Free when order ≥ (R) *</label>
                <input required type="number" min="0" step="0.01" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} placeholder="500.00"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Estimated Delivery (optional)</label>
              <input value={estimatedDays} onChange={(e) => setEstimatedDays(e.target.value)} placeholder="3–5 business days"
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
              Save Rate
            </button>
          </div>
        </form>
      )}

      {/* Rate list */}
      {!rates || rates.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl">
          <Truck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No shipping rates yet. Add your first rate to enable checkout.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rates.map((rate) => (
            <div key={rate.id} className="flex items-center gap-4 border border-gray-200 rounded-xl px-5 py-4 bg-white">
              <Truck className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">{rate.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${rate.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                    {rate.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {TYPE_LABELS[rate.type as ShippingType]}
                  {rate.type === "flat_rate" && ` · R${Number(rate.price).toFixed(2)}`}
                  {rate.type === "free_over" && ` · free over R${Number(rate.minOrderAmount ?? 0).toFixed(2)}`}
                  {rate.type === "free" && " · always free"}
                  {rate.estimatedDays && ` · ${rate.estimatedDays}`}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => updateMut.mutate({ id: rate.id, isActive: !rate.isActive })}
                  disabled={updateMut.isPending}
                  className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {rate.isActive ? "Disable" : "Enable"}
                </button>
                <button
                  onClick={() => deleteMut.mutate({ id: rate.id })}
                  disabled={deleteMut.isPending}
                  className="text-red-400 hover:text-red-600 border border-red-100 hover:border-red-200 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
