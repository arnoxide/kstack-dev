"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Mail,
  Settings,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Send,
  Eye,
  RefreshCw,
  Zap,
  Lock,
  Plus,
  Trash2,
} from "lucide-react";
import { useParams } from "next/navigation";

type Tab = "config" | "templates" | "logs";

const TEMPLATE_LABELS: Record<string, { label: string; desc: string; color: string }> = {
  order_confirmation: { label: "Order Confirmation",  desc: "Sent when a new order is placed",          color: "bg-green-100 text-green-700" },
  shipping_update:    { label: "Shipping Update",     desc: "Sent when an order is marked shipped",     color: "bg-blue-100 text-blue-700"  },
  welcome:            { label: "Welcome Email",       desc: "Sent when a customer creates an account",  color: "bg-violet-100 text-violet-700" },
  password_reset:     { label: "Password Reset",      desc: "Sent when a customer requests a password reset", color: "bg-orange-100 text-orange-700" },
  custom:             { label: "Custom",              desc: "Manual one-off emails",                    color: "bg-gray-100 text-gray-600"  },
};

const VARIABLES = ["{{customer_name}}", "{{store_name}}", "{{order_number}}", "{{order_total}}", "{{order_status}}"];

export default function EmailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [tab, setTab] = useState<Tab>("config");

  // ── Config ──────────────────────────────────────────────────────────────────
  const { data: settings, refetch: refetchSettings } = trpc.email.settings.get.useQuery();
  const updateSettings = trpc.email.settings.update.useMutation({ onSuccess: () => { refetchSettings(); setConfigSaved(true); setTimeout(() => setConfigSaved(false), 3000); } });
  const testEmail = trpc.email.settings.test.useMutation();

  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);
  const [testTo, setTestTo] = useState("");

  useEffect(() => {
    if (settings) {
      setSmtpHost(settings.smtpHost ?? "");
      setSmtpPort(String(settings.smtpPort ?? 587));
      setSmtpUser(settings.smtpUser ?? "");
      setSmtpSecure(settings.smtpSecure);
      setFromEmail(settings.fromEmail ?? "");
      setFromName(settings.fromName ?? "");
      setEnabled(settings.enabled);
    }
  }, [settings]);

  const handleSaveConfig = () => {
    updateSettings.mutate({
      smtpHost: smtpHost || undefined,
      smtpPort: Number(smtpPort),
      smtpUser: smtpUser || undefined,
      smtpPass: smtpPass || undefined,
      smtpSecure,
      fromEmail: fromEmail || undefined,
      fromName: fromName || undefined,
      enabled,
    });
    setSmtpPass("");
  };

  // ── Templates ───────────────────────────────────────────────────────────────
  const { data: templates, refetch: refetchTemplates } = trpc.email.templates.list.useQuery();
  const updateTemplate = trpc.email.templates.update.useMutation({ onSuccess: () => { refetchTemplates(); setTplMsg("Template saved!"); setTimeout(() => setTplMsg(""), 3000); } });
  const createTemplate = trpc.email.templates.create.useMutation({ onSuccess: () => { refetchTemplates(); setCreating(false); setNewName(""); setNewSubject(""); setNewBody(""); } });
  const deleteTemplate = trpc.email.templates.delete.useMutation({ onSuccess: () => refetchTemplates() });
  const resetTemplate = trpc.email.templates.reset.useMutation({ onSuccess: () => refetchTemplates() });

  const [editingTpl, setEditingTpl] = useState<any | null>(null);
  const [tplSubject, setTplSubject] = useState("");
  const [tplBody, setTplBody] = useState("");
  const [tplMsg, setTplMsg] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");

  // New custom template form
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");

  const startEdit = (tpl: any) => {
    setEditingTpl(tpl);
    setTplSubject(tpl.subject);
    setTplBody(tpl.body);
    setShowPreview(false);
  };

  const handlePreview = async (tpl: any) => {
    setPreviewHtml(tpl.body
      .replace(/\{\{customer_name\}\}/g, "Jane Smith")
      .replace(/\{\{store_name\}\}/g, "My Store")
      .replace(/\{\{order_number\}\}/g, "1042")
      .replace(/\{\{order_total\}\}/g, "R 499.00")
      .replace(/\{\{order_status\}\}/g, "Processing")
    );
    setShowPreview(true);
  };

  // ── Logs ────────────────────────────────────────────────────────────────────
  const { data: logs, isLoading: logsLoading } = trpc.email.logs.list.useQuery({ limit: 50 });

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "config",    label: "Configuration", icon: <Settings className="w-4 h-4" /> },
    { id: "templates", label: "Templates",     icon: <FileText className="w-4 h-4" /> },
    { id: "logs",      label: "Logs",          icon: <Clock className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <Mail className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Email</h1>
          <p className="text-sm text-gray-500">Configure SMTP, manage templates and view sent emails</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-6 w-fit">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Config tab ──────────────────────────────────────────────────────── */}
      {tab === "config" && (
        <div className="space-y-5">
          {/* Enable toggle */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">Email Sending</p>
                <p className="text-sm text-gray-500 mt-0.5">Enable to send transactional emails to customers</p>
              </div>
              <button onClick={() => setEnabled(!enabled)}
                className={`relative inline-flex h-6 w-11 rounded-full border-2 border-transparent transition-colors ${enabled ? "bg-blue-600" : "bg-gray-200"}`}>
                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${enabled ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
          </div>

          {/* SMTP settings */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
              <Lock className="w-4 h-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900">SMTP Configuration</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">SMTP Host</label>
                <input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="smtp.gmail.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Port</label>
                <input value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)}
                  type="number" placeholder="587"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Username</label>
                <input value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="you@gmail.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Password {settings?.hasPass && <span className="text-gray-400 font-normal">(leave blank to keep)</span>}
                </label>
                <input type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)}
                  placeholder={settings?.hasPass ? "••••••••" : "App password / API key"}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">From Email</label>
                <input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)}
                  placeholder="noreply@yourstore.com" type="email"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">From Name</label>
                <input value={fromName} onChange={(e) => setFromName(e.target.value)}
                  placeholder="My Store"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input type="checkbox" id="secure" checked={smtpSecure} onChange={(e) => setSmtpSecure(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <label htmlFor="secure" className="text-sm text-gray-700">Use SSL/TLS (port 465)</label>
            </div>

            <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3 border border-gray-100">
              💡 <strong>Gmail:</strong> Use smtp.gmail.com · port 587 · your email · an App Password (not your regular password).<br />
              <strong>SendGrid:</strong> Use smtp.sendgrid.net · port 587 · "apikey" as username · your API key as password.
            </p>

            {configSaved && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
                <CheckCircle className="w-4 h-4" /> Settings saved
              </div>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={handleSaveConfig} disabled={updateSettings.isPending}
                className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Save settings
              </button>

              {/* Test email */}
              <div className="flex items-center gap-2">
                <input value={testTo} onChange={(e) => setTestTo(e.target.value)} type="email"
                  placeholder="test@example.com"
                  className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48" />
                <button onClick={() => testEmail.mutate({ toEmail: testTo })}
                  disabled={testEmail.isPending || !testTo}
                  className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">
                  {testEmail.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  Send test
                </button>
                {testEmail.data && (
                  <span className={`flex items-center gap-1 text-sm font-medium ${testEmail.data.ok ? "text-green-600" : "text-red-500"}`}>
                    {testEmail.data.ok ? <><CheckCircle className="w-4 h-4" /> Sent!</> : <><XCircle className="w-4 h-4" /> {testEmail.data.error}</>}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Templates tab ───────────────────────────────────────────────────── */}
      {tab === "templates" && (
        <div className="space-y-4">
          {/* Preview modal */}
          {showPreview && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowPreview(false)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <p className="font-semibold text-gray-900">Email Preview</p>
                  <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <iframe srcDoc={previewHtml} className="w-full h-96 border-0 rounded-lg bg-white" title="preview" />
                </div>
              </div>
            </div>
          )}

          {!templates ? (
            <div className="text-center py-12 text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
          ) : editingTpl ? (
            // ── Edit view ─────────────────────────────────────────────────────
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {editingTpl.isCustom ? editingTpl.name : (TEMPLATE_LABELS[editingTpl.type]?.label ?? editingTpl.type)}
                  </h2>
                  {!editingTpl.isCustom && (
                    <p className="text-xs text-gray-500 mt-0.5">{TEMPLATE_LABELS[editingTpl.type]?.desc}</p>
                  )}
                </div>
                <button onClick={() => setEditingTpl(null)} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
              </div>

              {/* Variables hint */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
                <p className="text-xs font-medium text-blue-700 mb-1.5">Available variables:</p>
                <div className="flex flex-wrap gap-1.5">
                  {VARIABLES.map((v) => (
                    <code key={v} className="text-xs bg-white border border-blue-200 text-blue-700 px-2 py-0.5 rounded font-mono">{v}</code>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
                <input value={tplSubject} onChange={(e) => setTplSubject(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Body (HTML)</label>
                <textarea value={tplBody} onChange={(e) => setTplBody(e.target.value)}
                  rows={14}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y" />
              </div>

              {tplMsg && <p className="text-sm text-green-600">{tplMsg}</p>}

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => {
                    if (editingTpl.isCustom) {
                      updateTemplate.mutate({ id: editingTpl.id, subject: tplSubject, body: tplBody });
                    } else {
                      updateTemplate.mutate({ type: editingTpl.type as any, subject: tplSubject, body: tplBody });
                    }
                  }}
                  disabled={updateTemplate.isPending}
                  className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {updateTemplate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Save template
                </button>
                <button onClick={() => handlePreview({ body: tplBody })}
                  className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg text-sm hover:bg-gray-50">
                  <Eye className="w-4 h-4" /> Preview
                </button>
                {!editingTpl.isCustom && (
                  <button
                    onClick={() => { if (confirm("Reset to default?")) resetTemplate.mutate({ type: editingTpl.type as any }); }}
                    disabled={resetTemplate.isPending}
                    className="flex items-center gap-2 text-red-500 hover:text-red-700 text-sm px-3 py-2.5">
                    <RefreshCw className="w-4 h-4" /> Reset to default
                  </button>
                )}
              </div>
            </div>
          ) : (
            // ── Template list ─────────────────────────────────────────────────
            <div className="space-y-3">
              {/* Built-in templates */}
              {templates.filter((t: any) => !t.isCustom).map((tpl: any) => {
                const meta = TEMPLATE_LABELS[tpl.type];
                if (!meta) return null;
                return (
                  <div key={tpl.type} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${meta.color}`}>{meta.label}</span>
                      <div>
                        <p className="text-sm text-gray-500">{meta.desc}</p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5 truncate max-w-xs">{tpl.subject}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => handlePreview(tpl)}
                        className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => startEdit(tpl)}
                        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700">
                        Edit
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Custom templates */}
              {templates.filter((t: any) => t.isCustom).map((tpl: any) => (
                <div key={tpl.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs px-2 py-1 rounded-full font-medium bg-gray-100 text-gray-600">Custom</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{tpl.name}</p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5 truncate max-w-xs">{tpl.subject}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => handlePreview(tpl)}
                      className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => startEdit(tpl)}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700">
                      Edit
                    </button>
                    <button
                      onClick={() => { if (confirm(`Delete "${tpl.name}"?`)) deleteTemplate.mutate({ id: tpl.id }); }}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* New custom template button / form */}
              {creating ? (
                <div className="bg-white rounded-xl border border-blue-200 p-5 space-y-3">
                  <p className="text-sm font-semibold text-gray-900">New Custom Template</p>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Template Name</label>
                    <input value={newName} onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Flash Sale Announcement"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
                    <input value={newSubject} onChange={(e) => setNewSubject(e.target.value)}
                      placeholder="Email subject..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Body (HTML)</label>
                    <textarea value={newBody} onChange={(e) => setNewBody(e.target.value)}
                      rows={8} placeholder="<p>Hello {{customer_name}},</p>"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => createTemplate.mutate({ name: newName, subject: newSubject, body: newBody })}
                      disabled={createTemplate.isPending || !newName.trim() || !newSubject.trim() || !newBody.trim()}
                      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                      {createTemplate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Create template
                    </button>
                    <button onClick={() => { setCreating(false); setNewName(""); setNewSubject(""); setNewBody(""); }}
                      className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setCreating(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors text-sm font-medium">
                  <Plus className="w-4 h-4" /> New Custom Template
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Logs tab ────────────────────────────────────────────────────────── */}
      {tab === "logs" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Sent Emails</h2>
            <span className="text-xs text-gray-400">{logs?.length ?? 0} records</span>
          </div>

          {logsLoading ? (
            <div className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" /></div>
          ) : !logs?.length ? (
            <div className="p-10 text-center text-gray-400 text-sm">
              <Mail className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              No emails sent yet
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">To</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Subject</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-900 font-medium">{log.to}</td>
                    <td className="px-5 py-3 text-gray-600 max-w-xs truncate">{log.subject}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TEMPLATE_LABELS[log.type]?.color ?? "bg-gray-100 text-gray-600"}`}>
                        {TEMPLATE_LABELS[log.type]?.label ?? log.type}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {log.status === "sent" ? (
                        <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                          <CheckCircle className="w-3.5 h-3.5" /> Sent
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-500 text-xs font-medium" title={log.errorMessage ?? ""}>
                          <XCircle className="w-3.5 h-3.5" /> Failed
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs">
                      {new Date(log.sentAt).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
