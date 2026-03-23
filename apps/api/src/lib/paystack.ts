// Paystack payment verification helper

export interface PaystackVerifyResult {
  status: "success" | "failed" | "abandoned";
  amount: number; // in kobo/cents (ZAR: multiply by 100)
  currency: string;
  reference: string;
}

export async function verifyPaystackPayment(reference: string, secretKey: string): Promise<PaystackVerifyResult> {
  if (!secretKey) {
    throw new Error("Paystack secret key not configured");
  }

  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
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
  secret: string,
): Promise<boolean> {
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
