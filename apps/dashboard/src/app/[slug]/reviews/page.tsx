"use client";

import { use, useState } from "react";
import { trpc } from "@/lib/trpc";
import { CheckCircle, XCircle, Trash2, Star, Loader2, MessageSquare } from "lucide-react";

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`w-3.5 h-3.5 ${s <= rating ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"}`} />
      ))}
    </div>
  );
}

export default function ReviewsPage({ params }: { params: Promise<{ slug: string }> }) {
  use(params);

  const [filter, setFilter] = useState<boolean | undefined>(false); // default: pending
  const { data: reviews, refetch } = trpc.reviews.adminList.useQuery({ isApproved: filter });
  const moderateMut = trpc.reviews.moderate.useMutation({ onSuccess: () => refetch() });
  const deleteMut = trpc.reviews.delete.useMutation({ onSuccess: () => refetch() });

  const tabs = [
    { label: "Pending", value: false },
    { label: "Approved", value: true },
    { label: "All", value: undefined },
  ] as const;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Product Reviews</h1>
        <p className="text-sm text-gray-500 mt-1">Approve or reject customer reviews before they appear on the storefront.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={String(tab.value)}
            onClick={() => setFilter(tab.value)}
            className={`text-sm px-4 py-1.5 rounded-lg transition-colors ${filter === tab.value ? "bg-white text-gray-900 font-medium shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      {!reviews || reviews.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl">
          <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            {filter === false ? "No pending reviews." : filter === true ? "No approved reviews." : "No reviews yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div key={review.id} className="border border-gray-200 rounded-xl p-5 bg-white space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600 flex-shrink-0">
                    {review.customerName[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{review.customerName}</p>
                    <p className="text-xs text-gray-400">{review.customerEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StarDisplay rating={review.rating} />
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${review.isApproved ? "bg-green-50 text-green-700 border-green-200" : "bg-yellow-50 text-yellow-700 border-yellow-200"}`}>
                    {review.isApproved ? "Approved" : "Pending"}
                  </span>
                </div>
              </div>

              {review.title && <p className="text-sm font-semibold text-gray-800">{review.title}</p>}
              {review.body && <p className="text-sm text-gray-600 leading-relaxed">{review.body}</p>}

              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-gray-400">
                  {new Date(review.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
                <div className="flex gap-2">
                  {!review.isApproved ? (
                    <button
                      onClick={() => moderateMut.mutate({ id: review.id, isApproved: true })}
                      disabled={moderateMut.isPending}
                      className="flex items-center gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
                    >
                      {moderateMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      Approve
                    </button>
                  ) : (
                    <button
                      onClick={() => moderateMut.mutate({ id: review.id, isApproved: false })}
                      disabled={moderateMut.isPending}
                      className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Unapprove
                    </button>
                  )}
                  <button
                    onClick={() => deleteMut.mutate({ id: review.id })}
                    disabled={deleteMut.isPending}
                    className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 border border-red-100 hover:border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
