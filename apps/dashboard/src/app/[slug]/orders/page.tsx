"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ShoppingCart,
  X,
  Truck,
  Package,
  User,
  FileText,
  ChevronRight,
  Loader2,
  AlertTriangle,
} from "lucide-react";

// ── Status maps ───────────────────────────────────────────────────────────────

const ORDER_STATUS: Record<string, { label: string; cls: string }> = {
  pending:    { label: "Pending",    cls: "bg-yellow-50 text-yellow-700 border border-yellow-200" },
  processing: { label: "Processing", cls: "bg-blue-50 text-blue-700 border border-blue-200" },
  shipped:    { label: "Shipped",    cls: "bg-purple-50 text-purple-700 border border-purple-200" },
  delivered:  { label: "Delivered",  cls: "bg-green-50 text-green-700 border border-green-200" },
  cancelled:  { label: "Cancelled",  cls: "bg-red-50 text-red-600 border border-red-200" },
  refunded:   { label: "Refunded",   cls: "bg-gray-100 text-gray-600 border border-gray-200" },
};

const FINANCIAL_STATUS: Record<string, { label: string; cls: string }> = {
  pending:            { label: "Unpaid",         cls: "bg-yellow-50 text-yellow-700 border border-yellow-200" },
  paid:               { label: "Paid",           cls: "bg-green-50 text-green-700 border border-green-200" },
  failed:             { label: "Failed",         cls: "bg-red-50 text-red-600 border border-red-200" },
  refunded:           { label: "Refunded",       cls: "bg-gray-100 text-gray-600 border border-gray-200" },
  partially_refunded: { label: "Partial Refund", cls: "bg-orange-50 text-orange-700 border border-orange-200" },
};

// ── Order detail panel ────────────────────────────────────────────────────────

