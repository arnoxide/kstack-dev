"use client";

import { use, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";

type Provider =
  | "stripe" | "payfast" | "yoco" | "paypal"
  | "the_courier_guy" | "aramex" | "dhl" | "fastway"
  | "mailchimp" | "klaviyo" | "sendgrid"
  | "google_analytics" | "facebook_pixel" | "hotjar" | "tiktok_pixel";

interface IntegrationMeta {
  provider: Provider;
  name: string;
  description: string;
  logo: string;
  fields: { key: string; label: string; placeholder: string; secret?: boolean }[];
}

const INTEGRATIONS: { category: string; items: IntegrationMeta[] }[] = [
  {
    category: "Payments",
    items: [
      {
        provider: "stripe",
        name: "Stripe",
        description: "Accept credit cards, Apple Pay and more worldwide.",
        logo: "https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg",
        fields: [
          { key: "publishableKey", label: "Publishable Key", placeholder: "pk_live_..." },
          { key: "secretKey", label: "Secret Key", placeholder: "sk_live_...", secret: true },
          { key: "webhookSecret", label: "Webhook Secret", placeholder: "whsec_...", secret: true },
        ],
      },
      {
        provider: "payfast",
        name: "PayFast",
        description: "South Africa's leading payment gateway.",
        logo: "https://www.payfast.co.za/assets/logo/payfast-logo.svg",
        fields: [
          { key: "merchantId", label: "Merchant ID", placeholder: "10000100" },
          { key: "merchantKey", label: "Merchant Key", placeholder: "46f0cd694581a", secret: true },
          { key: "passphrase", label: "Passphrase", placeholder: "optional passphrase", secret: true },
          { key: "sandbox", label: "Sandbox Mode (true/false)", placeholder: "false" },
        ],
      },
      {
        provider: "yoco",
        name: "Yoco",
        description: "Simple card payments for South African businesses.",
        logo: "https://www.yoco.com/wp-content/themes/yoco/assets/images/yoco-logo.svg",
        fields: [
          { key: "publicKey", label: "Public Key", placeholder: "pk_live_..." },
          { key: "secretKey", label: "Secret Key", placeholder: "sk_live_...", secret: true },
        ],
      },
      {
        provider: "paypal",
        name: "PayPal",
        description: "Accept PayPal and card payments globally.",
        logo: "https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg",
        fields: [
          { key: "clientId", label: "Client ID", placeholder: "AaBbCc..." },
          { key: "clientSecret", label: "Client Secret", placeholder: "EeFfGg...", secret: true },
          { key: "sandbox", label: "Sandbox Mode (true/false)", placeholder: "false" },
        ],
      },
    ],
  },
  {
    category: "Shipping",
    items: [
      {
        provider: "the_courier_guy",
        name: "The Courier Guy",
        description: "Door-to-door courier service across South Africa.",
        logo: "",
        fields: [
          { key: "username", label: "Username", placeholder: "your username" },
          { key: "password", label: "Password", placeholder: "your password", secret: true },
          { key: "accountNumber", label: "Account Number", placeholder: "123456" },
        ],
      },
      {
        provider: "aramex",
        name: "Aramex",
        description: "International shipping and logistics.",
        logo: "https://upload.wikimedia.org/wikipedia/commons/7/7a/Aramex_Logo.svg",
        fields: [
          { key: "username", label: "Username", placeholder: "aramex username" },
          { key: "password", label: "Password", placeholder: "aramex password", secret: true },
          { key: "accountNumber", label: "Account Number", placeholder: "ACC123" },
          { key: "accountPin", label: "Account PIN", placeholder: "0000", secret: true },
        ],
      },
      {
        provider: "dhl",
        name: "DHL",
        description: "Express international and domestic deliveries.",
        logo: "https://upload.wikimedia.org/wikipedia/commons/a/a4/DHL_Logo.svg",
        fields: [
          { key: "apiKey", label: "API Key", placeholder: "your DHL API key", secret: true },
          { key: "accountNumber", label: "Account Number", placeholder: "123456789" },
        ],
      },
      {
        provider: "fastway",
        name: "Fastway Couriers",
        description: "Affordable courier services in Southern Africa.",
        logo: "",
        fields: [
          { key: "apiKey", label: "API Key", placeholder: "your Fastway API key", secret: true },
          { key: "franchiseCode", label: "Franchise Code", placeholder: "CPT" },
        ],
      },
    ],
  },
  {
    category: "Marketing & Email",
    items: [
      {
        provider: "mailchimp",
        name: "Mailchimp",
        description: "Email marketing and automation platform.",
        logo: "https://upload.wikimedia.org/wikipedia/commons/9/97/Mailchimp-logo.svg",
        fields: [
          { key: "apiKey", label: "API Key", placeholder: "xxxx-us1", secret: true },
          { key: "listId", label: "Audience / List ID", placeholder: "abc123def4" },
        ],
      },
      {
        provider: "klaviyo",
        name: "Klaviyo",
        description: "Email and SMS marketing for e-commerce.",
        logo: "https://www.klaviyo.com/wp-content/uploads/2023/02/klaviyo-logo.svg",
        fields: [
          { key: "publicKey", label: "Public API Key", placeholder: "XXXXXX" },
          { key: "privateKey", label: "Private API Key", placeholder: "pk_...", secret: true },
        ],
      },
      {
        provider: "sendgrid",
        name: "SendGrid",
        description: "Transactional and marketing email delivery.",
        logo: "https://upload.wikimedia.org/wikipedia/commons/9/9b/Twilio_SendGrid_Logo.svg",
        fields: [
          { key: "apiKey", label: "API Key", placeholder: "SG.xxxx", secret: true },
          { key: "fromEmail", label: "From Email", placeholder: "no-reply@yourdomain.com" },
          { key: "fromName", label: "From Name", placeholder: "Your Store" },
        ],
      },
    ],
  },
  {
    category: "Analytics & Tracking",
    items: [
      {
        provider: "google_analytics",
        name: "Google Analytics",
        description: "Track website traffic and user behaviour.",
        logo: "https://upload.wikimedia.org/wikipedia/commons/7/77/GAnalytics.svg",
        fields: [
          { key: "measurementId", label: "Measurement ID (GA4)", placeholder: "G-XXXXXXXXXX" },
        ],
      },
      {
        provider: "facebook_pixel",
        name: "Facebook Pixel",
        description: "Track conversions and build ad audiences.",
        logo: "https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg",
        fields: [
          { key: "pixelId", label: "Pixel ID", placeholder: "1234567890123456" },
          { key: "accessToken", label: "Conversions API Token", placeholder: "EAAx...", secret: true },
        ],
      },
      {
        provider: "hotjar",
        name: "Hotjar",
        description: "Heatmaps, recordings and user feedback.",
        logo: "https://upload.wikimedia.org/wikipedia/commons/8/8e/Hotjar_logo.svg",
        fields: [
          { key: "siteId", label: "Site ID", placeholder: "1234567" },
        ],
      },
      {
        provider: "tiktok_pixel",
        name: "TikTok Pixel",
        description: "Track events for TikTok ad campaigns.",
        logo: "https://upload.wikimedia.org/wikipedia/en/a/a9/TikTok_logo.svg",
        fields: [
          { key: "pixelId", label: "Pixel ID", placeholder: "CXXXXXXXXXXXXXXXXX" },
          { key: "accessToken", label: "Events API Token", placeholder: "your-token", secret: true },
        ],
      },
    ],
  },
];

function IntegrationCard({
  meta,
  existing,
  onSave,
  onDisable,
}: {
  meta: IntegrationMeta;
  existing?: { isEnabled: boolean; config: Record<string, string> } | null;
  onSave: (provider: Provider, config: Record<string, string>) => void;
  onDisable: (provider: Provider) => void;
}) {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<Record<string, string>>(existing?.config ?? {});
  const isConnected = existing?.isEnabled === true;

  const handleSave = () => {
    onSave(meta.provider, config);
    setOpen(false);
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Header row */}
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg bg-gray-50 border border-gray-100 overflow-hidden">
          {meta.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={meta.logo} alt={meta.name} className="w-8 h-8 object-contain" />
          ) : (
            <span className="text-lg font-bold text-gray-400">{meta.name[0]}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm text-gray-900">{meta.name}</p>
            {isConnected && (
              <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                <CheckCircle className="w-3 h-3" /> Connected
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{meta.description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isConnected && (
            <button
              onClick={() => onDisable(meta.provider)}
              className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors"
            >
              Disconnect
            </button>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            {isConnected ? "Configure" : "Connect"}
            {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Expandable config form */}
      {open && (
        <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 space-y-3">
          {meta.fields.map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {field.label}
              </label>
              <input
                type={field.secret ? "password" : "text"}
                value={config[field.key] ?? ""}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
                placeholder={field.placeholder}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setOpen(false)}
              className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg transition-colors font-medium"
            >
              Save & Enable
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CustomIntegrationCard({
  existing,
  onSave,
  onDisable,
}: {
  existing?: { provider: string; isEnabled: boolean; config: Record<string, string> } | null;
  onSave: (provider: string, config: Record<string, string>) => void;
  onDisable: (provider: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(existing?.config._name ?? "");
  const [logo, setLogo] = useState(existing?.config._logo ?? "");
  const [pairs, setPairs] = useState<{ key: string; value: string }[]>(
    existing
      ? Object.entries(existing.config)
          .filter(([k]) => k !== "_name" && k !== "_logo")
          .map(([key, value]) => ({ key, value }))
      : [{ key: "", value: "" }],
  );

  const isConnected = existing?.isEnabled === true;

  const addPair = () => setPairs((p) => [...p, { key: "", value: "" }]);
  const removePair = (i: number) => setPairs((p) => p.filter((_, idx) => idx !== i));
  const updatePair = (i: number, field: "key" | "value", val: string) =>
    setPairs((p) => p.map((pair, idx) => (idx === i ? { ...pair, [field]: val } : pair)));

  const handleSave = () => {
    if (!name.trim()) return;
    const provider = `custom_${name.trim().toLowerCase().replace(/\s+/g, "_")}`;
    const config: Record<string, string> = { _name: name.trim() };
    if (logo.trim()) config._logo = logo.trim();
    for (const { key, value } of pairs) {
      if (key.trim()) config[key.trim()] = value;
    }
    onSave(provider, config);
    setOpen(false);
  };

  return (
    <div className="border border-dashed border-gray-300 rounded-xl overflow-hidden bg-white">
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg bg-gray-50 border border-gray-200 overflow-hidden">
          {existing?.config._logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={existing.config._logo} alt={existing.config._name ?? ""} className="w-8 h-8 object-contain" />
          ) : (
            <Plus className="w-5 h-5 text-gray-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm text-gray-900">
              {existing ? existing.config._name || existing.provider : "Custom Integration"}
            </p>
            {isConnected && (
              <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                <CheckCircle className="w-3 h-3" /> Connected
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {existing ? existing.provider : "Add any service not listed above"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isConnected && existing && (
            <button
              onClick={() => onDisable(existing.provider)}
              className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors"
            >
              Remove
            </button>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            {isConnected ? "Edit" : "Add"}
            {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Integration Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. My Custom CRM"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Logo URL <span className="text-gray-400">(optional)</span>
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="url"
                  value={logo}
                  onChange={(e) => setLogo(e.target.value)}
                  placeholder="https://example.com/logo.svg"
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                {logo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt="" className="w-8 h-8 rounded object-contain border border-gray-200 bg-white flex-shrink-0" />
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-700">Config Fields</p>
            {pairs.map((pair, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={pair.key}
                  onChange={(e) => updatePair(i, "key", e.target.value)}
                  placeholder="Key (e.g. apiKey)"
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <input
                  type="text"
                  value={pair.value}
                  onChange={(e) => updatePair(i, "value", e.target.value)}
                  placeholder="Value"
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <button
                  onClick={() => removePair(i)}
                  className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              onClick={addPair}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
            >
              <Plus className="w-3 h-3" /> Add field
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setOpen(false)}
              className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim()}
              className="text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-4 py-1.5 rounded-lg transition-colors font-medium"
            >
              Save & Enable
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function IntegrationsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { data: integrationsList, refetch } = trpc.integrations.list.useQuery();
  const upsert = trpc.integrations.upsert.useMutation({ onSuccess: () => refetch() });
  const disable = trpc.integrations.disable.useMutation({ onSuccess: () => refetch() });

  const existingMap = new Map(
    (integrationsList ?? []).map((i) => [i.provider, i]),
  );

  const handleSave = (provider: string, config: Record<string, string>) => {
    upsert.mutate({ provider, isEnabled: true, config });
  };

  const handleDisable = (provider: string) => {
    disable.mutate({ provider });
  };

  const connectedCount = (integrationsList ?? []).filter((i) => i.isEnabled).length;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="text-sm text-gray-500 mt-1">
          Connect third-party services to extend your store.
          {connectedCount > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
              <CheckCircle className="w-3 h-3" />
              {connectedCount} active
            </span>
          )}
        </p>
      </div>

      {(upsert.isPending || disable.isPending) && (
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          Saving…
        </div>
      )}

      {upsert.isError && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          {upsert.error.message}
        </div>
      )}

      {INTEGRATIONS.map((group) => (
        <section key={group.category} className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {group.category}
          </h2>
          <div className="space-y-2">
            {group.items.map((meta) => (
              <IntegrationCard
                key={meta.provider}
                meta={meta}
                existing={existingMap.get(meta.provider)}
                onSave={handleSave}
                onDisable={handleDisable}
              />
            ))}
          </div>
        </section>
      ))}

      {/* Custom integrations */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Custom
        </h2>
        <div className="space-y-2">
          {/* Existing custom ones */}
          {(integrationsList ?? [])
            .filter((i) => i.provider.startsWith("custom_"))
            .map((i) => (
              <CustomIntegrationCard
                key={i.provider}
                existing={i}
                onSave={handleSave}
                onDisable={handleDisable}
              />
            ))}
          {/* Add new custom */}
          <CustomIntegrationCard
            existing={null}
            onSave={handleSave}
            onDisable={handleDisable}
          />
        </div>
      </section>
    </div>
  );
}
