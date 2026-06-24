"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Store,
  Boxes,
  Truck,
  CreditCard,
  BarChart3,
  ClipboardList,
  Zap,
  Shuffle,
  Package2,
  Timer,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";

interface PlanData {
  id: string;
  key: string;
  name: string;
  price: number;
  priceRupees: number;
  description: string;
  features: string[];
  isPopular: boolean;
}

const CARRIERS: { name: string; Icon: LucideIcon; gradient: string; color: string; bg: string; tagline: string; stats: { label: string; value: string }[]; highlight: string }[] = [
  {
    name: "Delhivery",
    Icon: Zap,
    gradient: "linear-gradient(135deg,#ec1f78,#ff6e30)",
    color: "#ec1f78",
    bg: "rgba(236,31,120,0.06)",
    tagline: "Pan-India express delivery",
    stats: [{ label: "Pin codes", value: "18,500+" }, { label: "Avg delivery", value: "2–4 days" }],
    highlight: "Same-day pickup",
  },
  {
    name: "Shiprocket",
    Icon: Shuffle,
    gradient: "linear-gradient(135deg,#2563eb,#06b6d4)",
    color: "#2563eb",
    bg: "rgba(37,99,235,0.06)",
    tagline: "Multi-carrier smart routing",
    stats: [{ label: "Pin codes", value: "26,000+" }, { label: "Carriers", value: "17+" }],
    highlight: "Auto cheapest route",
  },
  {
    name: "DTDC",
    Icon: Package2,
    gradient: "linear-gradient(135deg,#d97706,#f59e0b)",
    color: "#d97706",
    bg: "rgba(217,119,6,0.06)",
    tagline: "Reliable surface & air freight",
    stats: [{ label: "Pin codes", value: "13,000+" }, { label: "COD", value: "Supported" }],
    highlight: "Tier-2 & Tier-3 reach",
  },
  {
    name: "Blue Dart",
    Icon: Timer,
    gradient: "linear-gradient(135deg,#7c3aed,#a855f7)",
    color: "#7c3aed",
    bg: "rgba(124,58,237,0.06)",
    tagline: "Premium time-definite express",
    stats: [{ label: "Pin codes", value: "35,000+" }, { label: "Delivery", value: "Time-bound" }],
    highlight: "High-value shipments",
  },
  {
    name: "Ecom Express",
    Icon: RotateCcw,
    gradient: "linear-gradient(135deg,#16a34a,#22c55e)",
    color: "#16a34a",
    bg: "rgba(22,163,74,0.06)",
    tagline: "Built for ecommerce returns",
    stats: [{ label: "Pin codes", value: "27,000+" }, { label: "RTO rate", value: "Industry-low" }],
    highlight: "Best-in-class returns",
  },
];

const FEATURES: { Icon: LucideIcon; title: string; desc: string; stat: string; color: string; bg: string }[] = [
  {
    Icon: Store,
    title: "Beautiful Storefronts",
    desc: "Customizable online stores that convert visitors into customers. Mobile-first, blazing fast.",
    stat: "3× higher conversion",
    color: "#ec1f78",
    bg: "rgba(236,31,120,0.06)",
  },
  {
    Icon: Boxes,
    title: "Product Management",
    desc: "Add unlimited products, manage variants, track inventory and get low-stock alerts.",
    stat: "Unlimited SKUs",
    color: "#ff6e30",
    bg: "rgba(255,110,48,0.06)",
  },
  {
    Icon: Truck,
    title: "Indian Shipping",
    desc: "Integrated with Delhivery, Shiprocket, DTDC, Blue Dart & Ecom Express — all in one click.",
    stat: "5+ carriers",
    color: "#7c3aed",
    bg: "rgba(124,58,237,0.06)",
  },
  {
    Icon: CreditCard,
    title: "Secure Payments",
    desc: "Accept UPI, cards, net banking, wallets via Razorpay & Cashfree. Instant settlements.",
    stat: "₹0 setup fee",
    color: "#0891b2",
    bg: "rgba(8,145,178,0.06)",
  },
  {
    Icon: BarChart3,
    title: "Analytics Dashboard",
    desc: "Track sales, revenue, top products and customer behaviour in real-time with smart insights.",
    stat: "Real-time data",
    color: "#16a34a",
    bg: "rgba(22,163,74,0.06)",
  },
  {
    Icon: ClipboardList,
    title: "Order Management",
    desc: "Manage orders end-to-end, send automated notifications, handle returns & cancellations.",
    stat: "Auto-notifications",
    color: "#d97706",
    bg: "rgba(217,119,6,0.06)",
  },
];

