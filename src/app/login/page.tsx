"use client";
import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = Partial<Record<"email" | "password", string>>;

function validate(form: { email: string; password: string }): FieldErrors {
  const errs: FieldErrors = {};
  if (!EMAIL_RE.test(form.email)) errs.email = "Enter a valid email address";
  if (!form.password) errs.password = "Password is required";
  return errs;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { executeRecaptcha } = useGoogleReCaptcha();

  const [form, setForm] = useState({ email: "", password: "" });
  const [touched, setTouched] = useState<Partial<Record<"email" | "password", boolean>>>({});
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [verifiedMsg, setVerifiedMsg] = useState<"invalid" | "expired" | null>(null);

  useEffect(() => {
    const v = searchParams.get("verified");
    if (v === "invalid") setVerifiedMsg("invalid");
    else if (v === "expired") setVerifiedMsg("expired");
  }, [searchParams]);

  const touch = useCallback((field: "email" | "password") => {
    setTouched(t => ({ ...t, [field]: true }));
    setFieldErrors(validate(form));
  }, [form]);

  function onChange(field: "email" | "password", value: string) {
    const next = { ...form, [field]: value };
    setForm(next);
    if (touched[field]) setFieldErrors(validate(next));
  }

  function err(field: "email" | "password") {
    return touched[field] ? fieldErrors[field] : undefined;
  }

  function inputClass(field: "email" | "password") {
    const e = err(field);
    const ok = touched[field] && !e;
    return `w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors ${
      e  ? "border-red-400 focus:ring-red-200 bg-red-50"  :
      ok ? "border-green-400 focus:ring-green-200"         :
           "border-gray-200 focus:ring-pink-200"
    }`;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ email: true, password: true });
    const errs = validate(form);
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (!executeRecaptcha) { setServerError("reCAPTCHA not ready. Please try again."); return; }
    const captchaToken = await executeRecaptcha("login");

    setLoading(true);
    setServerError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, captchaToken }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Login failed");
      router.push("/dashboard");
    } catch (e: unknown) {
      setServerError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <img src="https://res.cloudinary.com/dmgoeretb/image/upload/v1782005769/Primary_Mark_01_3x_hvqgmk.png" alt="Buynoe" className="h-10 w-auto object-contain mx-auto" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 mt-1">Sign in to your merchant account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {verifiedMsg === "invalid" && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-5">
              <AlertCircle size={15} className="shrink-0" />
              Invalid verification link. Please request a new one from your dashboard.
            </div>
          )}
          {verifiedMsg === "expired" && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg text-sm mb-5">
              <AlertCircle size={15} className="shrink-0" />
              Verification link expired. Sign in and resend from your dashboard.
            </div>
          )}
          {serverError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-5">{serverError}</div>
          )}

          <form onSubmit={submit} className="space-y-4" noValidate>
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input type="email" value={form.email} placeholder="you@example.com"
                className={inputClass("email")}
                onChange={e => onChange("email", e.target.value)}
                onBlur={() => touch("email")} />
              {err("email") && <p className="text-xs text-red-500 mt-1">{err("email")}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <Link href="/forgot-password" className="text-xs text-[#ec1f78] hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <input type={showPass ? "text" : "password"} value={form.password} placeholder="••••••••"
                  className={inputClass("password")}
                  onChange={e => onChange("password", e.target.value)}
                  onBlur={() => touch("password")} />
                <button type="button" tabIndex={-1} onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {err("password") && <p className="text-xs text-red-500 mt-1">{err("password")}</p>}
            </div>

            <button type="submit" disabled={loading}
              className="w-full text-white py-3 rounded-xl font-semibold disabled:opacity-50 transition-all hover:opacity-90"
              style={{ background: "linear-gradient(90deg,#ec1f78 0%,#ff6e30 100%)" }}>
              {loading ? "Signing in…" : "Sign in"}
            </button>

            <p className="text-center text-xs text-gray-400">
              Protected by reCAPTCHA &nbsp;·&nbsp;
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline">Privacy</a>
              {" "}&amp;{" "}
              <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline">Terms</a>
            </p>
          </form>

          <div className="mt-5 flex items-center gap-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
            <CheckCircle2 size={13} className="text-green-500 shrink-0" />
            <span><strong>Demo:</strong> demo@buynoe.com / demo1234</span>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          No account?{" "}
          <Link href="/register" className="font-medium hover:underline" style={{ color: "#ec1f78" }}>Start free trial →</Link>
        </p>
      </div>
    </div>
  );
}
