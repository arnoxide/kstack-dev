"use client";
// Module: KStack_AIAssistant

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Bot, Minimize2 } from "lucide-react";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@kstack/api/router";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

const client = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: `${API_URL}/trpc` })],
});

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SESSION_KEY = (tenantId: string) => `kstack_ai_session_${tenantId}`;

export function AIChatWidget({ tenantId, shopSlug }: { tenantId: string; shopSlug: string }) {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Check if chat is enabled for this tenant
  useEffect(() => {
    client.aiAssistant.chatEnabled.query({ tenantId }).then((res) => {
      setEnabled(res.enabled);
    }).catch(() => {});
  }, [tenantId]);

  // Restore session token from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(SESSION_KEY(tenantId));
    if (saved) setSessionToken(saved);
  }, [tenantId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const res = await client.aiAssistant.chat.mutate({
        tenantId,
        message: text,
        sessionToken,
      });
      if (res.sessionToken) {
        setSessionToken(res.sessionToken);
        localStorage.setItem(SESSION_KEY(tenantId), res.sessionToken);
      }
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!enabled) return null;

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-4 z-50 w-80 sm:w-96 flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
          style={{ height: "480px" }}>
          {/* Header */}
          <div className="bg-shop-primary text-shop-primary-fg px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Store Assistant</p>
              <p className="text-xs opacity-70">Powered by AI — ask me anything</p>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-gray-400">
                <Bot className="w-10 h-10 text-gray-300" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Hi! I'm your store assistant.</p>
                  <p className="text-xs mt-1">Ask me about products, prices, or anything else!</p>
                </div>
                {/* Quick prompts */}
                <div className="w-full space-y-1.5 mt-2">
                  {["What products do you have?", "What are your bestsellers?", "How does shipping work?"].map((q) => (
                    <button
                      key={q}
                      onClick={() => { setInput(q); }}
                      className="w-full text-left text-xs bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-shop-primary flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                    <Bot className="w-3 h-3 text-shop-primary-fg" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-shop-accent text-shop-accent-fg rounded-br-sm"
                      : "bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-shop-primary flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                  <Bot className="w-3 h-3 text-shop-primary-fg" />
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 shadow-sm">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 bg-white border-t border-gray-100">
            <div className="flex gap-2 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Type a message..."
                rows={1}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-shop-primary resize-none"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="p-2.5 bg-shop-accent text-shop-accent-fg rounded-xl hover:bg-shop-accent disabled:opacity-40 transition-colors flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-50 w-13 h-13 bg-shop-accent text-shop-accent-fg rounded-full shadow-lg hover:bg-shop-accent transition-all hover:scale-105 flex items-center justify-center"
        style={{ width: "52px", height: "52px" }}
        aria-label="Open chat"
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </button>
    </>
  );
}
