"use client";
import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/dashboard/PageHeader";

interface Gateway {
  id: string | null;
  provider: string;
  name: string;
  description: string;
  icon: string;
  isActive: boolean;
  keyId: string;
  keySecret: string;
}

function GatewayCard({ gateway, onSaved }: { gateway: Gateway; onSaved: (updated: Gateway) => void }) {
  const [keyId, setKeyId] = useState(gateway.keyId);
  const [keySecret, setKeySecret] = useState(gateway.keySecret);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Sync when parent refreshes
  useEffect(() => {
    setKeyId(gateway.keyId);
    setKeySecret(gateway.keySecret);
  }, [gateway.keyId, gateway.keySecret]);

  async function save(isActive: boolean) {
    setError(""); setSuccess(""); setSaving(true);
    try {
      const res = await fetch("/api/payment-gateways", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: gateway.provider,
          isActive,
          keyId: keyId.trim(),
          keySecret: keySecret.trim(),
        }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Failed to save"); return; }
      setSuccess(isActive ? "Gateway enabled successfully!" : "Gateway disabled.");
      onSaved({ ...gateway, ...d.gateway, keyId: d.gateway.keyId ?? keyId, keySecret: d.gateway.keySecret ?? keySecret });
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const isCOD = gateway.provider === "COD";
  const canEnable = isCOD || (keyId.trim().length > 0 && keySecret.trim().length > 0);

  return (
    <div className={`bg-white border rounded-2xl p-6 flex flex-col gap-4 transition-shadow ${gateway.isActive ? "border-green-300 shadow-md shadow-green-50" : "border-gray-200"}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{gateway.icon}</span>
          <div>
            <p className="font-bold text-gray-900">{gateway.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{gateway.description}</p>
          </div>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 ${
          gateway.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
        }`}>
          {gateway.isActive ? "● Active" : "○ Inactive"}
        </span>
      </div>

      {/* API Key inputs (not for COD) */}
      {!isCOD && (
        <div className="space-y-2.5">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">API Key / Key ID</label>
            <input
              value={keyId}
              onChange={e => { setKeyId(e.target.value); setError(""); setSuccess(""); }}
              placeholder={`Enter ${gateway.name} Key ID`}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Secret Key</label>
            <input
              value={keySecret}
              onChange={e => { setKeySecret(e.target.value); setError(""); setSuccess(""); }}
              placeholder={`Enter ${gateway.name} Secret`}
              type="password"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>
          {!canEnable && !gateway.isActive && (
            <p className="text-xs text-amber-600">Enter API Key and Secret Key to enable this gateway.</p>
          )}
        </div>
      )}

      {/* Error / Success messages */}
      {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      {success && <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">✓ {success}</p>}

      {/* Action buttons */}
      <div className="flex gap-2 pt-1">
        {!gateway.isActive ? (
          <button
            onClick={() => save(true)}
            disabled={saving || !canEnable}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors btn-brand disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Enabling…" : `Enable ${gateway.name}`}
          </button>
        ) : (
          <>
            {/* Save keys button (only for gateways with keys) */}
            {!isCOD && (
              <button
                onClick={() => save(true)}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors border border-green-300 text-green-700 hover:bg-green-50 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Keys"}
              </button>
            )}
            <button
              onClick={() => save(false)}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {saving ? "Disabling…" : "Disable"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentsPage() {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setLoadError("");
    try {
      const res = await fetch("/api/payment-gateways");
      const d = await res.json();
      setGateways(d.gateways || []);
    } catch {
      setLoadError("Failed to load payment gateways.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleSaved(updated: Gateway) {
    setGateways(prev => prev.map(g => g.provider === updated.provider ? updated : g));
  }

  const activeCount = gateways.filter(g => g.isActive).length;

  return (
    <div>
      <PageHeader
        title="Payment Gateways"
        subtitle={`Configure payment methods for your store${activeCount > 0 ? ` · ${activeCount} active` : ""}`}
      />

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-6 animate-pulse">
              <div className="h-6 bg-gray-100 rounded w-1/2 mb-3" />
              <div className="h-4 bg-gray-100 rounded w-3/4 mb-4" />
              <div className="h-9 bg-gray-100 rounded mb-2" />
              <div className="h-9 bg-gray-100 rounded mb-4" />
              <div className="h-10 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : loadError ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-600 text-sm">{loadError}
          <button onClick={load} className="ml-3 underline">Retry</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {gateways.map(g => (
            <GatewayCard key={g.provider} gateway={g} onSaved={handleSaved} />
          ))}
        </div>
      )}

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-5">
        <h3 className="font-semibold text-blue-900 mb-1">🔒 Security Note</h3>
        <p className="text-sm text-blue-700 mb-3">
          Your API keys are stored encrypted in the database and are never exposed publicly. Always use test keys during development.
        </p>
        <h3 className="font-semibold text-blue-900 mb-1 mt-3">🚀 Coming Soon</h3>
        <p className="text-sm text-blue-700">
          Stripe, PayPal, PhonePe, PayU, UPI Direct — the architecture is designed to plug in any gateway.
        </p>
      </div>
    </div>
  );
}
