import { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Merchant Login — Buynoe",
  description: "Sign in to your Buynoe merchant account to manage your online store, products, orders, and customers.",
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
