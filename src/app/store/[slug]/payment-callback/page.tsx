"use client";
import { use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function PaymentCallbackPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState<"verifying" | "success" | "failed">("verifying");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const orderId = searchParams.get("orderId");
    const storeId = searchParams.get("storeId");
    const provider = searchParams.get("provider") || "CASHFREE";
    const cfOrderId = searchParams.get("cf_order_id") ?? undefined;

    if (!orderId || !storeId) {
      setStatus("failed");
      setMessage("Invalid payment callback. Missing order details.");
      return;
    }

    async function verify() {
      try {
        const res = await fetch("/api/storefront/payment/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storeId, orderId, provider, cfOrderId }),
        });
        const d = await res.json();
        if (res.ok && d.success) {
          setStatus("success");
          // Fetch order number for success page redirect
          const orderRes = await fetch(`/api/storefront/order?orderId=${orderId}&storeId=${storeId}`);
          if (orderRes.ok) {
            const { order } = await orderRes.json();
            router.replace(`/store/${slug}/order-success?order=${order?.orderNumber}&storeId=${storeId}`);
          } else {
            router.replace(`/store/${slug}/order-success?storeId=${storeId}`);
          }
        } else {
          setStatus("failed");
          setMessage(d.error || "Payment verification failed. Please contact support.");
        }
      } catch {
        setStatus("failed");
        setMessage("Network error during payment verification. Please contact support with your order ID.");
      }
    }

    verify();
  }, [searchParams, slug, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 max-w-md w-full text-center">
        {status === "verifying" && (
          <>
            <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Verifying Payment</h2>
            <p className="text-gray-500 text-sm">Please wait while we confirm your payment…</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-green-700 mb-2">Payment Successful!</h2>
            <p className="text-gray-500 text-sm">Redirecting to your order confirmation…</p>
          </>
        )}
        {status === "failed" && (
          <>
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-xl font-bold text-red-700 mb-2">Payment Verification Failed</h2>
            <p className="text-gray-500 text-sm mb-6">{message}</p>
            <button
              onClick={() => router.back()}
              className="bg-gray-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-700 transition-colors"
            >
              Go Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}
