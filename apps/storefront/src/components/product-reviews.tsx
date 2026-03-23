"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Star, Loader2, CheckCircle } from "lucide-react";

interface Review {
  id: string;
  customerName: string;
  rating: number;
  title: string | null;
  body: string | null;
  createdAt: Date;
}

function StarRating({ value, onChange, size = "md" }: { value: number; onChange?: (v: number) => void; size?: "sm" | "md" }) {
  const [hovered, setHovered] = useState(0);
  const px = size === "sm" ? "w-4 h-4" : "w-6 h-6";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          onMouseEnter={() => onChange && setHovered(star)}
          onMouseLeave={() => onChange && setHovered(0)}
          className={onChange ? "cursor-pointer" : "cursor-default"}
          disabled={!onChange}
        >
          <Star
            className={`${px} transition-colors ${(hovered || value) >= star ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"}`}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="border-b border-gray-100 py-5 last:border-0">
      <div className="flex items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600 flex-shrink-0">
            {review.customerName[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{review.customerName}</p>
            <StarRating value={review.rating} size="sm" />
          </div>
        </div>
        <span className="text-xs text-gray-400">
          {new Date(review.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      </div>
      {review.title && <p className="text-sm font-semibold text-gray-900 mb-1">{review.title}</p>}
      {review.body && <p className="text-sm text-gray-600 leading-relaxed">{review.body}</p>}
    </div>
  );
}

export function ProductReviews({
  tenantId,
  productId,
  initialReviews,
  initialAvg,
  initialTotal,
}: {
  tenantId: string;
  productId: string;
  initialReviews: Review[];
  initialAvg: number | null;
  initialTotal: number;
}) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [avg, setAvg] = useState(initialAvg);
  const [total, setTotal] = useState(initialTotal);
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) { setError("Please select a star rating"); return; }
    setSubmitting(true);
    setError("");
    try {
      await api.reviews.create.mutate({ tenantId, productId, customerEmail: email, customerName: name, rating, title: title || undefined, body: body || undefined });
      setSubmitted(true);
      setShowForm(false);
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-16 border-t border-gray-100 pt-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Customer Reviews</h2>
          {total > 0 && avg && (
            <div className="flex items-center gap-2 mt-1">
              <StarRating value={Math.round(avg)} size="sm" />
              <span className="text-sm text-gray-500">{avg.toFixed(1)} out of 5 · {total} review{total !== 1 ? "s" : ""}</span>
            </div>
          )}
        </div>
        {!showForm && !submitted && (
          <button
            onClick={() => setShowForm(true)}
            className="text-sm bg-shop-accent text-shop-accent-fg px-4 py-2 rounded-shop hover:bg-shop-accent transition-colors"
          >
            Write a Review
          </button>
        )}
      </div>

      {/* Submitted notice */}
      {submitted && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-6">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          Thanks! Your review has been submitted and will appear after approval.
        </div>
      )}

      {/* Review form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="border border-gray-200 rounded-xl p-5 mb-8 space-y-4 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">Write your review</h3>

          <div>
            <p className="text-xs text-gray-600 mb-1">Rating <span className="text-red-400">*</span></p>
            <StarRating value={rating} onChange={setRating} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Name <span className="text-red-400">*</span></label>
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-shop-primary bg-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Email <span className="text-red-400">*</span></label>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-shop-primary bg-white" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Title (optional)</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Summarize your experience" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-shop-primary bg-white" />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Review (optional)</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Tell others about your experience…" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-shop-primary bg-white resize-none" />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">Cancel</button>
            <button type="submit" disabled={submitting} className="text-sm bg-shop-accent text-shop-accent-fg px-5 py-2 rounded-shop hover:bg-shop-accent transition-colors disabled:opacity-60 flex items-center gap-2">
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Submit Review
            </button>
          </div>
        </form>
      )}

      {/* Review list */}
      {reviews.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">No reviews yet. Be the first to share your experience!</p>
      ) : (
        <div>
          {reviews.map((r) => <ReviewCard key={r.id} review={r} />)}
        </div>
      )}
    </div>
  );
}