function OrderPanel({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const confirm = useConfirm();
  const { data, isLoading, refetch } = trpc.orders.getDetail.useQuery({ id: orderId });

  const updateStatus   = trpc.orders.updateStatus.useMutation({ onSuccess: () => refetch() });
  const addTracking    = trpc.orders.addTracking.useMutation({ onSuccess: () => { refetch(); setTrackingOpen(false); } });
  const cancelOrder    = trpc.orders.cancel.useMutation({ onSuccess: () => refetch() });
  const updateNotes    = trpc.orders.updateFulfillmentNotes.useMutation({ onSuccess: () => refetch() });

  const [tab, setTab]                         = useState<"details" | "customer" | "notes">("details");
  const [trackingOpen, setTrackingOpen]       = useState(false);
  const [trackingNumber, setTrackingNumber]   = useState("");
  const [trackingCarrier, setTrackingCarrier] = useState("");
  const [notesInput, setNotesInput]           = useState("");
  const [cancelReason, setCancelReason]       = useState("");

  // Initialize notes from server data
  useEffect(() => {
    if (data?.fulfillmentNotes !== undefined) {
      setNotesInput(data.fulfillmentNotes ?? "");
    }
  }, [data?.fulfillmentNotes]);

  const addr = data?.shippingAddress as {
    firstName?: string; lastName?: string;
    address1?: string; address2?: string;
    city?: string; province?: string;
    postalCode?: string; country?: string;
  } | null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40 transition-opacity" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {data ? `Order #${data.orderNumber}` : "Order"}
            </h2>
            {data && (
              <p className="text-xs text-gray-500 mt-0.5">{formatDate(data.createdAt)}</p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : !data ? (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">Order not found</div>
        ) : (
          <>
            {/* Status bar */}
            <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 bg-gray-50 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500">Fulfillment</span>
                {updateStatus.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                ) : (
                  <select
                    value={data.status}
                    onChange={(e) =>
                      updateStatus.mutate({
                        id: data.id,
                        status: e.target.value as "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded",
                      })
                    }
                    disabled={data.status === "cancelled"}
                    className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white disabled:opacity-60"
                  >
                    {(["pending", "processing", "shipped", "delivered", "cancelled", "refunded"] as const).map((s) => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                )}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${FINANCIAL_STATUS[data.financialStatus]?.cls ?? ""}`}>
                {FINANCIAL_STATUS[data.financialStatus]?.label ?? data.financialStatus}
              </span>
              {data.trackingNumber && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                  <Truck className="w-3 h-3" />
                  {data.trackingCarrier ? `${data.trackingCarrier}: ` : ""}{data.trackingNumber}
                </span>
              )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 px-6">
              {(["details", "customer", "notes"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`py-3 px-1 mr-6 text-sm font-medium border-b-2 transition-colors capitalize ${
                    tab === t
                      ? "border-gray-900 text-gray-900"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t === "details" && <Package className="w-3.5 h-3.5 inline mr-1.5" />}
                  {t === "customer" && <User className="w-3.5 h-3.5 inline mr-1.5" />}
                  {t === "notes" && <FileText className="w-3.5 h-3.5 inline mr-1.5" />}
                  {t}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">

              {/* ── Details tab ─────────────────────────────────────── */}
              {tab === "details" && (
                <div className="px-6 py-5 space-y-6">
                  {/* Line items */}
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Items</h3>
                    <div className="space-y-2">
                      {data.lineItems.map((item) => (
                        <div key={item.id} className="flex items-start justify-between gap-3 py-2 border-b border-gray-100 last:border-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {item.variantTitle && item.variantTitle !== "Default Title" && (
                                <span>{item.variantTitle} · </span>
                              )}
                              {item.sku && <span className="font-mono">SKU: {item.sku} · </span>}
                              Qty: {item.quantity}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-medium text-gray-900">
                              {formatCurrency(Number(item.totalPrice), data.currency)}
                            </p>
                            <p className="text-xs text-gray-400">
                              {formatCurrency(Number(item.unitPrice), data.currency)} ea
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span>{formatCurrency(Number(data.subtotal), data.currency)}</span>
                    </div>
                    {Number(data.discountTotal) > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount {data.couponCode && `(${data.couponCode})`}</span>
                        <span>−{formatCurrency(Number(data.discountTotal), data.currency)}</span>
                      </div>
                    )}
                    {Number(data.shippingTotal) > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>Shipping {(data.metadata as { shippingRateName?: string } | null)?.shippingRateName && `(${(data.metadata as { shippingRateName?: string }).shippingRateName})`}</span>
                        <span>{formatCurrency(Number(data.shippingTotal), data.currency)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t border-gray-200">
                      <span>Total</span>
                      <span>{formatCurrency(Number(data.total), data.currency)}</span>
                    </div>
                  </div>

                  {/* Shipping address */}
                  {addr && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Shipping Address</h3>
                      <address className="not-italic text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-4">
                        {addr.firstName} {addr.lastName}<br />
                        {addr.address1}{addr.address2 && `, ${addr.address2}`}<br />
                        {addr.city}{addr.province && `, ${addr.province}`} {addr.postalCode}<br />
                        {addr.country}
                      </address>
                    </div>
                  )}

                  {/* Tracking */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tracking</h3>
                      <button
                        onClick={() => {
                          setTrackingNumber(data.trackingNumber ?? "");
                          setTrackingCarrier(data.trackingCarrier ?? "");
                          setTrackingOpen((v) => !v);
                        }}
                        className="text-xs text-gray-600 hover:text-gray-900 font-medium flex items-center gap-1"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        {data.trackingNumber ? "Edit tracking" : "Add tracking"}
                      </button>
                    </div>

                    {trackingOpen && (
                      <div className="space-y-3 bg-gray-50 rounded-xl p-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Tracking number *</label>
                          <input
                            value={trackingNumber}
                            onChange={(e) => setTrackingNumber(e.target.value)}
                            placeholder="e.g. 1Z999AA10123456784"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Carrier (optional)</label>
                          <input
                            value={trackingCarrier}
                            onChange={(e) => setTrackingCarrier(e.target.value)}
                            placeholder="e.g. The Courier Guy, DHL, Aramex"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => addTracking.mutate({ id: data.id, trackingNumber, trackingCarrier })}
                            disabled={!trackingNumber || addTracking.isPending}
                            className="flex-1 bg-gray-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
                          >
                            {addTracking.isPending ? "Saving…" : "Save tracking"}
                          </button>
                          <button
                            onClick={() => setTrackingOpen(false)}
                            className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-200 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {!trackingOpen && data.trackingNumber && (
                      <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700">
                        <p className="font-mono font-medium">{data.trackingNumber}</p>
                        {data.trackingCarrier && (
                          <p className="text-xs text-gray-500 mt-0.5">{data.trackingCarrier}</p>
                        )}
                      </div>
                    )}

                    {!trackingOpen && !data.trackingNumber && (
                      <p className="text-sm text-gray-400 italic">No tracking number added yet</p>
                    )}
                  </div>

                  {/* Order note */}
                  {data.note && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Customer Note</h3>
                      <p className="text-sm text-gray-700 bg-yellow-50 border border-yellow-200 rounded-xl p-4">{data.note}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Customer tab ─────────────────────────────────────── */}
              {tab === "customer" && (
                <div className="px-6 py-5 space-y-4">
                  {data.customer ? (
                    <>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gray-900 text-white flex items-center justify-center text-lg font-semibold">
                          {((data.customer.firstName?.[0] ?? data.customer.email[0]) ?? "?").toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {[data.customer.firstName, data.customer.lastName].filter(Boolean).join(" ") || "—"}
                          </p>
                          <p className="text-sm text-gray-500">{data.customer.email}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-xs text-gray-500">Total orders</p>
                          <p className="text-xl font-bold text-gray-900 mt-1">{data.customer.totalOrders}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-xs text-gray-500">Total spent</p>
                          <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(Number(data.customer.totalSpent), data.currency)}</p>
                        </div>
                      </div>
                      {data.customer.phone && (
                        <div className="text-sm text-gray-700">
                          <span className="text-gray-500">Phone: </span>{data.customer.phone}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <User className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="font-medium text-gray-700">Guest order</p>
                      <p className="text-sm text-gray-500 mt-1">{data.customerEmail}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Notes tab ────────────────────────────────────────── */}
              {tab === "notes" && (
                <div className="px-6 py-5 space-y-4">
                  <p className="text-xs text-gray-500">Internal notes — not visible to the customer.</p>
                  <textarea
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    rows={6}
                    placeholder="Add internal fulfillment notes..."
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                  />
                  <button
                    onClick={() => updateNotes.mutate({ id: data.id, fulfillmentNotes: notesInput })}
                    disabled={updateNotes.isPending}
                    className="bg-gray-900 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
                  >
                    {updateNotes.isPending ? "Saving…" : "Save notes"}
                  </button>
                  {updateNotes.isSuccess && (
                    <p className="text-xs text-green-600">Notes saved.</p>
                  )}
                </div>
              )}
            </div>

            {/* Cancel order — danger zone */}
            {data.status !== "cancelled" && data.status !== "delivered" && (
              <div className="px-6 py-4 border-t border-gray-100 space-y-2">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Cancel reason (optional)</label>
                  <input
                    type="text"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="e.g. Customer requested, out of stock…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
                <button
                  disabled={cancelOrder.isPending}
                  onClick={async () => {
                    const ok = await confirm({
                      title: "Cancel order",
                      message: `Cancel order #${data.orderNumber}? Inventory will be restored. This cannot be undone.`,
                      danger: true,
                    });
                    if (!ok) return;
                    cancelOrder.mutate({ id: data.id, fulfillmentNotes: cancelReason || undefined });
                  }}
                  className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1.5 disabled:opacity-50"
                >
                  <AlertTriangle className="w-4 h-4" />
                  {cancelOrder.isPending ? "Cancelling…" : "Cancel order"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ── Orders page ───────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [search, setSearch]             = useState("");

  const { data: orders, isLoading } = trpc.orders.list.useQuery({
    status: statusFilter as "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded" | undefined,
    limit: 100,
  });

  const filtered = (orders ?? []).filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      String(o.orderNumber).includes(q) ||
      (o.customerEmail ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="text-gray-600 mt-1">Track and manage customer orders</p>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by order # or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <select
          value={statusFilter ?? ""}
          onChange={(e) => setStatusFilter(e.target.value || undefined)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">Loading…</div>
        ) : !filtered.length ? (
          <div className="p-12 text-center">
            <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-medium text-gray-900 mb-1">No orders found</h3>
            <p className="text-sm text-gray-500">
              {search || statusFilter ? "Try adjusting your filters" : "Orders will appear here once customers start buying"}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Order</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Customer</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Fulfillment</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Payment</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Total</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Date</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => setSelectedId(order.id)}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <span className="font-mono font-medium text-gray-900">#{order.orderNumber}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-[180px] truncate">
                    {order.customerEmail ?? "Guest"}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${ORDER_STATUS[order.status]?.cls ?? ""}`}>
                      {ORDER_STATUS[order.status]?.label ?? order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${FINANCIAL_STATUS[order.financialStatus]?.cls ?? ""}`}>
                      {FINANCIAL_STATUS[order.financialStatus]?.label ?? order.financialStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {formatCurrency(Number(order.total), order.currency)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedId && (
        <OrderPanel orderId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
