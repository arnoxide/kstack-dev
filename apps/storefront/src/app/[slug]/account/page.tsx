"use client";

import { use, useEffect, useState } from "react";
import { useCustomerAuth } from "@/context/customer-auth-context";
import { useCart } from "@/context/cart-context";
import { formatCurrency } from "@/lib/utils";
import {
  CheckCircle,
  ChevronRight,
  Eye,
  EyeOff,
  Heart,
  Loader2,
  Lock,
  LogOut,
  MapPin,
  Package,
  Pencil,
  ShoppingBag,
  Trash2,
  User,
} from "lucide-react";
import Link from "next/link";

// ── Auth forms ────────────────────────────────────────────────────────────────

function AuthSection({ tenantId, slug, onRegistered }: { tenantId: string; slug: string; onRegistered?: () => void }) {
  const { login, register } = useCustomerAuth();
  const [tab, setTab] = useState<"login" | "register">("login");

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [showLoginPw, setShowLoginPw] = useState(false);

  // Register state
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regFirst, setRegFirst] = useState("");
  const [regLast, setRegLast] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");
  const [showRegPw, setShowRegPw] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    try {
      await login(tenantId, loginEmail, loginPassword);
    } catch (err: unknown) {
      setLoginError((err as { message?: string }).message ?? "Login failed");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegLoading(true);
    setRegError("");
    try {
      await register(tenantId, { email: regEmail, password: regPassword, firstName: regFirst, lastName: regLast, ...(regPhone ? { phone: regPhone } : {}) });
      onRegistered?.();
    } catch (err: unknown) {
      setRegError((err as { message?: string }).message ?? "Registration failed");
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 mb-4">
          <User className="w-7 h-7 text-gray-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">My Account</h1>
        <p className="text-sm text-gray-500 mt-1">Sign in to track orders, manage your wishlist and more.</p>
      </div>

      {/* Tab switcher */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
        {(["login", "register"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            {t === "login" ? "Sign In" : "Create Account"}
          </button>
        ))}
      </div>

      {tab === "login" ? (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input required type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="you@example.com"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-shop-primary" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
            <div className="relative">
              <input required type={showLoginPw ? "text" : "password"} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="••••••••"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-shop-primary pr-11" />
              <button type="button" onClick={() => setShowLoginPw(!showLoginPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showLoginPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {loginError && <p className="text-sm text-red-500">{loginError}</p>}
          <button type="submit" disabled={loginLoading}
            className="w-full bg-shop-accent text-shop-accent-fg py-3 rounded-shop font-medium hover:bg-shop-accent transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loginLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Sign In
          </button>
          <p className="text-center text-xs text-gray-500">
            Don&apos;t have an account?{" "}
            <button type="button" onClick={() => setTab("register")} className="text-gray-900 font-medium underline underline-offset-2">Create one</button>
          </p>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">First name</label>
              <input required value={regFirst} onChange={(e) => setRegFirst(e.target.value)} placeholder="Jane"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-shop-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Last name</label>
              <input required value={regLast} onChange={(e) => setRegLast(e.target.value)} placeholder="Smith"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-shop-primary" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input required type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="you@example.com"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-shop-primary" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Phone (optional)</label>
            <input type="tel" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} placeholder="+27 000 000 0000"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-shop-primary" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
            <div className="relative">
              <input required type={showRegPw ? "text" : "password"} value={regPassword} onChange={(e) => setRegPassword(e.target.value)} placeholder="Min 8 characters"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-shop-primary pr-11" />
              <button type="button" onClick={() => setShowRegPw(!showRegPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showRegPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {regError && <p className="text-sm text-red-500">{regError}</p>}
          <button type="submit" disabled={regLoading}
            className="w-full bg-shop-accent text-shop-accent-fg py-3 rounded-shop font-medium hover:bg-shop-accent transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {regLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Account
          </button>
          <p className="text-center text-xs text-gray-500">
            Already have an account?{" "}
            <button type="button" onClick={() => setTab("login")} className="text-gray-900 font-medium underline underline-offset-2">Sign in</button>
          </p>
        </form>
      )}
    </div>
  );
}

// ── Logged-in dashboard ────────────────────────────────────────────────────────

interface Order {
  id: string;
  orderNumber: number;
  status: string;
  createdAt: Date;
  customerEmail: string | null;
  total: string | number;
  lineItems: { id: string }[];
}

function OrderCard({ order, slug }: { order: Order; slug: string }) {
  const statusColor: Record<string, string> = {
    pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
    processing: "bg-blue-50 text-blue-700 border-blue-200",
    shipped: "bg-purple-50 text-purple-700 border-purple-200",
    delivered: "bg-green-50 text-green-700 border-green-200",
    cancelled: "bg-red-50 text-red-600 border-red-200",
    refunded: "bg-gray-100 text-gray-600 border-gray-200",
  };
  return (
    <Link
      href={`/${slug}/orders/${order.orderNumber}?email=${encodeURIComponent(order.customerEmail ?? "")}`}
      className="block border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="font-semibold text-sm text-gray-900 font-mono">Order #{order.orderNumber}</p>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${statusColor[order.status] ?? ""}`}>
          {order.status}
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-2">{new Date(order.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}</p>
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{order.lineItems.length} item{order.lineItems.length !== 1 ? "s" : ""}</p>
        <div className="flex items-center gap-1">
          <p className="text-sm font-bold text-gray-900">{formatCurrency(Number(order.total))}</p>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    </Link>
  );
}

function ProfileSection({ slug, tenantId, justRegistered }: { slug: string; tenantId: string; justRegistered?: boolean }) {
  const { customer, logout, refresh, getAuthedClient } = useCustomerAuth();
  const [tab, setTab] = useState<"overview" | "orders" | "profile" | "address" | "password">("overview");
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(!!justRegistered);

  // Profile edit
  const [firstName, setFirstName] = useState(customer?.firstName ?? "");
  const [lastName, setLastName] = useState(customer?.lastName ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  // Address
  const [addrFirstName, setAddrFirstName] = useState("");
  const [addrLastName, setAddrLastName] = useState("");
  const [addrLine1, setAddrLine1] = useState("");
  const [addrLine2, setAddrLine2] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrProvince, setAddrProvince] = useState("");
  const [addrPostal, setAddrPostal] = useState("");
  const [addrCountry, setAddrCountry] = useState("South Africa");
  const [addrPhone, setAddrPhone] = useState("");
  const [addrSaving, setAddrSaving] = useState(false);
  const [addrMsg, setAddrMsg] = useState("");
  const [addrRemoving, setAddrRemoving] = useState(false);

  // Password change
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");

  useEffect(() => {
    if (customer) {
      setFirstName(customer.firstName ?? "");
      setLastName(customer.lastName ?? "");
      setPhone(customer.phone ?? "");
      const addr = customer.defaultAddress;
      if (addr) {
        setAddrFirstName(addr.firstName);
        setAddrLastName(addr.lastName);
        setAddrLine1(addr.address1);
        setAddrLine2(addr.address2 ?? "");
        setAddrCity(addr.city);
        setAddrProvince(addr.province ?? "");
        setAddrPostal(addr.postalCode);
        setAddrCountry(addr.country);
        setAddrPhone(addr.phone ?? "");
      }
    }
  }, [customer]);

  useEffect(() => {
    if (tab === "orders" && orders.length === 0) {
      const client = getAuthedClient();
      if (!client) return;
      setOrdersLoading(true);
      client.customerAuth.myOrders.query({})
        .then((data) => setOrders(data as unknown as Order[]))
        .catch(() => {})
        .finally(() => setOrdersLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg("");
    try {
      const client = getAuthedClient();
      if (!client) throw new Error("Not authenticated");
      await client.customerAuth.updateProfile.mutate({ firstName, lastName, phone: phone || undefined });
      await refresh();
      setProfileMsg("Profile updated!");
      setTimeout(() => setProfileMsg(""), 3000);
    } catch {
      setProfileMsg("Failed to save.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddrSaving(true);
    setAddrMsg("");
    try {
      const client = getAuthedClient();
      if (!client) throw new Error("Not authenticated");
      await client.customerAuth.saveAddress.mutate({
        firstName: addrFirstName,
        lastName: addrLastName,
        address1: addrLine1,
        address2: addrLine2 || undefined,
        city: addrCity,
        province: addrProvince || undefined,
        postalCode: addrPostal,
        country: addrCountry,
        phone: addrPhone || undefined,
      });
      await refresh();
      setAddrMsg("Address saved!");
      setTimeout(() => setAddrMsg(""), 3000);
    } catch {
      setAddrMsg("Failed to save address.");
    } finally {
      setAddrSaving(false);
    }
  };

  const handleRemoveAddress = async () => {
    if (!confirm("Remove your saved address?")) return;
    setAddrRemoving(true);
    try {
      const client = getAuthedClient();
      if (!client) return;
      await client.customerAuth.removeAddress.mutate();
      await refresh();
      setAddrFirstName(""); setAddrLastName(""); setAddrLine1(""); setAddrLine2("");
      setAddrCity(""); setAddrProvince(""); setAddrPostal(""); setAddrCountry("South Africa"); setAddrPhone("");
    } finally {
      setAddrRemoving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwSaving(true);
    setPwMsg("");
    setPwError("");
    try {
      const client = getAuthedClient();
      if (!client) throw new Error("Not authenticated");
      await client.customerAuth.changePassword.mutate({ currentPassword: currentPw, newPassword: newPw });
      setPwMsg("Password changed successfully!");
      setCurrentPw("");
      setNewPw("");
      setTimeout(() => setPwMsg(""), 3000);
    } catch (err: unknown) {
      setPwError((err as { message?: string }).message ?? "Failed to change password");
    } finally {
      setPwSaving(false);
    }
  };

  const tabs = [
    { key: "overview", label: "Overview", icon: User },
    { key: "orders", label: "Orders", icon: Package },
    { key: "profile", label: "Profile", icon: Pencil },
    { key: "address", label: "Address", icon: MapPin },
    { key: "password", label: "Password", icon: Lock },
  ] as const;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Welcome banner after registration */}
      {showWelcome && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-6">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-800 font-medium">Account created successfully! Welcome to the store.</p>
          <button onClick={() => setShowWelcome(false)} className="ml-auto text-green-600 hover:text-green-800 text-lg leading-none">&times;</button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hi, {customer?.firstName ?? "there"} 👋
          </h1>
          <p className="text-sm text-gray-500">{customer?.email}</p>
        </div>
        <button onClick={logout} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50 border border-gray-200">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Orders", value: customer?.totalOrders ?? 0 },
          { label: "Total Spent", value: customer ? formatCurrency(customer.totalSpent) : "—" },
          { label: "Wishlist", value: <Link href={`/${slug}/wishlist`} className="flex items-center gap-1 hover:underline"><Heart className="w-4 h-4 text-red-400" /> View</Link> },
        ].map(({ label, value }) => (
          <div key={label} className="border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-lg font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 flex-shrink-0 px-4 py-2 text-sm rounded-lg transition-colors ${tab === key ? "bg-white text-gray-900 font-medium shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { href: `/${slug}/wishlist`, icon: Heart, label: "My Wishlist", desc: "Products you've saved", color: "text-red-400" },
            { href: `/${slug}/products`, icon: ShoppingBag, label: "Continue Shopping", desc: "Browse the store", color: "text-blue-400" },
          ].map(({ href, icon: Icon, label, desc, color }) => (
            <Link key={href} href={href} className="flex items-center gap-4 border border-gray-200 rounded-xl p-5 hover:bg-gray-50 transition-colors">
              <Icon className={`w-6 h-6 ${color} flex-shrink-0`} />
              <div>
                <p className="font-semibold text-sm text-gray-900">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
            </Link>
          ))}
          <button onClick={() => setTab("orders")} className="flex items-center gap-4 border border-gray-200 rounded-xl p-5 hover:bg-gray-50 transition-colors text-left">
            <Package className="w-6 h-6 text-purple-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm text-gray-900">Order History</p>
              <p className="text-xs text-gray-500">{customer?.totalOrders ?? 0} order{customer?.totalOrders !== 1 ? "s" : ""} placed</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
          </button>
          <button onClick={() => setTab("profile")} className="flex items-center gap-4 border border-gray-200 rounded-xl p-5 hover:bg-gray-50 transition-colors text-left">
            <Pencil className="w-6 h-6 text-green-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm text-gray-900">Edit Profile</p>
              <p className="text-xs text-gray-500">Update your name and phone</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
          </button>
          <button onClick={() => setTab("address")} className="flex items-center gap-4 border border-gray-200 rounded-xl p-5 hover:bg-gray-50 transition-colors text-left">
            <MapPin className="w-6 h-6 text-orange-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm text-gray-900">Default Address</p>
              <p className="text-xs text-gray-500">
                {customer?.defaultAddress ? customer.defaultAddress.address1 + ", " + customer.defaultAddress.city : "No address saved"}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
          </button>
        </div>
      )}

      {tab === "orders" && (
        <div className="space-y-3">
          {ordersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl">
              <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-4">No orders yet.</p>
              <Link href={`/${slug}/products`} className="inline-block bg-shop-accent text-shop-accent-fg px-6 py-2.5 rounded-shop text-sm font-medium hover:bg-shop-accent transition-colors">
                Start Shopping
              </Link>
            </div>
          ) : (
            orders.map((order) => <OrderCard key={order.id} order={order} slug={slug} />)
          )}
        </div>
      )}

      {tab === "profile" && (
        <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input value={customer?.email ?? ""} disabled
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">First name</label>
              <input required value={firstName} onChange={(e) => setFirstName(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-shop-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Last name</label>
              <input required value={lastName} onChange={(e) => setLastName(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-shop-primary" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Phone (optional)</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+27 000 000 0000"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-shop-primary" />
          </div>
          {profileMsg && <p className={`text-sm ${profileMsg.includes("!") ? "text-green-600" : "text-red-500"}`}>{profileMsg}</p>}
          <button type="submit" disabled={profileSaving}
            className="bg-shop-accent text-shop-accent-fg px-6 py-2.5 rounded-shop text-sm font-medium hover:bg-shop-accent transition-colors disabled:opacity-60 flex items-center gap-2">
            {profileSaving && <Loader2 className="w-4 h-4 animate-spin" />} Save Changes
          </button>
        </form>
      )}

      {tab === "address" && (
        <div className="max-w-md space-y-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-gray-500">
              This address autofills on checkout every time you order.
            </p>
            {customer?.defaultAddress && (
              <button
                onClick={handleRemoveAddress}
                disabled={addrRemoving}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
              >
                {addrRemoving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                Remove
              </button>
            )}
          </div>
          <form onSubmit={handleSaveAddress} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">First name</label>
                <input required value={addrFirstName} onChange={(e) => setAddrFirstName(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-shop-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Last name</label>
                <input required value={addrLastName} onChange={(e) => setAddrLastName(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-shop-primary" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
              <input required value={addrLine1} onChange={(e) => setAddrLine1(e.target.value)} placeholder="123 Main St"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-shop-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Apartment, suite, etc. (optional)</label>
              <input value={addrLine2} onChange={(e) => setAddrLine2(e.target.value)} placeholder="Apt 4B"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-shop-primary" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
                <input required value={addrCity} onChange={(e) => setAddrCity(e.target.value)} placeholder="Cape Town"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-shop-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Postal code</label>
                <input required value={addrPostal} onChange={(e) => setAddrPostal(e.target.value)} placeholder="8001"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-shop-primary" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Province (optional)</label>
                <input value={addrProvince} onChange={(e) => setAddrProvince(e.target.value)} placeholder="Western Cape"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-shop-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Country</label>
                <input required value={addrCountry} onChange={(e) => setAddrCountry(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-shop-primary" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone (optional)</label>
              <input type="tel" value={addrPhone} onChange={(e) => setAddrPhone(e.target.value)} placeholder="+27 000 000 0000"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-shop-primary" />
            </div>
            {addrMsg && (
              <p className={`text-sm ${addrMsg.includes("!") ? "text-green-600" : "text-red-500"}`}>{addrMsg}</p>
            )}
            <button type="submit" disabled={addrSaving}
              className="bg-shop-accent text-shop-accent-fg px-6 py-2.5 rounded-shop text-sm font-medium hover:bg-shop-accent transition-colors disabled:opacity-60 flex items-center gap-2">
              {addrSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {customer?.defaultAddress ? "Update Address" : "Save Address"}
            </button>
          </form>
        </div>
      )}

      {tab === "password" && (
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Current Password</label>
            <input required type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} placeholder="••••••••"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-shop-primary" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">New Password</label>
            <input required type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Min 8 characters" minLength={8}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-shop-primary" />
          </div>
          {pwError && <p className="text-sm text-red-500">{pwError}</p>}
          {pwMsg && <p className="text-sm text-green-600">{pwMsg}</p>}
          <button type="submit" disabled={pwSaving}
            className="bg-shop-accent text-shop-accent-fg px-6 py-2.5 rounded-shop text-sm font-medium hover:bg-shop-accent transition-colors disabled:opacity-60 flex items-center gap-2">
            {pwSaving && <Loader2 className="w-4 h-4 animate-spin" />} Change Password
          </button>
        </form>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AccountPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { cart } = useCart();
  const { customer, token, loading } = useCustomerAuth();
  const [justRegistered, setJustRegistered] = useState(false);

  const handleRegistered = () => setJustRegistered(true);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (!customer || !token) {
    return <AuthSection tenantId={cart.tenantId} slug={slug} onRegistered={handleRegistered} />;
  }

  return <ProfileSection slug={slug} tenantId={cart.tenantId} justRegistered={justRegistered} />;
}
