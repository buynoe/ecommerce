import Link from "next/link";

export const metadata = {
  title: "Terms of Service | Buynoe",
  description: "Read the Buynoe Terms of Service — the rules and guidelines for using our ecommerce platform.",
  robots: { index: true, follow: true },
  alternates: { canonical: "https://ecomm.buynoe.com/terms" },
};

const SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    body: `By accessing or using the Buynoe platform ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service. Buynoe Technologies Private Limited ("Buynoe", "we", "us", or "our") reserves the right to update these Terms at any time. Continued use of the Service after changes constitutes acceptance of the new Terms.`,
  },
  {
    title: "2. Description of Service",
    body: `Buynoe provides a SaaS ecommerce platform that allows merchants to create and manage online stores, process orders, manage inventory, accept payments, and integrate with Indian shipping carriers. The Service is provided on a subscription basis with plans as described on our Pricing page.`,
  },
  {
    title: "3. Account Registration",
    body: `To use the Service, you must create an account by providing accurate, complete, and current information. You are responsible for maintaining the confidentiality of your account credentials. You must notify us immediately at support@buynoe.com of any unauthorised use of your account. Buynoe is not liable for any loss resulting from unauthorised use of your account.`,
  },
  {
    title: "4. Subscription and Billing",
    body: `Subscription fees are charged monthly or annually as selected. All prices are exclusive of GST, which will be added at the prevailing rate. Subscriptions auto-renew unless cancelled before the renewal date. You may cancel at any time from your dashboard; cancellation takes effect at the end of the current billing period. No refunds are provided for partial months except as required by applicable law.`,
  },
  {
    title: "5. Merchant Obligations",
    body: `You agree to: (a) comply with all applicable Indian laws including the Consumer Protection Act 2019, IT Act 2000, and GST regulations; (b) not sell prohibited or illegal goods; (c) maintain accurate product descriptions and pricing; (d) honour orders placed through your store; (e) obtain all necessary licences and permits for your business; and (f) not use the Service for fraudulent or deceptive purposes.`,
  },
  {
    title: "6. Payment Processing",
    body: `Buynoe integrates with third-party payment gateways (Razorpay, Cashfree). Payment processing is governed by the terms of those providers. Buynoe is not responsible for payment processing failures, chargebacks, or disputes between merchants and their customers. Merchants are responsible for their own GST collection and remittance obligations.`,
  },
  {
    title: "7. Data Ownership",
    body: `You retain ownership of all data, content, and information you upload to the Service ("Merchant Data"). You grant Buynoe a limited licence to use Merchant Data solely to provide the Service. Buynoe will not sell your Merchant Data to third parties. Upon termination, you may export your data for 30 days before it is deleted from our servers.`,
  },
  {
    title: "8. Intellectual Property",
    body: `The Buynoe platform, including its software, design, trademarks, and content, is owned by Buynoe Technologies Private Limited and protected by intellectual property laws. You may not copy, modify, distribute, or reverse-engineer any part of the platform. Your store's content remains your intellectual property.`,
  },
  {
    title: "9. Limitation of Liability",
    body: `To the maximum extent permitted by law, Buynoe shall not be liable for any indirect, incidental, special, consequential, or punitive damages. Buynoe's total liability to you for any claim arising out of or relating to these Terms shall not exceed the fees paid by you to Buynoe in the twelve (12) months preceding the claim.`,
  },
  {
    title: "10. Termination",
    body: `Buynoe may suspend or terminate your account if you violate these Terms, engage in fraudulent activity, or fail to pay subscription fees. You may terminate your account at any time from the dashboard. Upon termination, your store will be deactivated and customer-facing pages will be taken offline.`,
  },
  {
    title: "11. Governing Law",
    body: `These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts of Bangalore, Karnataka, India. If any provision of these Terms is found to be unenforceable, the remaining provisions shall remain in full force.`,
  },
  {
    title: "12. Contact",
    body: `For questions about these Terms, contact us at: legal@buynoe.com | Buynoe Technologies Private Limited, Bangalore, Karnataka 560001, India.`,
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
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
        {/* Title */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Terms of Service</h1>
          <p className="text-gray-500">Last updated: June 2025 &nbsp;•&nbsp; Effective for all Buynoe merchants</p>
          <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800">
            Please read these Terms carefully before using the Buynoe platform. By creating an account you acknowledge that you have read and agree to these Terms.
          </div>
        </div>

        {/* Sections */}
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
            <Link href="/privacy" className="hover:underline" style={{ color: "#ec1f78" }}>Privacy Policy</Link>
            <Link href="/" className="text-gray-400 hover:text-gray-600">Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
