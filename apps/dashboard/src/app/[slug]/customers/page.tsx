"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Users,
  Mail,
  ShoppingCart,
  TrendingUp,
  X,
  Phone,
  MapPin,
  Package,
  Calendar,
  ChevronRight,
  Clock,
  DollarSign,
  Hash,
  Loader2,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Ban,
} from "lucide-react";

// ── Status badge ──────────────────────────────────────────────────────────────

const ORDER_STATUS: Record<string, { label: string; cls: string }> = {
  pending:    { label: "Pending",    cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  processing: { label: "Processing", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  shipped:    { label: "Shipped",    cls: "bg-purple-50 text-purple-700 border-purple-200" },
  delivered:  { label: "Delivered",  cls: "bg-green-50 text-green-700 border-green-200" },
  cancelled:  { label: "Cancelled",  cls: "bg-red-50 text-red-600 border-red-200" },
  refunded:   { label: "Refunded",   cls: "bg-gray-100 text-gray-600 border-gray-200" },
};

// ── Customer slide-over panel ─────────────────────────────────────────────────

function CustomerPanel({ customerId, slug, onClose }: { customerId: string; slug: string; onClose: () => void }) {
  const { data, isLoading, refetch } = trpc.orders.customerDetail.useQuery({ customerId });
  const updateNote = trpc.orders.updateCustomerNote.useMutation({ onSuccess: () => { refetch(); setNoteMsg("Note saved!"); setTimeout(() => setNoteMsg(""), 3000); } });
  const sendEmail = trpc.email.send.useMutation({ onSuccess: () => { setComposeOpen(false); setEmailSubject(""); setEmailBody(""); setEmailSent(true); setTimeout(() => setEmailSent(false), 3000); } });

  const [noteInput, setNoteInput] = useState("");
  const [noteMsg, setNoteMsg] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "orders" | "address">("overview");

  // Compose
  const [composeOpen, setComposeOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  // Populate note input when data loads
  const note = (data as any)?.metadata?.note ?? "";

  const initials = data
    ? (([data.firstName, data.lastName].filter(Boolean).join(" ") || data.email)[0] ?? "?").toUpperCase()
    : "?";
  const fullName = data
    ? [data.firstName, data.lastName].filter(Boolean).join(" ") || "—"
    : "";

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40 transition-opacity" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Customer Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-7 h-7 text-gray-400 animate-spin" />
          </div>
        ) : !data ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Customer not found</div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Identity block */}
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl font-bold flex-shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-gray-900 truncate">{fullName}</p>
                  <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                    <Mail className="w-3.5 h-3.5" /> {data.email}
                  </p>
                  {data.phone && (
                    <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-3.5 h-3.5" /> {data.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                {[
                  { icon: ShoppingCart, label: "Orders", value: data.totalOrders },
                  { icon: DollarSign, label: "Lifetime Value", value: formatCurrency(Number(data.totalSpent)) },
                  { icon: TrendingUp, label: "Avg. Order", value: formatCurrency(data.avgOrderValue) },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-white rounded-xl border border-gray-200 px-3 py-2.5 text-center">
                    <Icon className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              {/* Meta */}
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Joined {formatDate(data.createdAt)}</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${data.passwordHash ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                  {data.passwordHash ? <><CheckCircle className="w-3 h-3" /> Account</> : <><AlertCircle className="w-3 h-3" /> Guest</>}
                </span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6 pt-4 pb-0">
              {(["overview", "orders", "address"] as const).map((t) => (
                <button key={t} onClick={() => setActiveTab(t)}
                  className={`px-4 py-2 text-sm rounded-lg font-medium capitalize transition-colors ${activeTab === t ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"}`}>
                  {t}
                </button>
              ))}
            </div>

            <div className="px-6 py-4 space-y-4">

              {/* ── Overview tab ─────────────────────────────────────────── */}
              {activeTab === "overview" && (
                <div className="space-y-4">
                  {/* Account info */}
                  <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                    <div className="px-4 py-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Account Information</p>
                      <div className="space-y-2 text-sm">
                        <Row label="Full name" value={fullName} />
                        <Row label="Email" value={data.email} />
                        <Row label="Phone" value={data.phone ?? "—"} />
                        <Row label="Account type" value={data.passwordHash ? "Registered" : "Guest"} />
                        <Row label="Joined" value={formatDate(data.createdAt)} />
                      </div>
                    </div>
                  </div>

                  {/* Recent order */}
                  {data.orders.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Most Recent Order</p>
                      <RecentOrderRow order={data.orders[0]} />
                    </div>
                  )}

                  {/* Admin note */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" /> Admin Note
                      </p>
                      <button onClick={() => { setNoteInput(note); setNoteOpen(!noteOpen); }} className="text-xs text-blue-600 hover:underline">
                        {noteOpen ? "Cancel" : note ? "Edit" : "Add note"}
                      </button>
                    </div>
                    {noteOpen ? (
                      <div className="space-y-2">
                        <textarea
                          value={noteInput}
                          onChange={(e) => setNoteInput(e.target.value)}
                          rows={3}
                          maxLength={1000}
                          placeholder="Internal note about this customer..."
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                        />
                        <div className="flex items-center gap-2">
                          <button onClick={() => { updateNote.mutate({ customerId: data.id, note: noteInput }); setNoteOpen(false); }}
                            disabled={updateNote.isPending}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-700 disabled:opacity-50">
                            {updateNote.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />} Save
                          </button>
                          {noteMsg && <p className="text-xs text-green-600">{noteMsg}</p>}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600">{note || <span className="text-gray-400 italic">No note</span>}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Actions</p>
                    <div className="space-y-2">
                      <button
                        onClick={() => setComposeOpen((v) => !v)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                      >
                        <Mail className="w-4 h-4 text-gray-400" />
                        {composeOpen ? "Close Compose" : "Send Email"}
                        <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
                      </button>

                      {/* Inline compose form */}
                      {composeOpen && (
                        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
                            <p className="text-sm text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-2 select-all">{data.email}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
                            <input
                              type="text"
                              value={emailSubject}
                              onChange={(e) => setEmailSubject(e.target.value)}
                              placeholder="Subject..."
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Message</label>
                            <textarea
                              value={emailBody}
                              onChange={(e) => setEmailBody(e.target.value)}
                              rows={5}
                              placeholder="Write your message..."
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => sendEmail.mutate({ to: data.email, subject: emailSubject, body: emailBody })}
                              disabled={sendEmail.isPending || !emailSubject.trim() || !emailBody.trim()}
                              className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
                            >
                              {sendEmail.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                              Send
                            </button>
                            <button
                              onClick={() => { setComposeOpen(false); setEmailSubject(""); setEmailBody(""); }}
                              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                            >
                              Cancel
                            </button>
                            {sendEmail.isError && (
                              <p className="text-xs text-red-500 ml-auto">{(sendEmail.error as any)?.message ?? "Send failed"}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {emailSent && (
                        <p className="flex items-center gap-1.5 text-xs text-green-600 px-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Email sent successfully
                        </p>
                      )}

                      <button onClick={() => setActiveTab("orders")}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left">
                        <Package className="w-4 h-4 text-gray-400" />
                        View All Orders ({data.totalOrders})
                        <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
                      </button>
                      <button onClick={() => setActiveTab("address")}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        View Saved Address
                        <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Orders tab ───────────────────────────────────────────── */}
              {activeTab === "orders" && (
                <div className="space-y-3">
                  {data.orders.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-sm">
                      <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      No orders placed yet
                    </div>
                  ) : (
                    data.orders.map((order: any) => (
                      <div key={order.id} className="bg-white border border-gray-200 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Hash className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-sm font-semibold text-gray-900 font-mono">{order.orderNumber}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${ORDER_STATUS[order.status]?.cls ?? ""}`}>
                              {ORDER_STATUS[order.status]?.label ?? order.status}
                            </span>
                          </div>
                          <span className="text-sm font-bold text-gray-900">{formatCurrency(Number(order.total))}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(order.createdAt)}</span>
                          <span className="flex items-center gap-1"><ShoppingCart className="w-3 h-3" /> {order.lineItems.length} item{order.lineItems.length !== 1 ? "s" : ""}</span>
                          <span className={`capitalize px-1.5 py-0.5 rounded text-xs font-medium ${order.financialStatus === "paid" ? "bg-green-50 text-green-600" : "bg-yellow-50 text-yellow-600"}`}>
                            {order.financialStatus}
                          </span>
                        </div>
                        {order.lineItems.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {order.lineItems.slice(0, 3).map((item: any) => (
                              <p key={item.id} className="text-xs text-gray-500 truncate">
                                {item.quantity}× {item.title}{item.variantTitle && item.variantTitle !== "Default Title" ? ` — ${item.variantTitle}` : ""}
                              </p>
                            ))}
                            {order.lineItems.length > 3 && (
                              <p className="text-xs text-gray-400">+{order.lineItems.length - 3} more items</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ── Address tab ──────────────────────────────────────────── */}
              {activeTab === "address" && (
                <div>
                  {!(data as any).defaultAddress ? (
                    <div className="text-center py-10 text-gray-400 text-sm">
                      <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      No saved address
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <p className="text-sm font-semibold text-gray-900">Default Address</p>
                      </div>
                      {(() => {
                        const addr = (data as any).defaultAddress;
                        return (
                          <address className="text-sm text-gray-600 not-italic space-y-0.5">
                            <p className="font-medium text-gray-900">{addr.firstName} {addr.lastName}</p>
                            <p>{addr.address1}</p>
                            {addr.address2 && <p>{addr.address2}</p>}
                            <p>{addr.city}{addr.province ? `, ${addr.province}` : ""} {addr.postalCode}</p>
                            <p>{addr.country}</p>
                            {addr.phone && <p className="flex items-center gap-1 mt-1"><Phone className="w-3.5 h-3.5 text-gray-400" /> {addr.phone}</p>}
                          </address>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-500 flex-shrink-0">{label}</span>
      <span className="text-gray-900 font-medium text-right">{value}</span>
    </div>
  );
}

function RecentOrderRow({ order }: { order: any }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div>
        <p className="font-mono font-semibold text-gray-900">#{order.orderNumber}</p>
        <p className="text-xs text-gray-400 mt-0.5">{formatDate(order.createdAt)} · {order.lineItems.length} item{order.lineItems.length !== 1 ? "s" : ""}</p>
      </div>
      <div className="text-right">
        <p className="font-bold text-gray-900">{formatCurrency(Number(order.total))}</p>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${ORDER_STATUS[order.status]?.cls ?? ""}`}>
          {ORDER_STATUS[order.status]?.label ?? order.status}
        </span>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const { data: customers, isLoading } = trpc.orders.customers.useQuery({ limit: 50 });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Need slug for panel — read from URL
  const slug = typeof window !== "undefined" ? (window.location.pathname.split("/")[1] ?? "") : "";

  const totalRevenue = customers?.reduce((sum, c) => sum + Number(c.totalSpent), 0) ?? 0;
  const totalOrders = customers?.reduce((sum, c) => sum + c.totalOrders, 0) ?? 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <p className="text-gray-600 mt-1">View and manage your customer base</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{customers?.length ?? 0}</p>
            </div>
            <div className="bg-blue-500 p-3 rounded-lg"><Users className="w-5 h-5 text-white" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalOrders}</p>
            </div>
            <div className="bg-green-500 p-3 rounded-lg"><ShoppingCart className="w-5 h-5 text-white" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Customer Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="bg-purple-500 p-3 rounded-lg"><TrendingUp className="w-5 h-5 text-white" /></div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">Loading customers...</div>
        ) : !customers || customers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-medium text-gray-900 mb-1">No customers yet</h3>
            <p className="text-sm text-gray-500">No customers have registered or placed orders yet</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Customer</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Email</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Orders</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Total Spent</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Joined</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.map((customer) => {
                const name = [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "—";
                const initials = name !== "—"
                  ? name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                  : (customer.email[0] ?? "?").toUpperCase();

                return (
                  <tr
                    key={customer.id}
                    onClick={() => setSelectedId(customer.id)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {initials}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        {customer.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-gray-900">
                        <ShoppingCart className="w-3.5 h-3.5 text-gray-400" />
                        {customer.totalOrders}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {formatCurrency(Number(customer.totalSpent))}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(customer.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${(customer as any).passwordHash ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                        {(customer as any).passwordHash ? "Registered" : "Guest"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Slide-over */}
      {selectedId && (
        <CustomerPanel
          customerId={selectedId}
          slug={slug}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
