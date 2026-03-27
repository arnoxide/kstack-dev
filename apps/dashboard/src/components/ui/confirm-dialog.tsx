"use client";
/**
 * Confirm dialog — replaces window.confirm()
 *
 * Usage:
 *   const confirm = useConfirm();
 *   const ok = await confirm({ title: "Delete product?", message: "This cannot be undone.", danger: true });
 *   if (ok) { ... }
 */
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface ConfirmOptions {
  title:        string;
  message?:     string;
  confirmLabel?: string;
  cancelLabel?:  string;
  danger?:       boolean;   // red confirm button
}

type Resolver = (value: boolean) => void;

interface State {
  opts:     ConfirmOptions;
  resolve:  Resolver;
}

const Ctx = createContext<((opts: ConfirmOptions) => Promise<boolean>) | null>(null);

export function useConfirm() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return ctx;
}

// ── Provider ───────────────────────────────────────────────────────────────────
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State | null>(null);
  const resolveRef = useRef<Resolver | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ opts, resolve });
    });
  }, []);

  const close = (value: boolean) => {
    resolveRef.current?.(value);
    setState(null);
  };

  return (
    <Ctx.Provider value={confirm}>
      {children}
      {state && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 10000,
            backgroundColor: "rgba(2,6,23,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16,
            animation: "_cfade .18s ease both",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) close(false); }}
        >
          <style>{`@keyframes _cfade { from { opacity:0; } to { opacity:1; } } @keyframes _cslide { from { opacity:0; transform:scale(.96) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }`}</style>
          <div
            style={{
              background: "#fff", borderRadius: 20,
              padding: 24, width: "100%", maxWidth: 380,
              boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
              animation: "_cslide .22s cubic-bezier(.34,1.56,.64,1) both",
            }}
          >
            {/* header */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
              {state.opts.danger && (
                <div style={{
                  width: 38, height: 38, borderRadius: 19,
                  backgroundColor: "#fef2f2", display: "flex",
                  alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <AlertTriangle size={18} color="#dc2626" />
                </div>
              )}
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" }}>
                  {state.opts.title}
                </p>
                {state.opts.message && (
                  <p style={{ margin: "5px 0 0", fontSize: 13, color: "#6b7280", lineHeight: "19px" }}>
                    {state.opts.message}
                  </p>
                )}
              </div>
              <button onClick={() => close(false)} style={{
                background: "none", border: "none", cursor: "pointer",
                color: "#9ca3af", padding: 2, flexShrink: 0,
              }}>
                <X size={16} />
              </button>
            </div>

            {/* actions */}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
              <button
                onClick={() => close(false)}
                style={{
                  padding: "9px 18px", borderRadius: 10, border: "1.5px solid #e5e7eb",
                  background: "#fff", color: "#374151", fontWeight: 600, fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {state.opts.cancelLabel ?? "Cancel"}
              </button>
              <button
                onClick={() => close(true)}
                style={{
                  padding: "9px 18px", borderRadius: 10, border: "none",
                  background: state.opts.danger ? "#dc2626" : "#0284c7",
                  color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer",
                }}
              >
                {state.opts.confirmLabel ?? (state.opts.danger ? "Delete" : "Confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
