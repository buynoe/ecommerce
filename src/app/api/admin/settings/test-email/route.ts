import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { getPlatformEmail } from "@/lib/platform";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  if (!(await getAdmin())) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { to } = await req.json();
  if (!to) return NextResponse.json({ error: "Recipient email required" }, { status: 400 });

  const { smtp, provider } = await getPlatformEmail();

  if (!smtp.host || !smtp.user || !smtp.pass) {
    return NextResponse.json({
      error: `Email not configured. Provider: ${provider}. Missing: ${[!smtp.host && "host", !smtp.user && "user", !smtp.pass && "API key/password"].filter(Boolean).join(", ")}.`,
    }, { status: 400 });
  }

  const sent = await sendEmail({
    to,
    subject: "Buynoe — Test Email",
    html: `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;background:#f9fafb">
      <div style="max-width:500px;margin:0 auto;background:white;border-radius:12px;padding:32px;border:1px solid #e5e7eb">
        <div style="font-size:22px;font-weight:900;background:linear-gradient(90deg,#ec1f78,#ff6e30);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:16px">Buynoe</div>
        <h2 style="color:#111;margin:0 0 8px">Test email working ✓</h2>
        <p style="color:#6b7280;font-size:14px">This confirms your <strong>${provider === "sendgrid" ? "SendGrid" : "SMTP"}</strong> email settings are configured correctly.</p>
        <p style="color:#6b7280;font-size:12px;margin-top:24px">Sent from: ${smtp.from || smtp.user}</p>
      </div>
    </body></html>`,
  }, smtp);

  if (!sent) {
    return NextResponse.json({ error: "Email failed to send. Check your API key / SMTP credentials and try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true, provider, sentTo: to });
}
