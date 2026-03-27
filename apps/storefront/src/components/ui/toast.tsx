"use client";
/**
 * Toast / Alert module — web (Next.js)
 *
 * Usage:
 *   const toast = useToast();
 *   toast.success("Saved!");
 *   toast.error("Failed", "Something went wrong.");
 *   toast.warning("Check fields", "Some fields are missing.");
 *   toast.info("Note", "Processing your request.");
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastOptions {
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
  removing: boolean;
}

interface ToastCtx {
  show:    (opts: ToastOptions) => void;
  success: (title: string, message?: string) => void;
  error:   (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info:    (title: string, message?: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

// ── Config ─────────────────────────────────────────────────────────────────────
const CONFIG: Record<ToastType, { accent: string; bg: string; border: string; titleColor: string; Icon: React.ElementType }> = {
  success: { accent: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", titleColor: "#15803d", Icon: CheckCircle2 },
  error:   { accent: "#dc2626", bg: "#fef2f2", border: "#fecaca", titleColor: "#b91c1c", Icon: XCircle },
  warning: { accent: "#d97706", bg: "#fffbeb", border: "#fde68a", titleColor: "#b45309", Icon: AlertTriangle },
  info:    { accent: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", titleColor: "#1d4ed8", Icon: Info },
};

// ── CSS injected once ──────────────────────────────────────────────────────────
const CSS = `
@keyframes _toast_in  { from { opacity:0; transform:translateY(-14px) scale(.96); } to { opacity:1; transform:translateY(0) scale(1); } }
@keyframes _toast_out { from { opacity:1; transform:translateY(0) scale(1); }       to { opacity:0; transform:translateY(-10px) scale(.96); } }
@keyframes _toast_bar { from { width:100%; } to { width:0%; } }
._toast_enter { animation: _toast_in  .28s cubic-bezier(.34,1.56,.64,1) both; }
._toast_leave { animation: _toast_out .22s ease-in both; }
`;

let cssInjected = false;
function injectCSS() {
  if (cssInjected || typeof document === "undefined") return;
  cssInjected = true;
  const el = document.createElement("style");
  el.textContent = CSS;
  document.head.appendChild(el);
}

// ── Single toast card ──────────────────────────────────────────────────────────
function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const cfg      = CONFIG[item.type];
  const duration = item.duration ?? 3500;
  const { Icon } = cfg;

  return (
    <div
      role="alert"
      className={item.removing ? "_toast_leave" : "_toast_enter"}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        backgroundColor: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: 14,
        padding: "13px 14px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
        position: "relative",
        overflow: "hidden",
        minWidth: 280,
        maxWidth: 380,
        pointerEvents: "all",
      }}
    >
      {/* left accent */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0,
        width: 4, backgroundColor: cfg.accent, borderRadius: "14px 0 0 14px",
      }} />

      {/* icon */}
      <div style={{ marginLeft: 6, marginTop: 1, flexShrink: 0 }}>
        <Icon size={18} color={cfg.accent} />
      </div>

      {/* text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: cfg.titleColor, lineHeight: "18px" }}>
          {item.title}
        </p>
        {item.message && (
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#4b5563", lineHeight: "17px" }}>
            {item.message}
          </p>
        )}
      </div>

      {/* close */}
      <button
        onClick={() => onDismiss(item.id)}
        style={{
          background: "rgba(0,0,0,0.06)", border: "none", cursor: "pointer",
          borderRadius: "50%", width: 20, height: 20,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, padding: 0,
        }}
      >
        <X size={11} color="#9ca3af" />
      </button>

      {/* progress bar */}
      <div
        className="_toast_bar"
        style={{
          position: "absolute", bottom: 0, left: 0,
          height: 3, backgroundColor: cfg.accent, opacity: 0.45, borderRadius: 2,
          animation: `_toast_bar ${duration}ms linear forwards`,
        }}
      />
    </div>
  );
}

// ── Provider ───────────────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { injectCSS(); setMounted(true); }, []);

  const dismiss = useCallback((id: string) => {
    // mark as removing → CSS exit animation
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, removing: true } : t));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 230);
  }, []);

  const show = useCallback((opts: ToastOptions) => {
    const id       = `${Date.now()}-${Math.random()}`;
    const duration = opts.duration ?? 3500;
    setToasts((prev) => {
      const next = prev.length >= 4 ? prev.slice(1) : prev;
      return [...next, { ...opts, id, removing: false }];
    });
    setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  const value: ToastCtx = {
    show,
    success: (title, msg?) => show({ type: "success", title, ...(msg !== undefined ? { message: msg } : {}) }),
    error:   (title, msg?) => show({ type: "error",   title, ...(msg !== undefined ? { message: msg } : {}) }),
    warning: (title, msg?) => show({ type: "warning", title, ...(msg !== undefined ? { message: msg } : {}) }),
    info:    (title, msg?) => show({ type: "info",    title, ...(msg !== undefined ? { message: msg } : {}) }),
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      {mounted && createPortal(
        <div style={{
          position: "fixed", top: 16, right: 16, zIndex: 9999,
          display: "flex", flexDirection: "column", gap: 8,
          pointerEvents: "none",
        }}>
          {toasts.map((t) => <ToastCard key={t.id} item={t} onDismiss={dismiss} />)}
        </div>,
        document.body,
      )}
    </Ctx.Provider>
  );
}
