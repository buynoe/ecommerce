"use client";
import { useState } from "react";
import { MailWarning, X, RefreshCw, CheckCircle2 } from "lucide-react";

export default function EmailVerifyBanner({ email }: { email: string }) {
  const [dismissed, setDismissed] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  if (dismissed) return null;

  async function resend() {
    setResending(true);
    try {
      await fetch("/api/auth/resend-verification", { method: "POST" });
      setResent(true);
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="flex items-center gap-3 px-5 py-3 text-sm" style={{ background: "linear-gradient(90deg,#fff3f8,#fff5f0)", borderBottom: "1px solid #ffd6e7" }}>
      <MailWarning size={16} className="shrink-0" style={{ color: "#ec1f78" }} />
      <span className="text-gray-700 flex-1">
        <strong className="text-gray-900">Email not verified.</strong>{" "}
        Order notifications won&apos;t be sent to <strong>{email}</strong> until you verify your email address.{" "}
        {resent ? (
          <span className="inline-flex items-center gap-1 text-green-600 font-medium">
            <CheckCircle2 size={13} /> Verification email sent!
          </span>
        ) : (
          <button
            onClick={resend} disabled={resending}
            className="inline-flex items-center gap-1 font-medium underline disabled:opacity-50"
            style={{ color: "#ec1f78" }}
          >
            {resending ? <><RefreshCw size={12} className="animate-spin" /> Sending…</> : "Resend verification email"}
          </button>
        )}
      </span>
      <button onClick={() => setDismissed(true)} className="text-gray-400 hover:text-gray-600 shrink-0">
        <X size={15} />
      </button>
    </div>
  );
}
