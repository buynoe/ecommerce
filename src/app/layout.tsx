import type { Metadata } from "next";
import "./globals.css";
import RecaptchaProvider from "@/components/RecaptchaProvider";

export const metadata: Metadata = {
  title: "Buynoe — Build Your Online Store",
  description: "India's #1 ecommerce platform for merchants. Start your free trial today.",
  icons: {
    // Standard browser favicon
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png",   sizes: "192x192", type: "image/png" },
    ],
    // Apple touch icon (iOS home screen, Safari pinned tab)
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    // Android / PWA
    other: [
      { rel: "manifest",             url: "/site.webmanifest" },
      { rel: "msapplication-config", url: "/browserconfig.xml" },
    ],
  },
  manifest: "/site.webmanifest",
  themeColor: "#ec1f78",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Buynoe",
  },
  other: {
    "msapplication-TileColor": "#ec1f78",
    "msapplication-TileImage": "/icon-192.png",
  },
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
