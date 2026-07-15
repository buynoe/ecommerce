import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import AdminSidebar from "@/components/admin/AdminSidebar";

export const metadata = { title: "Buynoe Admin" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <div style={{
      display: "flex", minHeight: "100vh",
      background: "#f8fafc",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      <AdminSidebar adminName={admin.name} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        <main style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>{children}</main>
      </div>
    </div>
  );
}
