"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Bot,
  Key,
  Zap,
  MessageSquare,
  Sparkles,
  CheckCircle,
  XCircle,
  Loader2,
  Send,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { useParams } from "next/navigation";

type Tab = "settings" | "descriptions" | "chat";

export default function AIAssistantPage() {
  const { slug } = useParams<{ slug: string }>();
  const [tab, setTab] = useState<Tab>("settings");

  // ── Settings ────────────────────────────────────────────────────────────────
  const { data: settings, refetch: refetchSettings } = trpc.aiAssistant.settings.get.useQuery();
  const updateSettings = trpc.aiAssistant.settings.update.useMutation({
    onSuccess: () => { refetchSettings(); setSaved(true); setTimeout(() => setSaved(false), 3000); },
  });
  const testConnection = trpc.aiAssistant.settings.testConnection.useMutation();

  const [provider, setProvider] = useState<"anthropic" | "openai" | "gemini" | "custom">("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [customBaseUrl, setCustomBaseUrl] = useState("");
  const [chatEnabled, setChatEnabled] = useState(false);
  const [descriptionsEnabled, setDescriptionsEnabled] = useState(true);
  const [recommendationsEnabled, setRecommendationsEnabled] = useState(true);
  const [systemPromptExtra, setSystemPromptExtra] = useState("");
  const [saved, setSaved] = useState(false);

  const PROVIDER_CONFIG = {
    anthropic: {
      label: "Anthropic (Claude)",
      placeholder: "sk-ant-api03-...",
      models: ["claude-haiku-4-5-20251001", "claude-sonnet-4-6", "claude-opus-4-6"],
      defaultModel: "claude-haiku-4-5-20251001",
      docsLabel: "console.anthropic.com",
    },
    openai: {
      label: "OpenAI (GPT)",
      placeholder: "sk-...",
      models: ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"],
      defaultModel: "gpt-4o-mini",
      docsLabel: "platform.openai.com",
    },
    gemini: {
      label: "Google Gemini",
      placeholder: "AIza...",
      models: ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"],
      defaultModel: "gemini-2.0-flash",
      docsLabel: "aistudio.google.com",
    },
    custom: {
      label: "Custom (OpenAI-compatible)",
      placeholder: "your-api-key",
      models: ["gpt-4o-mini", "llama3-8b-8192", "mistral-small-latest", "llama-3.1-70b-versatile"],
      defaultModel: "gpt-4o-mini",
      docsLabel: "your provider's docs",
    },
  } as const;

  useEffect(() => {
    if (settings) {
      setProvider((settings as any).provider ?? "anthropic");
      setModel((settings as any).model ?? "");
      setCustomBaseUrl((settings as any).customBaseUrl ?? "");
      setChatEnabled(settings.chatEnabled);
      setDescriptionsEnabled(settings.descriptionsEnabled);
      setRecommendationsEnabled(settings.recommendationsEnabled);
      setSystemPromptExtra(settings.systemPromptExtra ?? "");
    }
  }, [settings]);

  const handleSaveSettings = () => {
    updateSettings.mutate({
      provider,
      ...(apiKey ? { apiKey } : {}),
      model: model || undefined,
      customBaseUrl: customBaseUrl || undefined,
      chatEnabled,
      descriptionsEnabled,
      recommendationsEnabled,
      systemPromptExtra,
    });
    setApiKey("");
  };

  // ── Descriptions ────────────────────────────────────────────────────────────
  const { data: products } = trpc.products.list.useQuery();
  const generateDesc = trpc.aiAssistant.generateDescription.useMutation({
    onSuccess: () => refetchProducts(),
  });
  const { refetch: refetchProducts } = trpc.products.list.useQuery();
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const handleGenerate = async (productId: string) => {
    setGeneratingId(productId);
    try {
      await generateDesc.mutateAsync({ productId });
    } finally {
      setGeneratingId(null);
    }
  };

  // ── Chat preview ────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sessionToken, setSessionToken] = useState<string | undefined>();
  const chatMutation = trpc.aiAssistant.chat.useMutation();

  // Get tenantId for public chat calls
  const { data: tenant } = trpc.tenant.get.useQuery();

  const handleChatSend = async () => {
    if (!chatInput.trim() || !tenant?.id) return;
    const msg = chatInput.trim();
    setChatInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    const res = await chatMutation.mutateAsync({
      tenantId: tenant.id,
      message: msg,
      sessionToken,
    });
    setSessionToken(res.sessionToken ?? undefined);
    setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
  };

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "settings", label: "Settings", icon: <Key className="w-4 h-4" /> },
    { id: "descriptions", label: "Product Descriptions", icon: <Sparkles className="w-4 h-4" /> },
    { id: "chat", label: "Chat Preview", icon: <MessageSquare className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
          <Bot className="w-5 h-5 text-violet-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">AI Assistant</h1>
          <p className="text-sm text-gray-500">Product descriptions, chatbot & recommendations — powered by your choice of AI</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-6 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Settings tab ───────────────────────────────────────────────────── */}
      {tab === "settings" && (
        <div className="space-y-5">
          {/* Provider + API Key + Model */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
              <Key className="w-4 h-4 text-gray-500" />
              <h2 className="font-semibold text-gray-900">AI Provider</h2>
              {settings?.hasKey && (
                <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  Key saved
                </span>
              )}
            </div>

            {/* Provider selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
              <div className="grid grid-cols-2 gap-2">
                {(["anthropic", "openai", "gemini", "custom"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => { setProvider(p); setModel(""); }}
                    className={`py-2.5 px-3 rounded-lg border text-sm font-medium transition-colors ${
                      provider === p
                        ? "border-violet-500 bg-violet-50 text-violet-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {PROVIDER_CONFIG[p].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom base URL — only shown for custom provider */}
            {provider === "custom" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
                <input
                  type="url"
                  value={customBaseUrl}
                  onChange={(e) => setCustomBaseUrl(e.target.value)}
                  placeholder="https://api.groq.com/openai/v1"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Any OpenAI-compatible endpoint — Groq, Mistral, Ollama, Together AI, etc.
                </p>
              </div>
            )}

            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key {settings?.hasKey && <span className="text-gray-400 font-normal">(leave blank to keep existing)</span>}
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={settings?.apiKey ?? PROVIDER_CONFIG[provider].placeholder}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
              />
              <p className="text-xs text-gray-400 mt-1">
                Get your key from{" "}
                <span className="text-violet-600 font-medium">{PROVIDER_CONFIG[provider].docsLabel}</span>
              </p>
            </div>

            {/* Model */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model <span className="text-gray-400 font-normal">(optional — uses default if blank)</span>
              </label>
              <input
                list={`model-suggestions-${provider}`}
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={PROVIDER_CONFIG[provider].defaultModel}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
              />
              <datalist id={`model-suggestions-${provider}`}>
                {PROVIDER_CONFIG[provider].models.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => testConnection.mutate()}
                disabled={testConnection.isPending || !settings?.hasKey}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {testConnection.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Test connection
              </button>
              {testConnection.data && (
                <span className={`flex items-center gap-1 text-sm font-medium ${testConnection.data.ok ? "text-green-600" : "text-red-500"}`}>
                  {testConnection.data.ok
                    ? <><CheckCircle className="w-4 h-4" /> Connected</>
                    : <><XCircle className="w-4 h-4" /> {testConnection.data.error}</>}
                </span>
              )}
            </div>
          </div>

          {/* Feature toggles */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
              <Zap className="w-4 h-4 text-gray-500" />
              <h2 className="font-semibold text-gray-900">Features</h2>
            </div>

            {[
              { key: "chatEnabled", label: "Storefront Chat Widget", desc: "Show AI chat bubble on your store for customer support", value: chatEnabled, set: setChatEnabled },
              { key: "descriptionsEnabled", label: "AI Product Descriptions", desc: "Generate and auto-save product descriptions with one click", value: descriptionsEnabled, set: setDescriptionsEnabled },
              { key: "recommendationsEnabled", label: "Product Recommendations", desc: "Show 'You might also like' section on product pages", value: recommendationsEnabled, set: setRecommendationsEnabled },
            ].map((f) => (
              <div key={f.key} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{f.label}</p>
                  <p className="text-xs text-gray-500">{f.desc}</p>
                </div>
                <button
                  onClick={() => f.set(!f.value)}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${f.value ? "bg-violet-600" : "bg-gray-200"}`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${f.value ? "translate-x-4" : "translate-x-0"}`} />
                </button>
              </div>
            ))}
          </div>

          {/* System prompt extra */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
              <Bot className="w-4 h-4 text-gray-500" />
              <h2 className="font-semibold text-gray-900">Custom Instructions</h2>
              <span className="text-xs text-gray-400">optional</span>
            </div>
            <textarea
              value={systemPromptExtra}
              onChange={(e) => setSystemPromptExtra(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="e.g. Always respond in formal English. Our return policy is 30 days no questions asked."
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
            <p className="text-xs text-gray-400">{systemPromptExtra.length}/500 — appended to the chatbot's system prompt</p>
          </div>

          {saved && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
              <CheckCircle className="w-4 h-4" /> Settings saved
            </div>
          )}

          <button
            onClick={handleSaveSettings}
            disabled={updateSettings.isPending}
            className="flex items-center gap-2 bg-violet-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
          >
            {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Save settings
          </button>
        </div>
      )}

      {/* ── Descriptions tab ────────────────────────────────────────────────── */}
      {tab === "descriptions" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Product Descriptions</h2>
              <p className="text-xs text-gray-500 mt-0.5">Click Generate to auto-write and save a description</p>
            </div>
            {!settings?.descriptionsEnabled && (
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
                Descriptions disabled in settings
              </span>
            )}
          </div>

          {!products?.length ? (
            <div className="p-10 text-center text-gray-400 text-sm">No products found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Product</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Description</th>
                  <th className="px-5 py-3 w-28" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900 whitespace-nowrap">{p.title}</td>
                    <td className="px-5 py-3 text-gray-500 max-w-xs">
                      {p.description
                        ? <span className="line-clamp-2">{p.description}</span>
                        : <span className="italic text-gray-300">No description</span>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleGenerate(p.id)}
                        disabled={generatingId === p.id || !settings?.hasKey}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200 rounded-lg hover:bg-violet-100 disabled:opacity-50 ml-auto"
                      >
                        {generatingId === p.id
                          ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating...</>
                          : <><Sparkles className="w-3 h-3" /> {p.description ? "Regenerate" : "Generate"}</>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Chat preview tab ─────────────────────────────────────────────────── */}
      {tab === "chat" && (
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-[540px]">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Chat Preview</h2>
              <p className="text-xs text-gray-500 mt-0.5">Test your AI chatbot as a customer would see it</p>
            </div>
            <button
              onClick={() => { setMessages([]); setSessionToken(undefined); }}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
            >
              <RefreshCw className="w-3.5 h-3.5" /> New session
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
                <Bot className="w-8 h-8 text-gray-300" />
                <p>Send a message to test the chatbot</p>
                {!settings?.hasKey && (
                  <p className="text-amber-500 text-xs">⚠ Configure an API key in Settings first</p>
                )}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === "user"
                      ? "bg-violet-600 text-white rounded-br-sm"
                      : "bg-gray-100 text-gray-800 rounded-bl-sm"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {chatMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-2.5 flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
                placeholder="Ask something about the store..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <button
                onClick={handleChatSend}
                disabled={!chatInput.trim() || chatMutation.isPending}
                className="p-2.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
