import { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Create Your Free Store — Buynoe",
  description: "Start selling online in minutes. Create your free Buynoe store — no coding required. Manage products, orders, payments and more from one dashboard.",
  keywords: ["create online store", "sell online india", "ecommerce platform", "free online store", "buynoe merchant"],
  openGraph: {
    title: "Create Your Free Store — Buynoe",
    description: "Start selling online in minutes. No coding required.",
    url: "https://ecomm.buynoe.com/register",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RegisterLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
