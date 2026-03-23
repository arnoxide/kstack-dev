"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Store,
  Globe,
  Trash2,
  Plus,
  Loader2,
  Check,
  AlertCircle,
  ExternalLink,
  Copy,
  Settings2,
  Puzzle,
  Lock,
  Users,
  Crown,
  ShieldCheck,
  UserMinus,
  X,
} from "lucide-react";
import { useParams } from "next/navigation";
import { MODULES, getDisabledModules, saveDisabledModules } from "@/lib/modules";
import { cn } from "@/lib/utils";

const CURRENCIES = ["ZAR", "USD", "EUR", "GBP", "KES", "NGN", "GHS", "EGP", "AED", "AUD", "CAD"];
const TIMEZONES = [
  "Africa/Johannesburg", "Africa/Nairobi", "Africa/Lagos", "Africa/Cairo",
  "Europe/London", "Europe/Paris", "America/New_York", "America/Los_Angeles",
  "Asia/Dubai", "Australia/Sydney",
];

const LOCAL_SETTINGS_KEY = (slug: string) => `kasify_store_config_${slug}`;

interface LocalConfig { currency: string; timezone: string; orderPrefix: string; }

function loadConfig(slug: string): LocalConfig {
  if (typeof window === "undefined") return { currency: "ZAR", timezone: "Africa/Johannesburg", orderPrefix: "" };
  try { return JSON.parse(localStorage.getItem(LOCAL_SETTINGS_KEY(slug)) ?? "{}"); } catch { return {} as LocalConfig; }
}

