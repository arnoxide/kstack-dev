// Paystack payment verification helper

const PAYSTACK_SECRET = process.env["PAYSTACK_SECRET_KEY"] ?? "";

export interface PaystackVerifyResult {
  status: "success" | "failed" | "abandoned";
  amount: number; // in kobo/cents (ZAR: multiply by 100)
  currency: string;
  reference: string;
}

export async function verifyPaystackPayment(reference: string): Promise<PaystackVerifyResult> {
  if (!PAYSTACK_SECRET) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured");
  }

  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
  });

  if (!res.ok) {
    throw new Error(`Paystack verify failed: ${res.status}`);
  }

  const body = await res.json() as {
    status: boolean;
    data: { status: string; amount: number; currency: string; reference: string };
  };

  return {
    status: body.data.status as PaystackVerifyResult["status"],
    amount: body.data.amount,
    currency: body.data.currency,
    reference: body.data.reference,
  };
}

// Verify Paystack webhook signature (HMAC SHA-512)
export async function verifyPaystackWebhook(
  payload: string,
  signature: string,
): Promise<boolean> {
  const secret = process.env["PAYSTACK_WEBHOOK_SECRET"] ?? PAYSTACK_SECRET;
  if (!secret) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );

  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hex === signature;
}
