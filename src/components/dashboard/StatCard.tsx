import { ReactNode } from "react";

const BRAND_COLORS: Record<string, { bg: string; color: string }> = {
  pink:   { bg: "rgba(236,31,120,0.08)",  color: "#ec1f78" },
  orange: { bg: "rgba(255,110,48,0.08)",  color: "#ff6e30" },
  blue:   { bg: "rgba(37,99,235,0.08)",   color: "#2563eb" },
  purple: { bg: "rgba(124,58,237,0.08)",  color: "#7c3aed" },
  green:  { bg: "rgba(22,163,74,0.08)",   color: "#16a34a" },
};

export default function StatCard({
  label, value, icon, sub, color = "pink",
}: {
  label: string; value: string | number; icon: ReactNode; sub?: string; color?: string;
}) {
  const c = BRAND_COLORS[color] ?? BRAND_COLORS.pink;
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <div
        className="inline-flex items-center justify-center w-10 h-10 rounded-lg mb-3"
        style={{ background: c.bg, color: c.color }}
      >
        {icon}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}