export default function SettingsPage() {
  const params = useParams<{ slug: string }>();
  const storeUrl = `${process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3003"}/${params.slug}`;

  // ── Store config (local for now) ─────────────────────────────────────────
  const [currency, setCurrency] = useState("ZAR");
  const [timezone, setTimezone] = useState("Africa/Johannesburg");
  const [orderPrefix, setOrderPrefix] = useState("");
  const [configSaved, setConfigSaved] = useState(false);

  // ── Modules ─────────────────────────────────────────────────────────────────
  const [disabledModules, setDisabledModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    setDisabledModules(getDisabledModules(params.slug));
  }, [params.slug]);

  const toggleModule = (moduleName: string, enabled: boolean) => {
    setDisabledModules((prev) => {
      const next = new Set(prev);
      if (enabled) next.delete(moduleName);
      else next.add(moduleName);
      saveDisabledModules(params.slug, next);
      return next;
    });
  };

  useEffect(() => {
    const saved = loadConfig(params.slug);
    if (saved.currency) setCurrency(saved.currency);
    if (saved.timezone) setTimezone(saved.timezone);
    if (saved.orderPrefix !== undefined) setOrderPrefix(saved.orderPrefix);
  }, [params.slug]);

  const handleSaveConfig = () => {
    const config: LocalConfig = { currency, timezone, orderPrefix };
    localStorage.setItem(LOCAL_SETTINGS_KEY(params.slug), JSON.stringify(config));
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 3000);
  };

  // ── Store settings ──────────────────────────────────────────────────────────
  const { data: tenant, refetch: refetchTenant } = trpc.tenant.get.useQuery();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [storeSaved, setStoreSaved] = useState(false);
  const [storeError, setStoreError] = useState("");

  useEffect(() => {
    if (tenant) {
      setName(tenant.name);
      setEmail(tenant.email);
      setLogoUrl(tenant.logoUrl ?? "");
    }
  }, [tenant]);

  const updateTenantMutation = trpc.tenant.update.useMutation({
    onSuccess: () => { setStoreSaved(true); refetchTenant(); setTimeout(() => setStoreSaved(false), 3000); },
    onError: (err) => setStoreError(err.message),
  });

  const handleSaveStore = () => {
    setStoreError("");
    updateTenantMutation.mutate({
      name: name.trim(),
      email: email.trim(),
      logoUrl: logoUrl.trim() || null,
    });
  };

  // ── Domains ─────────────────────────────────────────────────────────────────
  const { data: domains, refetch: refetchDomains } = trpc.tenant.domains.list.useQuery();
  const [newHostname, setNewHostname] = useState("");
  const [domainError, setDomainError] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const addDomainMutation = trpc.tenant.domains.add.useMutation({
    onSuccess: () => { setNewHostname(""); setDomainError(""); refetchDomains(); },
    onError: (err) => setDomainError(err.message),
  });

  const removeDomainMutation = trpc.tenant.domains.remove.useMutation({
    onSuccess: () => refetchDomains(),
  });

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  // ── Team members ─────────────────────────────────────────────────────────────
  const { data: teamMembers, refetch: refetchTeam } = trpc.auth.listTeamMembers.useQuery();
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberPassword, setMemberPassword] = useState("");
  const [memberRole, setMemberRole] = useState<"admin" | "staff">("staff");
  const [memberError, setMemberError] = useState("");

  const addMemberMutation = trpc.auth.addTeamMember.useMutation({
    onSuccess: () => {
      setShowAddMember(false);
      setMemberName(""); setMemberEmail(""); setMemberPassword(""); setMemberError("");
      refetchTeam();
    },
    onError: (err) => setMemberError(err.message),
  });

  const updateRoleMutation = trpc.auth.updateTeamMemberRole.useMutation({
    onSuccess: () => refetchTeam(),
  });

  const removeMemberMutation = trpc.auth.removeTeamMember.useMutation({
    onSuccess: () => refetchTeam(),
  });

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your store information and configuration</p>
      </div>

      {/* ── Store information ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
          <Store className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Store Information</h2>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Store name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact email *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Logo URL <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://example.com/logo.png"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <div className="pt-1 border-t border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-1">Store URL</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={storeUrl.replace(/^https?:\/\//, "")}
              readOnly
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-500"
            />
            <a
              href={storeUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Store slug: <span className="font-mono font-medium">{params.slug}</span>
          </p>
        </div>

        {storeError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {storeError}
          </div>
        )}

        {storeSaved && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
            <Check className="w-4 h-4" />
            Store settings saved
          </div>
        )}

        <button
          onClick={handleSaveStore}
          disabled={updateTenantMutation.isPending}
          className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {updateTenantMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {updateTenantMutation.isPending ? "Saving..." : "Save changes"}
        </button>
      </div>

      {/* ── Plan info ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Current Plan</h2>
            <p className="text-sm text-gray-500 mt-1">
              You're on the{" "}
              <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide">
                {tenant?.plan ?? "free"}
              </span>{" "}
              plan.
            </p>
          </div>
          <button className="text-sm text-blue-600 hover:underline font-medium">Upgrade</button>
        </div>
      </div>

      {/* ── Custom domains ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
          <Globe className="w-4 h-4 text-gray-500" />
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900">Custom Domains</h2>
            <p className="text-xs text-gray-500 mt-0.5">Point your own domain to this store</p>
          </div>
        </div>

        {/* Add domain */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newHostname}
            onChange={(e) => setNewHostname(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && newHostname.trim()) addDomainMutation.mutate({ hostname: newHostname.trim() }); }}
            placeholder="shop.yourdomain.com"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <button
            onClick={() => {
              if (newHostname.trim()) addDomainMutation.mutate({ hostname: newHostname.trim() });
            }}
            disabled={addDomainMutation.isPending || !newHostname.trim()}
            className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {addDomainMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add
          </button>
        </div>

        {domainError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {domainError}
          </div>
        )}

        {/* Domain list */}
        {domains && domains.length > 0 ? (
          <div className="space-y-2">
            {domains.map((domain) => (
              <div
                key={domain.id}
                className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{domain.hostname}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        domain.verified
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {domain.verified ? "Verified" : "Pending"}
                    </span>
                  </div>

                  {!domain.verified && domain.verificationToken && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-1">
                        Add this TXT record to your DNS to verify:
                      </p>
                      <div className="flex items-center gap-2 bg-gray-50 rounded border border-gray-200 px-3 py-1.5">
                        <code className="text-xs font-mono text-gray-700 flex-1 truncate">
                          kasify-verify={domain.verificationToken}
                        </code>
                        <button
                          onClick={() => copyToken(domain.verificationToken!)}
                          className="text-gray-400 hover:text-gray-700"
                        >
                          {copiedToken === domain.verificationToken ? (
                            <Check className="w-3.5 h-3.5 text-green-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    if (confirm(`Remove domain ${domain.hostname}?`)) {
                      removeDomainMutation.mutate({ id: domain.id });
                    }
                  }}
                  disabled={removeDomainMutation.isPending}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 py-2 text-center">No custom domains added yet</p>
        )}
      </div>

      {/* ── Regional settings ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
          <Settings2 className="w-4 h-4 text-gray-500" />
          <div>
            <h2 className="font-semibold text-gray-900">Regional Settings</h2>
            <p className="text-xs text-gray-500 mt-0.5">Currency and timezone for your store</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Order Number Prefix <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="text" value={orderPrefix} onChange={(e) => setOrderPrefix(e.target.value)} placeholder="e.g. ORD-"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
        </div>

        {configSaved && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
            <Check className="w-4 h-4" /> Regional settings saved
          </div>
        )}

        <button onClick={handleSaveConfig}
          className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors">
          <Check className="w-4 h-4" /> Save
        </button>
      </div>

      {/* ── Modules ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
          <Puzzle className="w-4 h-4 text-gray-500" />
          <div>
            <h2 className="font-semibold text-gray-900">Modules</h2>
            <p className="text-xs text-gray-500 mt-0.5">Enable or disable features for this store</p>
          </div>
        </div>

        <div className="space-y-1">
          {MODULES.map((mod) => {
            const enabled = mod.core || !disabledModules.has(mod.name);
            return (
              <div
                key={mod.name}
                className="flex items-center justify-between py-3 px-1 border-b border-gray-50 last:border-0"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{mod.label}</span>
                    {mod.core ? (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                        <Lock className="w-2.5 h-2.5" />
                        Core
                      </span>
                    ) : (
                      <span className="text-xs font-mono text-gray-300">{mod.name}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{mod.description}</p>
                </div>

                <button
                  type="button"
                  disabled={mod.core}
                  onClick={() => toggleModule(mod.name, !enabled)}
                  className={cn(
                    "relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200",
                    "focus:outline-none disabled:cursor-not-allowed disabled:opacity-40",
                    enabled ? "bg-blue-600" : "bg-gray-200",
                  )}
                  aria-checked={enabled}
                  role="switch"
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200",
                      enabled ? "translate-x-4" : "translate-x-0",
                    )}
                  />
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-gray-400">
          Changes take effect immediately. Disabling a module hides it from the sidebar but does not delete any data.
        </p>
      </div>

      {/* ── Team members ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-500" />
            <div>
              <h2 className="font-semibold text-gray-900">Team Members</h2>
              <p className="text-xs text-gray-500 mt-0.5">People who can access this store's dashboard</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddMember((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-medium bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
          >
            {showAddMember ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showAddMember ? "Cancel" : "Add member"}
          </button>
        </div>

        {/* Add member form */}
        {showAddMember && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
            <p className="text-xs font-medium text-gray-600">New team member — they'll log in with these credentials</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Full name</label>
                <input
                  type="text"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email address</label>
                <input
                  type="email"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={memberPassword}
                  onChange={(e) => setMemberPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value as "admin" | "staff")}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="staff">Staff — view & fulfil orders</option>
                  <option value="admin">Admin — full access except billing</option>
                </select>
              </div>
            </div>
            {memberError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {memberError}
              </div>
            )}
            <button
              onClick={() => {
                setMemberError("");
                addMemberMutation.mutate({ name: memberName.trim(), email: memberEmail.trim(), password: memberPassword, role: memberRole });
              }}
              disabled={addMemberMutation.isPending || !memberName.trim() || !memberEmail.trim() || !memberPassword}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {addMemberMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add to team
            </button>
          </div>
        )}

        {/* Member list */}
        <div className="space-y-2">
          {!teamMembers || teamMembers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No team members yet</p>
          ) : (
            teamMembers.map((member) => (
              <div key={member.muId} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
                  {(member.name[0] ?? "?").toUpperCase()}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-gray-900 truncate">{member.name}</span>
                    {member.role === "owner" && <Crown className="w-3 h-3 text-yellow-500 flex-shrink-0" />}
                    {member.role === "admin" && <ShieldCheck className="w-3 h-3 text-blue-500 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{member.email}</p>
                </div>
                {/* Role selector (owners can change non-owner roles) */}
                {member.role !== "owner" ? (
                  <select
                    value={member.role}
                    onChange={(e) => updateRoleMutation.mutate({ muId: member.muId, role: e.target.value as "admin" | "staff" })}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-gray-900"
                  >
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                ) : (
                  <span className="text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-100 px-2 py-1 rounded-lg">Owner</span>
                )}
                {/* Remove button */}
                {member.role !== "owner" && (
                  <button
                    onClick={() => {
                      if (confirm(`Remove ${member.name} from your team?`)) {
                        removeMemberMutation.mutate({ muId: member.muId });
                      }
                    }}
                    disabled={removeMemberMutation.isPending}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove member"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <p className="text-xs text-gray-400">
          <strong>Staff</strong> can view products, manage orders, and fulfil shipments.{" "}
          <strong>Admin</strong> has full dashboard access except changing billing and removing the owner.
        </p>
      </div>

      {/* ── Danger zone ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-red-200 p-5">
        <h2 className="font-semibold text-red-700 mb-1">Danger Zone</h2>
        <p className="text-sm text-gray-500 mb-4">
          These actions are permanent and cannot be undone.
        </p>
        <button
          className="flex items-center gap-2 border border-red-300 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
          onClick={() => alert("Contact support to delete your store.")}
        >
          <Trash2 className="w-4 h-4" />
          Delete store
        </button>
      </div>
    </div>
  );
}
