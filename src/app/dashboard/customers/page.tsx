"use client";
import { useEffect, useState, useCallback } from "react";
import { Users } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { formatDate } from "@/lib/utils";

interface Customer { id: string; firstName: string; lastName: string; email: string; phone?: string; createdAt: string; _count: { orders: number } }

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ ...(search && { search }) });
    const r = await fetch(`/api/customers?${p}`);
    const d = await r.json();
    setCustomers(d.customers || []); setTotal(d.total || 0);
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <PageHeader title="Customers" subtitle={`${total} customers`} />
      <div className="mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-64 focus:ring-2 focus:ring-pink-500 focus:outline-none" />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? <div className="p-12 text-center text-gray-400">Loading…</div>
          : customers.length === 0 ? <div className="p-16 text-center text-gray-400"><div className="mb-3 flex justify-center"><Users className="w-14 h-14 text-gray-300" /></div>No customers yet</div>
          : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Customer", "Email", "Phone", "Orders", "Joined"].map(h => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm font-bold">
                          {c.firstName[0]}{c.lastName[0]}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{c.firstName} {c.lastName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{c.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{c.phone || "—"}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 font-medium">{c._count.orders}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">{formatDate(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  );
}
