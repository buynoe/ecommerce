import Link from "next/link";

export const metadata = { title: "Privacy Policy | Buynoe" };

const SECTIONS = [
  {
    title: "1. Information We Collect",
    body: `We collect: (a) Account information — name, email address, mobile number, and password when you register; (b) Business information — store name, GST number, and business address; (c) Transaction data — orders, payments, and refunds processed through your store; (d) Usage data — pages visited, features used, and time spent on the platform; (e) Device data — IP address, browser type, and operating system.`,
  },
  {
    title: "2. How We Use Your Information",
    body: `We use your information to: provide and improve the Service; process payments and send billing invoices; send transactional emails such as order confirmations and shipping updates; send platform updates and feature announcements (you can opt out at any time); detect and prevent fraud and abuse; comply with legal obligations under Indian law; and provide customer support.`,
  },
  {
    title: "3. Your Customers' Data",
    body: `When your customers place orders through your Buynoe store, you are the data controller for their personal information. We act as a data processor on your behalf. You are responsible for maintaining a privacy policy on your storefront and obtaining appropriate consents from your customers. We will process your customers' data only as instructed by you and as necessary to provide the Service.`,
  },
  {
    title: "4. Data Sharing",
    body: `We do not sell your personal information. We may share data with: payment processors (Razorpay, Cashfree) to process transactions; shipping carriers (Delhivery, Shiprocket, DTDC, etc.) to fulfil shipments; cloud infrastructure providers (AWS, Cloudinary) to host the Service; analytics providers to understand platform usage; and government authorities when required by law.`,
  },
  {
    title: "5. Data Security",
    body: `We implement industry-standard security measures including: TLS 1.3 encryption for all data in transit; AES-256 encryption for sensitive data at rest; bcrypt hashing for passwords (never stored in plain text); regular security audits and penetration testing; access controls limiting who within Buynoe can access your data; and daily automated backups retained for 30 days.`,
  },
  {
    title: "6. Data Retention",
    body: `We retain your account data for the duration of your subscription and for 90 days after termination, after which it is permanently deleted. Transaction records may be retained for up to 7 years as required by Indian tax law. You may request deletion of your data at any time by contacting privacy@buynoe.com; deletion requests are processed within 30 days.`,
  },
  {
    title: "7. Cookies and Tracking",
    body: `We use essential cookies to maintain your login session. We use analytics cookies (with your consent) to understand how the platform is used. We do not use third-party advertising cookies. You can manage cookie preferences in your browser settings. Disabling essential cookies will prevent you from logging in.`,
  },
  {
    title: "8. Your Rights",
    body: `Under applicable Indian data protection law, you have the right to: access a copy of the personal data we hold about you; correct inaccurate or incomplete data; request deletion of your data; object to processing of your data; and data portability — export your store data at any time from your dashboard. To exercise these rights, contact privacy@buynoe.com.`,
  },
  {
    title: "9. Email Communications",
    body: `We send two types of emails: (a) Transactional emails — order confirmations, invoices, security alerts. These are essential and cannot be opted out of. (b) Marketing emails — product updates, feature announcements. You may unsubscribe at any time using the link in the email or from your account settings. We will not send marketing emails until your email address is verified.`,
  },
  {
    title: "10. Changes to This Policy",
    body: `We may update this Privacy Policy from time to time. We will notify you of significant changes via email (to your registered email address) at least 7 days before the changes take effect. Your continued use of the Service after the effective date constitutes acceptance of the updated Policy.`,
  },
  {
    title: "11. Contact Us",
    body: `For privacy-related questions or to exercise your rights: privacy@buynoe.com | Buynoe Technologies Private Limited, Bangalore, Karnataka 560001, India. We aim to respond to all requests within 72 hours.`,
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100 px-6 py-4 sticky top-0 bg-white/90 backdrop-blur-sm z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/">
            <img src="https://res.cloudinary.com/dmgoeretb/image/upload/v1782005769/Primary_Mark_01_3x_hvqgmk.png" alt="Buynoe" className="h-8 w-auto object-contain" />
          </Link>
          <Link href="/register" className="text-white text-sm font-medium px-4 py-2 rounded-lg" style={{ background: "linear-gradient(90deg,#ec1f78,#ff6e30)" }}>
            Start free trial
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Privacy Policy</h1>
          <p className="text-gray-500">Last updated: June 2025 &nbsp;•&nbsp; Buynoe Technologies Private Limited</p>
          <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-800">
            Your privacy matters to us. This policy explains what data we collect, how we use it, and your rights regarding your information.
          </div>
        </div>

        <div className="space-y-10">
          {SECTIONS.map(s => (
            <section key={s.title}>
              <h2 className="text-lg font-bold text-gray-900 mb-3">{s.title}</h2>
              <p className="text-gray-600 leading-relaxed text-[15px]">{s.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-gray-100 text-center">
          <p className="text-gray-400 text-sm">© {new Date().getFullYear()} Buynoe Technologies Private Limited. All Rights Reserved.</p>
          <div className="flex justify-center gap-4 mt-3 text-sm">
            <Link href="/terms" className="hover:underline" style={{ color: "#ec1f78" }}>Terms of Service</Link>
            <Link href="/" className="text-gray-400 hover:text-gray-600">Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
