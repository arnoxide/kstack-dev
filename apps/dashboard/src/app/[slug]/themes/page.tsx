"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Palette, Check, Loader2, ExternalLink, Plus, Zap } from "lucide-react";
import { useParams } from "next/navigation";

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-9 h-9 rounded-lg border border-gray-300 cursor-pointer p-0.5 bg-white"
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900"
          maxLength={7}
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

export default function ThemesPage() {
  const params = useParams<{ slug: string }>();
  const { data: themes, isLoading, refetch } = trpc.storefront.themes.list.useQuery();

  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    primaryColor: "#111827",
    secondaryColor: "#ffffff",
    accentColor: "#f59e0b",
    fontHeading: "Inter",
    fontBody: "Inter",
    borderRadius: "0.5rem",
  });
  const [saved, setSaved] = useState(false);

  const activeTheme = themes?.find((t) => t.isActive);
  const selectedTheme = themes?.find((t) => t.id === selectedThemeId);

  useEffect(() => {
    if (themes && themes.length > 0 && !selectedThemeId) {
      const active = themes.find((t) => t.isActive) ?? themes[0];
      setSelectedThemeId(active.id);
      setSettings(active.settings);
    }
  }, [themes, selectedThemeId]);

  useEffect(() => {
    if (selectedTheme) {
      setSettings(selectedTheme.settings);
    }
  }, [selectedThemeId]);

  const activateMutation = trpc.storefront.themes.activate.useMutation({
    onSuccess: () => refetch(),
  });

  const updateSettingsMutation = trpc.storefront.themes.updateSettings.useMutation({
    onSuccess: () => { setSaved(true); refetch(); setTimeout(() => setSaved(false), 3000); },
  });

  const createMutation = trpc.storefront.themes.create.useMutation({
    onSuccess: (theme) => { refetch(); setSelectedThemeId(theme.id); },
  });

  const handleSaveSettings = () => {
    if (!selectedThemeId) return;
    updateSettingsMutation.mutate({ id: selectedThemeId, settings });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Themes</h1>
          <p className="text-gray-600 mt-1">Customise your store's appearance</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`http://localhost:3003/${params.slug}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Preview store
          </a>
          <button
            onClick={() => createMutation.mutate({ name: `Theme ${(themes?.length ?? 0) + 1}` })}
            disabled={createMutation.isPending}
            className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New theme
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Theme list */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Your Themes</h2>
          {!themes || themes.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <Palette className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No themes yet</p>
            </div>
          ) : (
            themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setSelectedThemeId(theme.id)}
                className={`w-full text-left bg-white rounded-xl border p-4 transition-colors ${
                  selectedThemeId === theme.id
                    ? "border-gray-900 ring-1 ring-gray-900"
                    : "border-gray-200 hover:border-gray-400"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Color preview */}
                    <div className="flex gap-1">
                      <div
                        className="w-4 h-4 rounded-full border border-gray-200"
                        style={{ backgroundColor: theme.settings.primaryColor }}
                      />
                      <div
                        className="w-4 h-4 rounded-full border border-gray-200"
                        style={{ backgroundColor: theme.settings.accentColor }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900">{theme.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {theme.isActive && (
                      <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        <Zap className="w-3 h-3" />
                        Active
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Settings editor */}
        {selectedTheme && (
          <div className="lg:col-span-2 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                Editing: {selectedTheme.name}
              </h2>
              {!selectedTheme.isActive && (
                <button
                  onClick={() => activateMutation.mutate({ id: selectedTheme.id })}
                  disabled={activateMutation.isPending}
                  className="flex items-center gap-1.5 text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium transition-colors"
                >
                  <Zap className="w-3.5 h-3.5" />
                  {activateMutation.isPending ? "Activating..." : "Activate theme"}
                </button>
              )}
            </div>

            {/* Colors */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Colours</h3>
              <div className="grid grid-cols-2 gap-4">
                <ColorInput
                  label="Primary (Hero / Navbar)"
                  value={settings.primaryColor}
                  onChange={(v) => setSettings((s) => ({ ...s, primaryColor: v }))}
                />
                <ColorInput
                  label="Secondary"
                  value={settings.secondaryColor}
                  onChange={(v) => setSettings((s) => ({ ...s, secondaryColor: v }))}
                />
                <ColorInput
                  label="Accent (Buttons / Links)"
                  value={settings.accentColor}
                  onChange={(v) => setSettings((s) => ({ ...s, accentColor: v }))}
                />
              </div>
            </div>

            {/* Typography */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Typography</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Heading font</label>
                  <select
                    value={settings.fontHeading}
                    onChange={(e) => setSettings((s) => ({ ...s, fontHeading: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  >
                    {["Inter", "Playfair Display", "Montserrat", "Raleway", "Lato", "Georgia"].map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Body font</label>
                  <select
                    value={settings.fontBody}
                    onChange={(e) => setSettings((s) => ({ ...s, fontBody: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  >
                    {["Inter", "Roboto", "Open Sans", "Lato", "Source Sans Pro", "Georgia"].map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Shape */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Shape</h3>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Border radius</label>
                <div className="flex gap-3">
                  {[
                    { label: "Sharp", value: "0" },
                    { label: "Rounded", value: "0.5rem" },
                    { label: "Pill", value: "9999px" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSettings((s) => ({ ...s, borderRadius: opt.value }))}
                      className={`flex-1 py-2 text-sm font-medium border rounded-lg transition-colors ${
                        settings.borderRadius === opt.value
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-200 text-gray-600 hover:border-gray-400"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Preview bar */}
            <div
              className="rounded-xl p-4 text-white text-sm font-medium"
              style={{ backgroundColor: settings.primaryColor, borderRadius: settings.borderRadius === "9999px" ? "1rem" : settings.borderRadius }}
            >
              <span>Store preview — </span>
              <span style={{ color: settings.accentColor }}>accent colour</span>
              <span> — {settings.fontHeading}</span>
            </div>

            {saved && (
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm flex items-center gap-2">
                <Check className="w-4 h-4" />
                Theme settings saved. Refresh your storefront to see changes.
              </div>
            )}

            <button
              onClick={handleSaveSettings}
              disabled={updateSettingsMutation.isPending}
              className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {updateSettingsMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {updateSettingsMutation.isPending ? "Saving..." : "Save theme settings"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
