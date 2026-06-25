import type { Metadata, Viewport } from "next";
import "./globals.css";
import RecaptchaProvider from "@/components/RecaptchaProvider";

const BASE = "https://ecomm.buynoe.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: "Buynoe — Build Your Online Store",
    template: "%s | Buynoe",
  },
  description: "Launch your online store in minutes with Buynoe — India's ecommerce platform for merchants. Manage products, orders, payments, inventory and customers from one powerful dashboard.",
  keywords: ["online store builder", "ecommerce platform india", "sell online", "buynoe", "create online store", "merchant dashboard", "shopify alternative india"],
  authors: [{ name: "Buynoe", url: BASE }],
  creator: "Buynoe",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: BASE,
    siteName: "Buynoe",
    title: "Buynoe — Build Your Online Store",
    description: "Launch your online store in minutes. Manage products, orders, payments and more.",
    images: [{ url: `${BASE}/og-image.png`, width: 1200, height: 630, alt: "Buynoe — Build Your Online Store" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Buynoe — Build Your Online Store",
    description: "Launch your online store in minutes. Manage products, orders, payments and more.",
    images: [`${BASE}/og-image.png`],
  },
  alternates: { canonical: BASE },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png",   sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    other: [
      { rel: "manifest",             url: "/site.webmanifest" },
      { rel: "msapplication-config", url: "/browserconfig.xml" },
    ],
  },
  manifest: "/site.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Buynoe" },
  other: {
    "msapplication-TileColor": "#ec1f78",
    "msapplication-TileImage": "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#ec1f78",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <head>
        {/* Explicit tags for maximum compatibility */}
        <link rel="icon"               type="image/png" sizes="16x16"  href="/favicon-16.png" />
        <link rel="icon"               type="image/png" sizes="32x32"  href="/favicon-32.png" />
        <link rel="icon"               type="image/png" sizes="192x192" href="/icon-192.png" />
<link rel="apple-touch-icon"   sizes="180x180"                 href="/apple-touch-icon.png" />
        <link rel="manifest"                                            href="/site.webmanifest" />
        <meta name="theme-color"                        content="#ec1f78" />
        <meta name="msapplication-TileColor"            content="#ec1f78" />
        <meta name="msapplication-TileImage"            content="/icon-192.png" />
        <meta name="msapplication-config"               content="/browserconfig.xml" />
        <meta name="apple-mobile-web-app-capable"       content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title"         content="Buynoe" />
      </head>
      <body className="min-h-full bg-white text-gray-900">
        <RecaptchaProvider>{children}</RecaptchaProvider>
      </body>
    </html>
  );
}
