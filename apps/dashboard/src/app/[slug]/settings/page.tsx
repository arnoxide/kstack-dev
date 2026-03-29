"use client";

import { useState, useEffect } from "react";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { trpc } from "@/lib/trpc";
import {
  Store, Globe, Trash2, Plus, Loader2, Check, AlertCircle,
  ExternalLink, Copy, Settings2, Puzzle, Lock, Users, Crown,
  ShieldCheck, UserMinus, X, Share2, Phone,
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

const LOCAL_SETTINGS_KEY = (slug: string) => `kstack_store_config_${slug}`;
interface LocalConfig { currency: string; timezone: string; orderPrefix: string; }
function loadConfig(slug: string): LocalConfig {
  if (typeof window === "undefined") return { currency: "ZAR", timezone: "Africa/Johannesburg", orderPrefix: "" };
  try { return JSON.parse(localStorage.getItem(LOCAL_SETTINGS_KEY(slug)) ?? "{}"); } catch { return {} as LocalConfig; }
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2 pb-3 mb-4 border-b border-gray-100">
      <div className="p-1.5 bg-gray-100 rounded-lg">
        <Icon className="w-3.5 h-3.5 text-gray-600" />
      </div>
      <div>
        <h2 className="font-semibold text-gray-900 text-sm">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white";

function SaveButton({ onClick, pending, saved, label = "Save" }: { onClick: () => void; pending: boolean; saved: boolean; label?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={pending}
      className="flex items-center gap-1.5 text-xs font-medium bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
    >
      {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Check className="w-3.5 h-3.5" />}
      {pending ? "Saving…" : saved ? "Saved!" : label}
    </button>
  );
}

export default function SettingsPage() {
  const confirm = useConfirm();
  const params = useParams<{ slug: string }>();
  const rootDomain = process.env["NEXT_PUBLIC_ROOT_DOMAIN"];
  const storeUrl = rootDomain ? `https://${params.slug}.${rootDomain}` : `http://localhost:3003/${params.slug}`;

  // Store info
  const { data: tenant, refetch: refetchTenant } = trpc.tenant.get.useQuery();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [storeSaved, setStoreSaved] = useState(false);
  const [storeError, setStoreError] = useState("");

  // Social links
  const [socialFacebook, setSocialFacebook] = useState("");
  const [socialInstagram, setSocialInstagram] = useState("");
  const [socialTwitter, setSocialTwitter] = useState("");
  const [socialTiktok, setSocialTiktok] = useState("");
  const [socialYoutube, setSocialYoutube] = useState("");
  const [socialWhatsapp, setSocialWhatsapp] = useState("");
  const [socialSaved, setSocialSaved] = useState(false);

  // Contact info
  const [contactPhone, setContactPhone] = useState("");
  const [contactAddress, setContactAddress] = useState("");
  const [contactCity, setContactCity] = useState("");
  const [contactCountry, setContactCountry] = useState("");
  const [contactSupportEmail, setContactSupportEmail] = useState("");
  const [contactHours, setContactHours] = useState("");
  const [contactSaved, setContactSaved] = useState(false);

  // Regional
  const [currency, setCurrency] = useState("ZAR");
  const [timezone, setTimezone] = useState("Africa/Johannesburg");
  const [orderPrefix, setOrderPrefix] = useState("");
  const [configSaved, setConfigSaved] = useState(false);

  // Modules
  const [disabledModules, setDisabledModules] = useState<Set<string>>(new Set());

  // Team
  const { data: teamMembers, refetch: refetchTeam } = trpc.auth.listTeamMembers.useQuery();
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberPassword, setMemberPassword] = useState("");
  const [memberRole, setMemberRole] = useState<"admin" | "staff">("staff");
  const [memberError, setMemberError] = useState("");

  // Domains
  const { data: domains, refetch: refetchDomains } = trpc.tenant.domains.list.useQuery();
  const [newHostname, setNewHostname] = useState("");
  const [domainError, setDomainError] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => { setDisabledModules(getDisabledModules(params.slug)); }, [params.slug]);
  useEffect(() => {
    const saved = loadConfig(params.slug);
    if (saved.currency) setCurrency(saved.currency);
    if (saved.timezone) setTimezone(saved.timezone);
    if (saved.orderPrefix !== undefined) setOrderPrefix(saved.orderPrefix);
  }, [params.slug]);
  useEffect(() => {
    if (tenant) {
      setName(tenant.name);
      setEmail(tenant.email);
      setLogoUrl(tenant.logoUrl ?? "");
      setSocialFacebook(tenant.socialLinks?.facebook ?? "");
      setSocialInstagram(tenant.socialLinks?.instagram ?? "");
      setSocialTwitter(tenant.socialLinks?.twitter ?? "");
      setSocialTiktok(tenant.socialLinks?.tiktok ?? "");
      setSocialYoutube(tenant.socialLinks?.youtube ?? "");
      setSocialWhatsapp(tenant.socialLinks?.whatsapp ?? "");
      setContactPhone(tenant.contactInfo?.phone ?? "");
      setContactAddress(tenant.contactInfo?.address ?? "");
      setContactCity(tenant.contactInfo?.city ?? "");
      setContactCountry(tenant.contactInfo?.country ?? "");
      setContactSupportEmail(tenant.contactInfo?.supportEmail ?? "");
      setContactHours(tenant.contactInfo?.businessHours ?? "");
    }
  }, [tenant]);

  const updateTenantMutation = trpc.tenant.update.useMutation({
    onSuccess: () => { setStoreSaved(true); refetchTenant(); setTimeout(() => setStoreSaved(false), 3000); },
    onError: (err) => setStoreError(err.message),
  });

  const handleSaveStore = () => {
    setStoreError("");
    updateTenantMutation.mutate({ name: name.trim(), email: email.trim(), logoUrl: logoUrl.trim() || null });
  };

  const handleSaveSocials = () => {
    const socialLinks: Record<string, string> = {};
    if (socialFacebook.trim()) socialLinks.facebook = socialFacebook.trim();
    if (socialInstagram.trim()) socialLinks.instagram = socialInstagram.trim();
    if (socialTwitter.trim()) socialLinks.twitter = socialTwitter.trim();
    if (socialTiktok.trim()) socialLinks.tiktok = socialTiktok.trim();
    if (socialYoutube.trim()) socialLinks.youtube = socialYoutube.trim();
    if (socialWhatsapp.trim()) socialLinks.whatsapp = socialWhatsapp.trim();
    updateTenantMutation.mutate({ socialLinks }, {
      onSuccess: () => { setSocialSaved(true); setTimeout(() => setSocialSaved(false), 3000); },
    });
  };

  const handleSaveContact = () => {
    const contactInfo: Record<string, string> = {};
    if (contactPhone.trim()) contactInfo.phone = contactPhone.trim();
    if (contactAddress.trim()) contactInfo.address = contactAddress.trim();
    if (contactCity.trim()) contactInfo.city = contactCity.trim();
    if (contactCountry.trim()) contactInfo.country = contactCountry.trim();
    if (contactSupportEmail.trim()) contactInfo.supportEmail = contactSupportEmail.trim();
    if (contactHours.trim()) contactInfo.businessHours = contactHours.trim();
    updateTenantMutation.mutate({ contactInfo }, {
      onSuccess: () => { setContactSaved(true); setTimeout(() => setContactSaved(false), 3000); },
    });
  };

  const handleSaveConfig = () => {
    localStorage.setItem(LOCAL_SETTINGS_KEY(params.slug), JSON.stringify({ currency, timezone, orderPrefix }));
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 3000);
  };

  const toggleModule = (moduleName: string, enabled: boolean) => {
    setDisabledModules((prev) => {
      const next = new Set(prev);
      if (enabled) next.delete(moduleName); else next.add(moduleName);
      saveDisabledModules(params.slug, next);
      return next;
    });
  };

  const addDomainMutation = trpc.tenant.domains.add.useMutation({
    onSuccess: () => { setNewHostname(""); setDomainError(""); refetchDomains(); },
    onError: (err) => setDomainError(err.message),
  });
  const removeDomainMutation = trpc.tenant.domains.remove.useMutation({ onSuccess: () => refetchDomains() });
  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const addMemberMutation = trpc.auth.addTeamMember.useMutation({
    onSuccess: () => { setShowAddMember(false); setMemberName(""); setMemberEmail(""); setMemberPassword(""); setMemberError(""); refetchTeam(); },
    onError: (err) => setMemberError(err.message),
  });
  const updateRoleMutation = trpc.auth.updateTeamMemberRole.useMutation({ onSuccess: () => refetchTeam() });
  const removeMemberMutation = trpc.auth.removeTeamMember.useMutation({ onSuccess: () => refetchTeam() });

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your store configuration</p>
      </div>

      {/* Row 1: Store info + Social links */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Store Information */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <SectionHeader icon={Store} title="Store Information" />

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Field label="Store name *">
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Contact email *">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Logo URL">
                <input type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." className={inputCls} />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Store URL">
                <div className="flex items-center gap-2">
                  <input type="text" value={storeUrl.replace(/^https?:\/\//, "")} readOnly className={cn(inputCls, "bg-gray-50 text-gray-400 flex-1")} />
                  <a href={storeUrl} target="_blank" rel="noreferrer" className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </Field>
            </div>
          </div>

          {storeError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{storeError}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-gray-400">Plan: <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ml-1">{tenant?.plan ?? "free"}</span></span>
            <SaveButton onClick={handleSaveStore} pending={updateTenantMutation.isPending} saved={storeSaved} />
          </div>
        </div>

        {/* Social Links */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <SectionHeader icon={Share2} title="Social Links" subtitle="Shown in storefront footer" />

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Facebook", value: socialFacebook, setter: setSocialFacebook, placeholder: "facebook.com/…" },
              { label: "Instagram", value: socialInstagram, setter: setSocialInstagram, placeholder: "instagram.com/…" },
              { label: "Twitter / X", value: socialTwitter, setter: setSocialTwitter, placeholder: "x.com/…" },
              { label: "TikTok", value: socialTiktok, setter: setSocialTiktok, placeholder: "tiktok.com/@…" },
              { label: "YouTube", value: socialYoutube, setter: setSocialYoutube, placeholder: "youtube.com/@…" },
              { label: "WhatsApp", value: socialWhatsapp, setter: setSocialWhatsapp, placeholder: "wa.me/27…" },
            ].map(({ label, value, setter, placeholder }) => (
              <Field key={label} label={label}>
                <input type="url" value={value} onChange={(e) => setter(e.target.value)} placeholder={placeholder} className={inputCls} />
              </Field>
            ))}
          </div>

          <div className="flex justify-end pt-1">
            <SaveButton onClick={handleSaveSocials} pending={updateTenantMutation.isPending} saved={socialSaved} label="Save links" />
          </div>
        </div>
      </div>

      {/* Row 2: Contact Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <SectionHeader icon={Phone} title="Contact Info" subtitle="Shown on the Contact Us page of your storefront" />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Field label="Phone">
            <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+27 11 000 0000" className={inputCls} />
          </Field>
          <Field label="Support email">
            <input type="email" value={contactSupportEmail} onChange={(e) => setContactSupportEmail(e.target.value)} placeholder="support@yourstore.com" className={inputCls} />
          </Field>
          <Field label="Country">
            <input type="text" value={contactCountry} onChange={(e) => setContactCountry(e.target.value)} placeholder="South Africa" className={inputCls} />
          </Field>
          <Field label="City">
            <input type="text" value={contactCity} onChange={(e) => setContactCity(e.target.value)} placeholder="Cape Town" className={inputCls} />
          </Field>
          <div className="col-span-2">
            <Field label="Street address">
              <input type="text" value={contactAddress} onChange={(e) => setContactAddress(e.target.value)} placeholder="123 Main Street" className={inputCls} />
            </Field>
          </div>
          <div className="col-span-2 sm:col-span-3">
            <Field label="Business hours">
              <textarea
                rows={2} value={contactHours} onChange={(e) => setContactHours(e.target.value)}
                placeholder={"Mon–Fri: 9am – 5pm\nSat: 9am – 1pm"}
                className={`${inputCls} resize-none`}
              />
            </Field>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <SaveButton onClick={handleSaveContact} pending={updateTenantMutation.isPending} saved={contactSaved} label="Save contact info" />
        </div>
      </div>

      {/* Row 3: Regional + Domains */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Regional */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <SectionHeader icon={Settings2} title="Regional Settings" subtitle="Currency and timezone" />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Currency">
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Order prefix">
              <input type="text" value={orderPrefix} onChange={(e) => setOrderPrefix(e.target.value)} placeholder="ORD-" className={inputCls} />
            </Field>
            <div className="col-span-2">
              <Field label="Timezone">
                <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={inputCls}>
                  {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </Field>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <SaveButton onClick={handleSaveConfig} pending={false} saved={configSaved} />
          </div>
        </div>

        {/* Custom Domains */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <SectionHeader icon={Globe} title="Custom Domains" subtitle="Point your own domain to this store" />

          <div className="flex gap-2">
            <input
              type="text" value={newHostname}
              onChange={(e) => setNewHostname(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && newHostname.trim()) addDomainMutation.mutate({ hostname: newHostname.trim() }); }}
              placeholder="shop.yourdomain.com"
              className={inputCls}
            />
            <button
              onClick={() => { if (newHostname.trim()) addDomainMutation.mutate({ hostname: newHostname.trim() }); }}
              disabled={addDomainMutation.isPending || !newHostname.trim()}
              className="flex items-center gap-1 bg-gray-900 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors flex-shrink-0"
            >
              {addDomainMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Add
            </button>
          </div>

          {domainError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{domainError}
            </div>
          )}

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {(domains?.length ?? 0) === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No custom domains yet</p>
            ) : domains?.map((domain) => (
              <div key={domain.id} className="flex items-start gap-3 p-3 border border-gray-100 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-900">{domain.hostname}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${domain.verified ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {domain.verified ? "Verified" : "Pending"}
                    </span>
                  </div>
                  {!domain.verified && domain.verificationToken && (
                    <div className="mt-1.5 flex items-center gap-2 bg-gray-50 rounded border border-gray-200 px-2 py-1">
                      <code className="text-xs font-mono text-gray-600 flex-1 truncate">kstack-verify={domain.verificationToken}</code>
                      <button onClick={() => copyToken(domain.verificationToken!)} className="text-gray-400 hover:text-gray-700">
                        {copiedToken === domain.verificationToken ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={async () => {
                    const ok = await confirm({ title: "Remove domain", message: `Remove ${domain.hostname}?`, danger: true });
                    if (!ok) return;
                    removeDomainMutation.mutate({ id: domain.id });
                  }}
                  className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 4: Modules */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <SectionHeader icon={Puzzle} title="Modules" subtitle="Enable or disable features — changes take effect immediately, no data is deleted" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
          {MODULES.map((mod) => {
            const enabled = mod.core || !disabledModules.has(mod.name);
            return (
              <div key={mod.name} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                <div className="flex-1 min-w-0 mr-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-gray-900">{mod.label}</span>
                    {mod.core && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-gray-400 bg-gray-100 px-1 py-0.5 rounded">
                        <Lock className="w-2 h-2" /> Core
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 leading-tight">{mod.description}</p>
                </div>
                <button
                  type="button" disabled={mod.core}
                  onClick={() => toggleModule(mod.name, !enabled)}
                  className={cn("relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40", enabled ? "bg-blue-600" : "bg-gray-200")}
                  aria-checked={enabled} role="switch"
                >
                  <span className={cn("pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200", enabled ? "translate-x-4" : "translate-x-0")} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Row 5: Team Members */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <div className="flex items-center justify-between pb-3 mb-1 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gray-100 rounded-lg"><Users className="w-3.5 h-3.5 text-gray-600" /></div>
            <div>
              <h2 className="font-semibold text-gray-900 text-sm">Team Members</h2>
              <p className="text-xs text-gray-400">People with dashboard access</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddMember((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
          >
            {showAddMember ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {showAddMember ? "Cancel" : "Add member"}
          </button>
        </div>

        {showAddMember && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full name">
                <input type="text" value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="Jane Smith" className={inputCls} />
              </Field>
              <Field label="Email">
                <input type="email" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} placeholder="jane@example.com" className={inputCls} />
              </Field>
              <Field label="Password">
                <input type="password" value={memberPassword} onChange={(e) => setMemberPassword(e.target.value)} placeholder="Min 6 characters" className={inputCls} />
              </Field>
              <Field label="Role">
                <select value={memberRole} onChange={(e) => setMemberRole(e.target.value as "admin" | "staff")} className={inputCls}>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </Field>
            </div>
            {memberError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{memberError}
              </div>
            )}
            <button
              onClick={() => { setMemberError(""); addMemberMutation.mutate({ name: memberName.trim(), email: memberEmail.trim(), password: memberPassword, role: memberRole }); }}
              disabled={addMemberMutation.isPending || !memberName.trim() || !memberEmail.trim() || !memberPassword}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {addMemberMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Add to team
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {!teamMembers || teamMembers.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4 col-span-2">No team members yet</p>
          ) : teamMembers.map((member) => (
            <div key={member.muId} className="flex items-center gap-2.5 p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
              <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
                {(member.name[0] ?? "?").toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-gray-900 truncate">{member.name}</span>
                  {member.role === "owner" && <Crown className="w-3 h-3 text-yellow-500 flex-shrink-0" />}
                  {member.role === "admin" && <ShieldCheck className="w-3 h-3 text-blue-500 flex-shrink-0" />}
                </div>
                <p className="text-xs text-gray-400 truncate">{member.email}</p>
              </div>
              {member.role !== "owner" ? (
                <select
                  value={member.role}
                  onChange={(e) => updateRoleMutation.mutate({ muId: member.muId, role: e.target.value as "admin" | "staff" })}
                  className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white focus:outline-none"
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              ) : (
                <span className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-100 px-2 py-0.5 rounded">Owner</span>
              )}
              {member.role !== "owner" && (
                <button
                  onClick={async () => {
                    const ok = await confirm({ title: "Remove member", message: `Remove ${member.name}?`, danger: true });
                    if (!ok) return;
                    removeMemberMutation.mutate({ muId: member.muId });
                  }}
                  className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                >
                  <UserMinus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-white rounded-xl border border-red-100 p-5">
        <h2 className="text-sm font-semibold text-red-600 mb-1">Danger Zone</h2>
        <p className="text-xs text-gray-400 mb-3">These actions are permanent and cannot be undone.</p>
        <button
          className="flex items-center gap-2 border border-red-200 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors"
          onClick={() => alert("Contact support to delete your store.")}
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete store
        </button>
      </div>
    </div>
  );
}
