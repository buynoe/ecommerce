"use client";
import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { Eye, EyeOff, CheckCircle2, Mail } from "lucide-react";

const INDIAN_PHONE = /^[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function strengthLabel(p: string): { label: string; color: string; width: string } {
  if (p.length === 0) return { label: "", color: "#e5e7eb", width: "0%" };
  let score = 0;
  if (p.length >= 8) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  const map = [
    { label: "Weak",   color: "#ef4444", width: "25%" },
    { label: "Fair",   color: "#f97316", width: "50%" },
    { label: "Good",   color: "#eab308", width: "75%" },
    { label: "Strong", color: "#22c55e", width: "100%" },
  ];
  return map[score - 1] ?? map[0];
}

type FieldErrors = Partial<Record<"name"|"storeName"|"email"|"phone"|"password"|"confirmPassword"|"agreeTerms", string>>;

function validate(form: { name: string; storeName: string; email: string; phone: string; password: string; confirmPassword: string }, agreeTerms: boolean): FieldErrors {
  const errs: FieldErrors = {};
  if (!form.name.trim() || form.name.trim().length < 2) errs.name = "Enter your full name (min 2 characters)";
  if (!form.storeName.trim() || form.storeName.trim().length < 2) errs.storeName = "Enter your store name (min 2 characters)";
  if (!EMAIL_RE.test(form.email)) errs.email = "Enter a valid email address";
  if (!INDIAN_PHONE.test(form.phone)) errs.phone = "Enter a valid 10-digit Indian mobile number (starts with 6–9)";
  if (form.password.length < 8) errs.password = "Password must be at least 8 characters";
  if (form.confirmPassword !== form.password) errs.confirmPassword = "Passwords do not match";
  if (!agreeTerms) errs.agreeTerms = "You must agree to the Terms and Conditions";
  return errs;
}

export default function RegisterPage() {
  const router = useRouter();
  const { executeRecaptcha } = useGoogleReCaptcha();

  const [form, setForm] = useState({ name: "", storeName: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<keyof typeof form | "agreeTerms", boolean>>>({});
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  const strength = strengthLabel(form.password);

  const touch = useCallback((field: keyof typeof form | "agreeTerms") => {
    setTouched(t => ({ ...t, [field]: true }));
    setFieldErrors(validate(form, field === "agreeTerms" ? !agreeTerms : agreeTerms));
  }, [form, agreeTerms]);

  function onChange(field: keyof typeof form, value: string) {
    const next = { ...form, [field]: value };
    setForm(next);
    if (touched[field]) setFieldErrors(validate(next, agreeTerms));
  }

  function err(field: keyof FieldErrors) {
    return touched[field] ? fieldErrors[field] : undefined;
  }

  function inputClass(field: keyof FieldErrors) {
    const e = err(field);
    const ok = touched[field] && !e;
    return `w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors ${
      e  ? "border-red-400 focus:ring-red-200 bg-red-50"   :
      ok ? "border-green-400 focus:ring-green-200"          :
           "border-gray-200 focus:ring-pink-200"
    }`;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const allTouched = Object.fromEntries(Object.keys(form).map(k => [k, true])) as typeof touched;
    allTouched.agreeTerms = true;
    setTouched(allTouched);
    const errs = validate(form, agreeTerms);
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (!executeRecaptcha) { setServerError("reCAPTCHA not ready. Please try again."); return; }
    const captchaToken = await executeRecaptcha("register");

    setLoading(true);
    setServerError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, agreeTerms, captchaToken }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Registration failed");
      setRegisteredEmail(form.email);
      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 4000);
    } catch (e: unknown) {
      setServerError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "linear-gradient(135deg,#ec1f78,#ff6e30)" }}>
              <Mail size={30} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify your email</h1>
            <p className="text-gray-500 mb-4">
              We&apos;ve sent a verification link to <strong className="text-gray-800">{registeredEmail}</strong>.
              Click the link in the email to activate your account.
            </p>
            <p className="text-sm text-gray-400 mb-6">
              Didn&apos;t get it? Check your spam folder. The link expires in 24 hours.
            </p>
            <div className="text-xs text-gray-400 flex items-center justify-center gap-1.5">
              <CheckCircle2 size={13} className="text-green-500" />
              Taking you to your dashboard in a moment…
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <img src="https://res.cloudinary.com/dmgoeretb/image/upload/v1782005769/Primary_Mark_01_3x_hvqgmk.png" alt="Buynoe" className="h-10 w-auto object-contain mx-auto" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Create your store</h1>
          <p className="text-gray-500 mt-1">14-day free trial • No credit card required</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {serverError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-5">{serverError}</div>
          )}

          <form onSubmit={submit} className="space-y-4" noValidate>
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input type="text" value={form.name} placeholder="Rahul Sharma"
                className={inputClass("name")}
                onChange={e => onChange("name", e.target.value)}
                onBlur={() => touch("name")} />
              {err("name") && <p className="text-xs text-red-500 mt-1">{err("name")}</p>}
            </div>

            {/* Store Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
              <input type="text" value={form.storeName} placeholder="My Fashion Store"
                className={inputClass("storeName")}
                onChange={e => onChange("storeName", e.target.value)}
                onBlur={() => touch("storeName")} />
              {err("storeName") && <p className="text-xs text-red-500 mt-1">{err("storeName")}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input type="email" value={form.email} placeholder="you@example.com"
                className={inputClass("email")}
                onChange={e => onChange("email", e.target.value)}
                onBlur={() => touch("email")} />
              {err("email") && <p className="text-xs text-red-500 mt-1">{err("email")}</p>}
            </div>

            {/* Mobile */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
              <div className="flex gap-2">
                <span className="inline-flex items-center px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500 shrink-0">
                  🇮🇳 +91
                </span>
                <input type="tel" value={form.phone} placeholder="9876543210" maxLength={10}
                  className={inputClass("phone")}
                  onChange={e => onChange("phone", e.target.value.replace(/\D/g, ""))}
                  onBlur={() => touch("phone")} />
              </div>
              {err("phone") && <p className="text-xs text-red-500 mt-1">{err("phone")}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} value={form.password} placeholder="Min 8 characters"
                  className={inputClass("password")}
                  onChange={e => onChange("password", e.target.value)}
                  onBlur={() => touch("password")} />
                <button type="button" tabIndex={-1} onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.password && (
                <div className="mt-1.5">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: strength.width, background: strength.color }} />
                  </div>
                  {strength.label && <p className="text-xs mt-0.5" style={{ color: strength.color }}>{strength.label} password</p>}
                </div>
              )}
              {err("password") && <p className="text-xs text-red-500 mt-1">{err("password")}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <div className="relative">
                <input type={showConfirm ? "text" : "password"} value={form.confirmPassword} placeholder="Re-enter password"
                  className={inputClass("confirmPassword")}
                  onChange={e => onChange("confirmPassword", e.target.value)}
                  onBlur={() => touch("confirmPassword")} />
                <button type="button" tabIndex={-1} onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {err("confirmPassword") && <p className="text-xs text-red-500 mt-1">{err("confirmPassword")}</p>}
            </div>

            {/* Terms */}
            <div>
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input type="checkbox" checked={agreeTerms}
                  className="mt-0.5 w-4 h-4 rounded accent-pink-600"
                  onChange={e => { setAgreeTerms(e.target.checked); touch("agreeTerms"); }} />
                <span className="text-sm text-gray-600">
                  I agree to Buynoe&apos;s{" "}
                  <Link href="/terms" target="_blank" className="font-medium underline" style={{ color: "#ec1f78" }}>Terms of Service</Link>
                  {" "}and{" "}
                  <Link href="/privacy" target="_blank" className="font-medium underline" style={{ color: "#ec1f78" }}>Privacy Policy</Link>
                </span>
              </label>
              {err("agreeTerms") && <p className="text-xs text-red-500 mt-1">{err("agreeTerms")}</p>}
            </div>

            <button type="submit" disabled={loading}
              className="w-full text-white py-3 rounded-xl font-semibold disabled:opacity-50 transition-all hover:opacity-90"
              style={{ background: "linear-gradient(90deg,#ec1f78 0%,#ff6e30 100%)" }}>
              {loading ? "Creating your store…" : "Create my store"}
            </button>

            <p className="text-center text-xs text-gray-400">
              Protected by reCAPTCHA &nbsp;·&nbsp;
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline">Privacy</a>
              {" "}&amp;{" "}
              <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline">Terms</a>
            </p>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="font-medium hover:underline" style={{ color: "#ec1f78" }}>Sign in →</Link>
        </p>
      </div>
    </div>
  );
}
