"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Login failed");
      router.push("/admin/dashboard");
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
      padding: "1rem",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      {/* Background dots */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden",
        background: "radial-gradient(ellipse at 20% 50%, rgba(236,31,120,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(255,110,48,0.06) 0%, transparent 60%)",
      }} />

      <div style={{ width: "100%", maxWidth: "400px", position: "relative" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: "56px", height: "56px", borderRadius: "16px", marginBottom: "1.25rem",
            background: "linear-gradient(135deg, #ec1f78, #ff6e30)",
            boxShadow: "0 8px 32px rgba(236,31,120,0.35)",
          }}>
            <ShieldCheck size={26} color="white" />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "0.5rem" }}>
            <img
              src="https://res.cloudinary.com/dmgoeretb/image/upload/v1782005769/Primary_Mark_01_3x_hvqgmk.png"
              alt="Buynoe"
              style={{ height: "28px", width: "auto", objectFit: "contain" }}
            />
          </div>
          <h1 style={{ color: "white", fontSize: "1.5rem", fontWeight: 700, margin: "0 0 0.25rem" }}>
            Admin Console
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "0.875rem", margin: 0 }}>
            Sign in to manage the platform
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "20px",
          padding: "2rem",
          backdropFilter: "blur(20px)",
          boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
        }}>
          {error && (
            <div style={{
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
              color: "#fca5a5", padding: "0.75rem 1rem", borderRadius: "10px",
              fontSize: "0.875rem", marginBottom: "1.25rem",
            }}>
              {error}
            </div>
          )}

          <form onSubmit={submit}>
            {/* Email */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", color: "#cbd5e1", fontSize: "0.8125rem", fontWeight: 500, marginBottom: "0.5rem" }}>
                Email address
              </label>
              <input
                type="email" required value={form.email}
                placeholder="admin@buynoe.com"
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "10px", padding: "0.7rem 0.875rem",
                  color: "white", fontSize: "0.875rem", outline: "none",
                }}
                onFocus={e => { e.target.style.borderColor = "#ec1f78"; e.target.style.boxShadow = "0 0 0 3px rgba(236,31,120,0.15)"; }}
                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.12)"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", color: "#cbd5e1", fontSize: "0.8125rem", fontWeight: 500, marginBottom: "0.5rem" }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"} required value={form.password}
                  placeholder="••••••••"
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "10px", padding: "0.7rem 2.5rem 0.7rem 0.875rem",
                    color: "white", fontSize: "0.875rem", outline: "none",
                  }}
                  onFocus={e => { e.target.style.borderColor = "#ec1f78"; e.target.style.boxShadow = "0 0 0 3px rgba(236,31,120,0.15)"; }}
                  onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.12)"; e.target.style.boxShadow = "none"; }}
                />
                <button
                  type="button" tabIndex={-1}
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 0,
                  }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              style={{
                width: "100%", padding: "0.8rem", borderRadius: "12px",
                background: loading ? "#374151" : "linear-gradient(90deg, #ec1f78, #ff6e30)",
                color: "white", fontWeight: 600, fontSize: "0.9375rem",
                border: "none", cursor: loading ? "not-allowed" : "pointer",
                boxShadow: loading ? "none" : "0 4px 15px rgba(236,31,120,0.4)",
                transition: "all 0.2s",
              }}
            >
              {loading ? "Signing in…" : "Sign in to Console"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: "0.75rem", color: "#475569", marginTop: "1.5rem" }}>
          First time?{" "}
          <a href="/api/admin/setup" style={{ color: "#64748b", textDecoration: "underline" }}>
            Set up admin account
          </a>
        </p>
      </div>
    </div>
  );
}
