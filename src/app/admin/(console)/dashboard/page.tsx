"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, TrendingUp, IndianRupee, ShieldCheck, CheckCircle2, Clock, ArrowUpRight } from "lucide-react";

const PLAN_COLORS: Record<string, string> = {
  TRIAL: "#6366f1", BASIC: "#0891b2", PRO: "#ec1f78", ENTERPRISE: "#16a34a",
};

function fmt(paise: number) {
  return "₹" + (paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}
function pct(a: number, b: number) {
  if (!b) return "0%";
  return ((a / b) * 100).toFixed(1) + "%";
}

const card: React.CSSProperties = {
  background: "white",
  borderRadius: "16px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  padding: "1.25rem",
};

export default function AdminDashboard() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats").then(r => r.json()).then(setData);
  }, []);

  if (!data) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "16rem", color: "#94a3b8", fontSize: "0.875rem" }}>
      Loading…
    </div>
  );

  const d = data as {
    totalMerchants: number; newThisMonth: number;
    verifiedMerchants: number;
    planBreakdown: Record<string, number>;
    revenue: { total: number; thisMonth: number; lastMonth: number };
    recentMerchants: { id: string; name: string; email: string; plan: string; createdAt: string; emailVerified: boolean; store?: { name: string; slug: string } }[];
    recentTx: { id: string; invoiceNumber: string; plan: string; amount: number; status: string; createdAt: string; merchant: { name: string } }[];
  };

  const paidMerchants = (d.planBreakdown.BASIC ?? 0) + (d.planBreakdown.PRO ?? 0) + (d.planBreakdown.ENTERPRISE ?? 0);

  const STATS = [
    { label: "Total Merchants", value: d.totalMerchants, sub: `+${d.newThisMonth} this month`, icon: Users, color: "#ec1f78", bg: "rgba(236,31,120,0.08)" },
    { label: "Total Revenue",   value: fmt(d.revenue.total), sub: `${fmt(d.revenue.thisMonth)} this month`, icon: IndianRupee, color: "#16a34a", bg: "rgba(22,163,74,0.08)" },
    { label: "Paid Merchants",  value: paidMerchants, sub: pct(paidMerchants, d.totalMerchants) + " conversion", icon: TrendingUp, color: "#ff6e30", bg: "rgba(255,110,48,0.08)" },
    { label: "Email Verified",  value: d.verifiedMerchants, sub: pct(d.verifiedMerchants, d.totalMerchants) + " of total", icon: ShieldCheck, color: "#7c3aed", bg: "rgba(124,58,237,0.08)" },
  ];

  return (
    <div style={{ maxWidth: "1280px", display: "flex", flexDirection: "column", gap: "2rem" }}>

      {/* Page header */}
      <div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", margin: "0 0 0.25rem" }}>Dashboard</h1>
        <p style={{ color: "#64748b", fontSize: "0.875rem", margin: 0 }}>Platform overview and key metrics</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem" }}>
        {STATS.map(c => (
          <div key={c.label} style={card}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1rem" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {c.label}
              </span>
              <div style={{
                width: "36px", height: "36px", borderRadius: "10px", flexShrink: 0,
                background: c.bg, display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <c.icon size={16} style={{ color: c.color }} />
              </div>
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#0f172a", lineHeight: 1 }}>{c.value}</div>
            <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.375rem" }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Plan breakdown + Recent signups */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1.25rem" }}>

        {/* Plan breakdown */}
        <div style={card}>
          <h2 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#0f172a", margin: "0 0 1.25rem" }}>Plan Breakdown</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {Object.entries(d.planBreakdown).map(([plan, count]) => (
              <div key={plan} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: PLAN_COLORS[plan] ?? "#6b7280", flexShrink: 0 }} />
                <span style={{ fontSize: "0.875rem", color: "#334155", flex: 1 }}>{plan}</span>
                <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#0f172a" }}>{count as number}</span>
                <div style={{ width: "80px", height: "6px", background: "#f1f5f9", borderRadius: "9999px", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: "9999px", width: pct(count as number, d.totalMerchants), background: PLAN_COLORS[plan] ?? "#6b7280" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent signups */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#0f172a", margin: 0 }}>Recent Signups</h2>
            <Link href="/admin/merchants" style={{ fontSize: "0.75rem", fontWeight: 600, color: "#ec1f78", textDecoration: "none" }}>View all →</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {d.recentMerchants.map(m => (
              <Link key={m.id} href={`/admin/merchants/${m.id}`} style={{ textDecoration: "none" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  padding: "0.625rem 0.75rem", borderRadius: "10px",
                  transition: "background 0.15s", cursor: "pointer",
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#f8fafc"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                >
                  <div style={{
                    width: "34px", height: "34px", borderRadius: "10px", flexShrink: 0,
                    background: PLAN_COLORS[m.plan] ?? "#6b7280",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "white", fontSize: "0.8125rem", fontWeight: 700,
                  }}>
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.email}</div>
                  </div>
                  <span style={{
                    fontSize: "0.6875rem", padding: "2px 8px", borderRadius: "9999px", fontWeight: 600, flexShrink: 0,
                    background: `${PLAN_COLORS[m.plan] ?? "#6b7280"}18`, color: PLAN_COLORS[m.plan] ?? "#6b7280",
                  }}>{m.plan}</span>
                  {m.emailVerified
                    ? <CheckCircle2 size={13} style={{ color: "#22c55e", flexShrink: 0 }} />
                    : <Clock size={13} style={{ color: "#f59e0b", flexShrink: 0 }} />}
                  <ArrowUpRight size={13} style={{ color: "#cbd5e1", flexShrink: 0 }} />
                </div>
              </Link>
            ))}
            {d.recentMerchants.length === 0 && (
              <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8", fontSize: "0.875rem" }}>No merchants yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent transactions */}
      <div style={{ ...card, padding: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <h2 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#0f172a", margin: 0 }}>Recent Transactions</h2>
          <Link href="/admin/payments" style={{ fontSize: "0.75rem", fontWeight: 600, color: "#ec1f78", textDecoration: "none" }}>View all →</Link>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                {["Invoice", "Merchant", "Plan", "Amount", "Status", "Date"].map(h => (
                  <th key={h} style={{ textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#94a3b8", paddingBottom: "0.75rem", paddingRight: "1rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.recentTx.map((tx, i) => (
                <tr key={tx.id} style={{ borderBottom: i < d.recentTx.length - 1 ? "1px solid #f8fafc" : "none" }}>
                  <td style={{ padding: "0.875rem 1rem 0.875rem 0", fontFamily: "monospace", fontSize: "0.75rem", color: "#64748b" }}>{tx.invoiceNumber}</td>
                  <td style={{ padding: "0.875rem 1rem 0.875rem 0", fontWeight: 600, color: "#0f172a" }}>{tx.merchant.name}</td>
                  <td style={{ padding: "0.875rem 1rem 0.875rem 0" }}>
                    <span style={{
                      fontSize: "0.6875rem", padding: "3px 8px", borderRadius: "9999px", fontWeight: 600,
                      background: `${PLAN_COLORS[tx.plan] ?? "#6b7280"}18`, color: PLAN_COLORS[tx.plan] ?? "#6b7280",
                    }}>{tx.plan}</span>
                  </td>
                  <td style={{ padding: "0.875rem 1rem 0.875rem 0", fontWeight: 700, color: "#0f172a" }}>{fmt(tx.amount)}</td>
                  <td style={{ padding: "0.875rem 1rem 0.875rem 0" }}>
                    <span style={{
                      fontSize: "0.6875rem", padding: "3px 8px", borderRadius: "9999px", fontWeight: 600,
                      background: tx.status === "SUCCESS" ? "#f0fdf4" : tx.status === "FAILED" ? "#fef2f2" : "#fffbeb",
                      color: tx.status === "SUCCESS" ? "#16a34a" : tx.status === "FAILED" ? "#dc2626" : "#d97706",
                    }}>{tx.status}</span>
                  </td>
                  <td style={{ padding: "0.875rem 0", fontSize: "0.75rem", color: "#94a3b8" }}>
                    {new Date(tx.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                </tr>
              ))}
              {d.recentTx.length === 0 && (
                <tr><td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "#94a3b8", fontSize: "0.875rem" }}>No transactions yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
