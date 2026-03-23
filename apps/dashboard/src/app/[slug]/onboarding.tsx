"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Check, X, ChevronRight, Sparkles } from "lucide-react";

interface Props {
  hasProducts: boolean;
  hasOrders: boolean;
  hasPayments: boolean;
  storeUrl: string;
}

export function OnboardingChecklist({ hasProducts, hasOrders, hasPayments, storeUrl }: Props) {
  const params = useParams<{ slug: string }>();
  const [dismissed, setDismissed] = useState(false);

  const steps = [
    {
      id: "store",
      label: "Store created",
      desc: "Your store is live and ready.",
      done: true,
      href: null,
    },
    {
      id: "products",
      label: "Add your first product",
      desc: "Upload a product with a photo, price, and description.",
      done: hasProducts,
      href: `/${params.slug}/products/new`,
    },
    {
      id: "storefront",
      label: "Design your homepage",
      desc: "Use the page builder to customise your store's look.",
      done: false,
      href: `/${params.slug}/pages`,
    },
    {
      id: "payments",
      label: "Connect a payment method",
      desc: "Accept payments via Stripe, PayFast, or Yoco.",
      done: hasPayments,
      href: `/${params.slug}/integrations`,
    },
    {
      id: "share",
      label: "Share your store",
      desc: "Send your store link to your first customer.",
      done: hasOrders,
      href: storeUrl,
      external: true,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;

  if (dismissed || allDone) return null;

  const progress = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="mb-8 bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-indigo-500" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">Set up your store</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {completedCount} of {steps.length} steps complete
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-gray-300 hover:text-gray-500 transition-colors p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div
          className="h-1 bg-indigo-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="divide-y divide-gray-50">
        {steps.map((step) => {
          const content = (
            <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors group">
              {/* Checkbox */}
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                  step.done
                    ? "bg-emerald-500 border-emerald-500"
                    : "border-gray-300 group-hover:border-indigo-400"
                }`}
              >
                {step.done && <Check className="w-3 h-3 text-white stroke-[3]" />}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${step.done ? "text-gray-400 line-through" : "text-gray-800"}`}>
                  {step.label}
                </p>
                {!step.done && (
                  <p className="text-xs text-gray-400 mt-0.5">{step.desc}</p>
                )}
              </div>

              {/* Arrow */}
              {!step.done && step.href && (
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 flex-shrink-0 transition-colors" />
              )}
            </div>
          );

          if (step.done || !step.href) return <div key={step.id}>{content}</div>;

          return (
            <Link
              key={step.id}
              href={step.href}
              target={step.external ? "_blank" : undefined}
              rel={step.external ? "noopener noreferrer" : undefined}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
