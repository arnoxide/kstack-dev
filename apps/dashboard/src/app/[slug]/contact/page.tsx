"use client";

import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Mail, Trash2, Check, Clock, MessageSquare, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

const STATUS_LABELS = {
  new: { label: "New", cls: "bg-blue-100 text-blue-700" },
  read: { label: "Read", cls: "bg-gray-100 text-gray-600" },
  replied: { label: "Replied", cls: "bg-green-100 text-green-700" },
};

function timeAgo(date: Date) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function ContactMessagesPage() {
  const confirm = useConfirm();
  const { data: messages, refetch, isLoading } = trpc.contact.list.useQuery();
  const updateStatus = trpc.contact.updateStatus.useMutation({ onSuccess: () => refetch() });
  const deleteMsg = trpc.contact.delete.useMutation({ onSuccess: () => refetch() });

  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "new" | "read" | "replied">("all");

  const filtered = messages?.filter((m) => filter === "all" || m.status === filter) ?? [];
  const newCount = messages?.filter((m) => m.status === "new").length ?? 0;

  const toggle = (id: string, currentStatus: string) => {
    setExpanded((prev) => (prev === id ? null : id));
    if (currentStatus === "new") {
      updateStatus.mutate({ id, status: "read" });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            Contact Messages
            {newCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full">
                {newCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Messages from your storefront contact form</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(["all", "new", "read", "replied"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize",
              filter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            {f === "all" ? `All (${messages?.length ?? 0})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${messages?.filter((m) => m.status === f).length ?? 0})`}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-gray-200">
          <div className="p-4 bg-gray-100 rounded-full mb-3">
            <MessageSquare className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700">No messages yet</p>
          <p className="text-xs text-gray-400 mt-1">Messages from your contact form will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((msg) => {
            const isOpen = expanded === msg.id;
            const statusInfo = STATUS_LABELS[msg.status];
            return (
              <div
                key={msg.id}
                className={cn(
                  "bg-white rounded-xl border transition-colors",
                  msg.status === "new" ? "border-blue-200" : "border-gray-200"
                )}
              >
                {/* Header row */}
                <button
                  className="w-full flex items-center gap-3 px-5 py-4 text-left"
                  onClick={() => toggle(msg.id, msg.status)}
                >
                  <div className={cn("w-2 h-2 rounded-full flex-shrink-0", msg.status === "new" ? "bg-blue-500" : "bg-transparent")} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">{msg.name}</span>
                      <span className="text-xs text-gray-400">{msg.email}</span>
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", statusInfo.cls)}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {msg.subject || msg.message}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {timeAgo(new Date(msg.createdAt))}
                    </span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                {/* Expanded body */}
                {isOpen && (
                  <div className="px-5 pb-4 border-t border-gray-100">
                    {msg.subject && (
                      <p className="text-xs font-semibold text-gray-500 mt-3 mb-1 uppercase tracking-wide">Subject</p>
                    )}
                    {msg.subject && <p className="text-sm text-gray-800 mb-3">{msg.subject}</p>}
                    <p className="text-xs font-semibold text-gray-500 mt-3 mb-1 uppercase tracking-wide">Message</p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-lg p-3 border border-gray-100">
                      {msg.message}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-4">
                      <a
                        href={`mailto:${msg.email}${msg.subject ? `?subject=Re: ${encodeURIComponent(msg.subject)}` : ""}`}
                        onClick={() => updateStatus.mutate({ id: msg.id, status: "replied" })}
                        className="flex items-center gap-1.5 text-xs font-medium bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5" /> Reply via email
                      </a>
                      {msg.status !== "replied" && (
                        <button
                          onClick={() => updateStatus.mutate({ id: msg.id, status: "replied" })}
                          className="flex items-center gap-1.5 text-xs font-medium border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" /> Mark as replied
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          const ok = await confirm({ title: "Delete message", message: `Delete message from ${msg.name}?`, danger: true });
                          if (!ok) return;
                          deleteMsg.mutate({ id: msg.id });
                        }}
                        className="ml-auto flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-red-500 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
