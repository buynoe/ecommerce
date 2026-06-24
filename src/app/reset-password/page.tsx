"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    const r = await fetch("/api/auth/reset-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const d = await r.json();
    setLoading(false);
    if (d.success) setDone(true);
    else setError(d.error || "Something went wrong.");
  }

  if (!token) return (
    <div className="text-center text-red-600 text-sm">
      Invalid reset link. <Link href="/forgot-password" className="underline text-[#ec1f78]">Request a new one</Link>.
    </div>
  );

  return done ? (
    <div className="text-center space-y-4">
      <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
        <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-gray-900">Password updated!</h2>
      <p className="text-sm text-gray-500">Your password has been reset successfully.</p>
      <button onClick={() => router.push("/login")}
        className="block w-full text-center py-2.5 rounded-xl text-sm font-semibold text-white mt-4"
        style={{ background: "linear-gradient(90deg,#ec1f78,#ff6e30)" }}>
        Login with new password
      </button>
    </div>
  ) : (
    <form onSubmit={submit} className="space-y-4">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
        <div className="relative">
          <input type={showPw ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-pink-400/30 focus:border-pink-400" />
          <button type="button" onClick={() => setShowPw(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
        <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}
          placeholder="Repeat new password"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400/30 focus:border-pink-400" />
      </div>
      <button type="submit" disabled={loading}
        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
        style={{ background: "linear-gradient(90deg,#ec1f78,#ff6e30)" }}>
        {loading ? "Saving…" : "Reset Password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image src="https://res.cloudinary.com/dmgoeretb/image/upload/v1782005769/Primary_Mark_01_3x_hvqgmk.png"
            alt="Buynoe" width={120} height={40} className="h-9 w-auto object-contain mx-auto mb-6" unoptimized />
          <h1 className="text-2xl font-bold text-gray-900">Set new password</h1>
          <p className="text-sm text-gray-500 mt-1">Choose a strong password for your account</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <Suspense fallback={<div className="text-center text-sm text-gray-400">Loading…</div>}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