function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY - 72;
  window.scrollTo({ top: y, behavior: "smooth" });
}

export default function LandingPage() {
  const revealRefs = useRef<(HTMLElement | null)[]>([]);
  const [plans, setPlans] = useState<PlanData[]>([]);

  useEffect(() => {
    fetch("/api/plans").then(r => r.json()).then(setPlans).catch(() => {});
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            el.style.animationDelay = `${el.dataset.delay || "0"}ms`;
            el.classList.add("visible");
            obs.unobserve(el);
          }
        });
      },
      // rootMargin extends detection 120px below viewport so elements
      // start animating before they're fully in view
      { threshold: 0, rootMargin: "0px 0px 120px 0px" }
    );
    revealRefs.current.forEach(el => { if (el) obs.observe(el); });
    return () => obs.disconnect();
  // re-run when plans load so plan cards get observed after they render
  }, [plans]);

  // localIdx is the position within a section (0-based), not global
  function addReveal(el: HTMLElement | null, localIdx: number, slot: number) {
    if (el) {
      el.dataset.delay = String(localIdx * 60);
      revealRefs.current[slot] = el;
    }
  }

  return (
    <div className="min-h-screen bg-white">

      {/* ── Navbar ── */}
      <nav className="border-b border-gray-100 px-6 py-4 sticky top-0 bg-white/90 backdrop-blur-sm z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <img
            src="https://res.cloudinary.com/dmgoeretb/image/upload/v1782005769/Primary_Mark_01_3x_hvqgmk.png"
            alt="Buynoe" className="h-9 w-auto object-contain"
          />
          <div className="hidden md:flex items-center gap-8">
            {[
              { label: "Features", id: "features" },
              { label: "Pricing",  id: "pricing"  },
              { label: "Shipping", id: "shipping" },
            ].map(({ label, id }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="nav-link text-gray-600 hover:text-gray-900 text-sm font-medium bg-transparent border-0 cursor-pointer pb-0.5"
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 font-medium">Log in</Link>
            <Link
              href="/register"
              className="text-white px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 hover:scale-105"
              style={{ background: "linear-gradient(90deg,#ec1f78 0%,#ff6e30 100%)" }}
            >
              Start free trial
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="py-24 px-6" style={{ background: "linear-gradient(135deg,#fff0f5 0%,#fff5f0 100%)" }}>
        <div className="max-w-4xl mx-auto text-center">
          <div
            className="inline-flex items-center gap-2 text-sm px-4 py-1.5 rounded-full mb-6 font-medium text-white shadow-lg"
            style={{ background: "linear-gradient(90deg,#ec1f78 0%,#ff6e30 100%)", boxShadow: "0 4px 15px rgba(236,31,120,0.3)" }}
          >
            🇮🇳 Made for Indian Merchants
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Sell Online with{" "}
            <span style={{ background: "linear-gradient(90deg,#ec1f78,#ff6e30)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Buynoe
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            India&apos;s most powerful ecommerce platform. Set up your store in minutes, manage products,
            process orders, and ship with Delhivery, Shiprocket &amp; more.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all hover:opacity-90 hover:scale-105"
              style={{ background: "linear-gradient(90deg,#ec1f78 0%,#ff6e30 100%)", boxShadow: "0 10px 30px rgba(236,31,120,0.25)" }}
            >
              Start for free — 30 days trial
            </Link>
            <Link
              href="/login"
              className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-xl text-lg font-semibold hover:border-gray-400 transition-colors"
            >
              Log in to Dashboard
            </Link>
          </div>
          <p className="text-sm text-gray-500 mt-4">No credit card required • 30-day free trial</p>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-12 border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { label: "Merchants",         value: "100+"     },
            { label: "Orders Processed",  value: "100K+"    },
            { label: "Shipping Partners", value: "5+"       },
            { label: "Uptime",            value: "99.9%"   },
          ].map((stat, i) => (
            <div
              key={stat.label}
              ref={el => addReveal(el as HTMLElement | null, i, i)}
              className="reveal"
            >
              <div
                className="text-3xl font-bold"
                style={{ background: "linear-gradient(90deg,#ec1f78,#ff6e30)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
              >
                {stat.value}
              </div>
              <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-6 overflow-hidden" style={{ background: "#fafafa" }}>
        <div className="max-w-6xl mx-auto">
          <div
            ref={el => addReveal(el as HTMLElement | null, 0, 10)}
            className="reveal text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Everything you need to sell online</h2>
            <p className="text-lg text-gray-500">From storefront to shipping — all in one platform</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <div
                key={feature.title}
                ref={el => addReveal(el as HTMLElement | null, i, 11 + i)}
                className="reveal feature-card group relative rounded-2xl p-7 bg-white border border-gray-100 cursor-default overflow-hidden"
                style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
              >
                {/* Gradient glow on hover — pseudo via box-shadow transition */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ background: `linear-gradient(135deg,${feature.bg},transparent 70%)` }}
                />
                {/* Hover border */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ border: `2px solid ${feature.color}22` }}
                />

                {/* Icon */}
                <div
                  className="relative w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                  style={{ background: feature.bg }}
                >
                  <feature.Icon size={26} strokeWidth={1.75} style={{ color: feature.color }} />
                </div>

                {/* Content */}
                <h3 className="relative text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="relative text-gray-500 text-sm leading-relaxed mb-5">{feature.desc}</p>

                {/* Stat pill */}
                <div
                  className="relative inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
                  style={{ background: feature.bg, color: feature.color }}
                >
                  <span>✦</span> {feature.stat}
                </div>

                {/* Arrow reveal on hover */}
                <div
                  className="absolute bottom-6 right-6 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0 text-white text-sm font-bold"
                  style={{ background: `linear-gradient(135deg,${feature.color},${feature.color}99)` }}
                >
                  →
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Shipping Partners ── */}
      <section id="shipping" className="py-20 bg-white px-6">
        <div className="max-w-6xl mx-auto">
          <div
            ref={el => addReveal(el as HTMLElement | null, 0, 20)}
            className="reveal text-center mb-4"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Ship with India&apos;s top carriers</h2>
            <p className="text-gray-500 max-w-xl mx-auto">One-click integration with all major Indian shipping providers. Compare rates, track shipments and manage returns — all from your dashboard.</p>
          </div>

          {/* Stats bar */}
          <div
            ref={el => addReveal(el as HTMLElement | null, 1, 21)}
            className="reveal flex flex-wrap justify-center gap-8 py-8 mb-10"
          >
            {[
              { value: "35,000+", label: "Pin codes covered" },
              { value: "5",       label: "Carrier partners" },
              { value: "COD",     label: "Cash on delivery" },
              { value: "Auto",    label: "Rate comparison" },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-bold" style={{ background: "linear-gradient(90deg,#ec1f78,#ff6e30)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Carrier cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-5">
            {CARRIERS.map((c, i) => (
              <div
                key={c.name}
                ref={el => addReveal(el as HTMLElement | null, i, 22 + i)}
                className="reveal group rounded-2xl overflow-hidden bg-white border border-gray-100 flex flex-col transition-all duration-300 hover:-translate-y-1"
                style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
              >
                {/* Gradient header with icon */}
                <div
                  className="flex flex-col items-center justify-center pt-7 pb-5 gap-3 transition-all duration-300"
                  style={{ background: c.gradient }}
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <c.Icon size={22} strokeWidth={2} className="text-white" />
                  </div>
                  <span className="text-white font-bold text-sm tracking-wide">{c.name}</span>
                </div>

                {/* Body */}
                <div className="flex flex-col flex-1 p-4 gap-3">
                  <p className="text-xs text-gray-500 leading-relaxed text-center">{c.tagline}</p>

                  {/* Stats */}
                  <div className="flex flex-col gap-2 mt-1">
                    {c.stats.map(s => (
                      <div key={s.label} className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
                        <span className="text-xs text-gray-400">{s.label}</span>
                        <span className="text-xs font-bold" style={{ color: c.color }}>{s.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Highlight tag */}
                  <div
                    className="mt-auto text-center text-xs font-semibold py-1.5 px-3 rounded-lg"
                    style={{ background: c.bg, color: c.color }}
                  >
                    {c.highlight}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom note */}
          <div
            ref={el => addReveal(el as HTMLElement | null, 2, 27)}
            className="reveal text-center mt-10 text-sm text-gray-400"
          >
            All carriers support automatic tracking updates, delivery notifications & return management.
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-20 px-6" style={{ background: "#fafafa" }}>
        <div className="max-w-5xl mx-auto">
          <div
            ref={el => addReveal(el as HTMLElement | null, 0, 30)}
            className="reveal text-center mb-4"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h2>
            <p className="text-gray-500 mb-2">Start free, scale as you grow. No hidden charges, no setup fees.</p>
            <p className="text-xs text-gray-400">All prices exclude GST • 30-day free trial on all plans • Cancel anytime</p>
          </div>

          {/* Plan cards */}
          <div className="grid md:grid-cols-3 gap-8 items-stretch mt-12">
            {plans.map((plan, i) => {
              const isFree = plan.price === 0;
              return (
                <div
                  key={plan.key}
                  ref={el => addReveal(el as HTMLElement | null, i, 31 + i)}
                  className={`reveal rounded-2xl p-8 flex flex-col ${plan.isPopular ? "shadow-2xl" : "border-2 border-gray-200 bg-white"}`}
                  style={plan.isPopular ? {
                    border: "2px solid transparent",
                    background: "linear-gradient(white,white) padding-box, linear-gradient(90deg,#ec1f78,#ff6e30) border-box",
                    boxShadow: "0 20px 60px rgba(236,31,120,0.15)",
                  } : {}}
                >
                  {plan.isPopular && (
                    <div
                      className="text-white text-xs font-bold px-3 py-1 rounded-full w-fit mb-4"
                      style={{ background: "linear-gradient(90deg,#ec1f78,#ff6e30)" }}
                    >
                      MOST POPULAR
                    </div>
                  )}
                  {isFree && (
                    <div className="text-xs font-bold px-3 py-1 rounded-full w-fit mb-4 border-2" style={{ color: "#ec1f78", borderColor: "#ec1f78" }}>
                      30-DAY FREE TRIAL
                    </div>
                  )}
                  <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                  <p className="text-sm text-gray-400 mt-1 mb-4">{plan.description}</p>
                  <div className="text-4xl font-bold text-gray-900 mb-1">
                    {isFree ? "Free" : `₹${plan.priceRupees.toLocaleString("en-IN")}`}
                  </div>
                  <p className="text-gray-400 text-xs mb-6">{isFree ? "No credit card needed" : "per month + GST"}</p>
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="font-bold mt-0.5 shrink-0" style={{ color: "#ec1f78" }}>✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/register"
                    className={`block w-full text-center py-3 rounded-xl font-semibold transition-all hover:opacity-90 hover:scale-105 ${(plan.isPopular || isFree) ? "text-white" : "border-2 border-gray-200 text-gray-700 hover:border-gray-300"}`}
                    style={(plan.isPopular || isFree) ? { background: "linear-gradient(90deg,#ec1f78 0%,#ff6e30 100%)" } : {}}
                  >
                    {isFree ? "Start free trial →" : "Get started →"}
                  </Link>
                  {!isFree && <p className="text-center text-xs text-gray-400 mt-3">30-day free trial included</p>}
                </div>
              );
            })}
          </div>

          {/* Included in all plans */}
          <div
            ref={el => addReveal(el as HTMLElement | null, 1, 34)}
            className="reveal mt-14 rounded-2xl bg-white border border-gray-100 p-8"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
          >
            <h3 className="text-lg font-bold text-gray-900 text-center mb-6">Included in every plan</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {[
                { icon: "🔒", title: "SSL & Security",    desc: "Free SSL certificate, DDoS protection, daily backups" },
                { icon: "📱", title: "Mobile Storefront", desc: "Responsive store that works perfectly on every device" },
                { icon: "📊", title: "Basic Analytics",   desc: "Sales reports, traffic overview and order insights" },
                { icon: "🛒", title: "Cart & Checkout",   desc: "Abandoned cart recovery, one-page checkout, UPI QR" },
                { icon: "🏷️", title: "SEO Tools",         desc: "Meta tags, sitemap, product schema for Google ranking" },
                { icon: "📧", title: "Email Notifications", desc: "Order confirmation, shipping updates, review requests" },
                { icon: "🔌", title: "API Access",        desc: "REST API to connect your own tools and workflows" },
                { icon: "🇮🇳", title: "GST Invoicing",   desc: "Auto-generate GST-compliant invoices for every order" },
              ].map((item, i) => (
                <div key={item.title} className="flex gap-3 items-start">
                  <div className="text-xl shrink-0 mt-0.5">{item.icon}</div>
                  <div>
                    <div className="text-sm font-semibold text-gray-800">{item.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5 leading-relaxed">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ strip */}
          <div
            ref={el => addReveal(el as HTMLElement | null, 2, 35)}
            className="reveal mt-8 grid md:grid-cols-3 gap-4 text-sm"
          >
            {[
              { q: "Can I switch plans?", a: "Yes, upgrade or downgrade anytime. Changes take effect at the next billing cycle." },
              { q: "Is there a free trial?", a: "Every plan comes with a 30-day free trial. No credit card needed to start." },
              { q: "What payment methods are accepted?", a: "We accept UPI, all credit/debit cards, net banking and wallets via Razorpay." },
            ].map(faq => (
              <div key={faq.q} className="bg-white rounded-xl p-5 border border-gray-100">
                <div className="font-semibold text-gray-800 mb-1">{faq.q}</div>
                <div className="text-gray-500 text-xs leading-relaxed">{faq.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-950 text-gray-400 pt-16 pb-8 px-6">
        <div className="max-w-6xl mx-auto">

          {/* Top grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">

            {/* Brand column */}
            <div className="md:col-span-1">
              <img
                src="https://res.cloudinary.com/dmgoeretb/image/upload/v1782006442/Primary_Mark_03_3x_irzsn6.png"
                alt="Buynoe" className="h-9 w-auto object-contain mb-4"
              />
              <p className="text-sm text-gray-400 leading-relaxed mb-5">
                Buynoe is India&apos;s all-in-one ecommerce platform built for Indian merchants.
                Set up your store in minutes, accept UPI & card payments, and ship with top carriers — all in one place.
              </p>
              {/* Social icons */}
              <div className="flex gap-3">
                {[
                  { label: "Twitter / X", href: "https://twitter.com/buynoe", svg: <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.259 5.623L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z" /> },
                  { label: "Instagram",   href: "https://instagram.com/buynoe",  svg: <><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></> },
                  { label: "LinkedIn",    href: "https://linkedin.com/company/buynoe", svg: <><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></> },
                  { label: "YouTube",     href: "https://youtube.com/@buynoe",    svg: <><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></> },
                ].map(s => (
                  <a
                    key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                    aria-label={s.label}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white transition-colors"
                    style={{ background: "rgba(255,255,255,0.05)" }}
                  >
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {s.svg}
                    </svg>
                  </a>
                ))}
              </div>
            </div>

            {/* Quick links */}
            <div>
              <h4 className="text-white text-sm font-semibold mb-4">Platform</h4>
              <ul className="space-y-2.5">
                {[
                  { label: "Features",       action: () => scrollTo("features") },
                  { label: "Pricing",        action: () => scrollTo("pricing")  },
                  { label: "Shipping",       action: () => scrollTo("shipping") },
                  { label: "Start free trial", href: "/register" },
                  { label: "Sign in",        href: "/login" },
                ].map(l => (
                  <li key={l.label}>
                    {l.href
                      ? <Link href={l.href} className="text-sm hover:text-white transition-colors">{l.label}</Link>
                      : <button onClick={l.action} className="text-sm hover:text-white transition-colors bg-transparent border-0 cursor-pointer p-0 text-gray-400">{l.label}</button>
                    }
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-white text-sm font-semibold mb-4">Legal</h4>
              <ul className="space-y-2.5">
                {[
                  { label: "Terms of Service", href: "/terms"   },
                  { label: "Privacy Policy",   href: "/privacy" },
                  { label: "Refund Policy",    href: "/terms#billing" },
                  { label: "Shipping Policy",  href: "/terms#shipping" },
                  { label: "Cookie Policy",    href: "/privacy#cookies" },
                ].map(l => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm hover:text-white transition-colors">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-white text-sm font-semibold mb-4">Contact</h4>
              <ul className="space-y-2.5 text-sm">
                <li>support@buynoe.com</li>
                <li>legal@buynoe.com</li>
              </ul>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-gray-500">
            <span>© {new Date().getFullYear()} Buynoe Technologies Private Limited. All Rights Reserved.</span>
            <span>Built with ❤️ for Indian merchants</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
