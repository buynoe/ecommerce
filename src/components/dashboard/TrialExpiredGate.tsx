"use client";
import { usePathname, useRouter } from "next/navigation";
import { Zap } from "lucide-react";

export default function TrialExpiredGate({
  trialExpired,
  merchantName,
}: {
  trialExpired: boolean;
  merchantName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Allow billing page to remain accessible so merchant can upgrade
  if (!trialExpired || pathname === "/dashboard/billing") return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.85)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md text-center p-8">
        {/* Icon */}
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "linear-gradient(135deg,#ec1f78,#ff6e30)" }}>
          <Zap size={28} className="text-white" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your free trial has ended</h2>
        <p className="text-gray-500 text-sm mb-1">
          Hi <strong>{merchantName}</strong>, your 30-day free trial has expired.
        </p>
        <p className="text-gray-500 text-sm mb-8">
          Upgrade to a paid plan to continue using your store — your data is safe and ready.
        </p>

        {/* Plan teasers */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {[
            { name: "Basic", price: "₹2,999", desc: "500 products · 2,000 orders" },
            { name: "Pro", price: "₹4,999", desc: "1,000 products · Unlimited orders", popular: true },
          ].map(p => (
            <div
              key={p.name}
              className="rounded-xl p-4 border-2 text-left"
              style={p.popular ? {
                border: "2px solid transparent",
                background: "linear-gradient(white,white) padding-box, linear-gradient(90deg,#ec1f78,#ff6e30) border-box",
              } : { borderColor: "#e5e7eb" }}
            >
              {p.popular && (
                <div className="text-xs font-bold mb-1" style={{ background: "linear-gradient(90deg,#ec1f78,#ff6e30)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  MOST POPULAR
                </div>
              )}
              <div className="font-bold text-gray-900">{p.name}</div>
              <div className="text-lg font-black text-gray-900">{p.price}<span className="text-xs font-normal text-gray-400">/mo</span></div>
              <div className="text-xs text-gray-500 mt-1">{p.desc}</div>
            </div>
          ))}
        </div>

        <button
          onClick={() => router.push("/dashboard/billing")}
          className="w-full py-3.5 rounded-xl font-bold text-white text-sm mb-3 hover:opacity-90 transition-opacity"
          style={{ background: "linear-gradient(90deg,#ec1f78,#ff6e30)" }}
        >
          Choose a plan & upgrade →
        </button>
        <p className="text-xs text-gray-400">Secure payment via Razorpay · Cancel anytime</p>
      </div>
    </div>
  );
}
