"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { CheckCircle, Loader2 } from "lucide-react";

export function ContactForm({ tenantId }: { tenantId: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await api.public.contact.mutate({
        tenantId,
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim() || undefined,
        message: message.trim(),
      });
      setSuccess(true);
      setName(""); setEmail(""); setSubject(""); setMessage("");
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? "Failed to send message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-shop-accent bg-white";

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 bg-green-50 rounded-full mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Message sent!</h3>
        <p className="text-gray-500 text-sm mb-6">Thanks for reaching out. We'll get back to you shortly.</p>
        <button
          onClick={() => setSuccess(false)}
          className="text-sm text-gray-500 hover:text-gray-900 underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Your name *</label>
          <input
            type="text" required value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Jane Smith" className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Email address *</label>
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com" className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">Subject</label>
        <input
          type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
          placeholder="How can we help?" className={inputCls}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">Message *</label>
        <textarea
          required rows={6} value={message} onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us more…"
          className={`${inputCls} resize-none`}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
      )}

      <button
        type="submit" disabled={submitting || !name.trim() || !email.trim() || !message.trim()}
        className="w-full flex items-center justify-center gap-2 bg-shop-accent text-shop-accent-fg font-semibold py-3 rounded-shop hover:opacity-90 disabled:opacity-50 transition-opacity text-sm"
      >
        {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : "Send Message"}
      </button>
    </form>
  );
}
