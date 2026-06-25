import { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Set New Password — Buynoe",
  description: "Set a new password for your Buynoe merchant account.",
  robots: { index: false, follow: false },
};

export default function ResetPasswordLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
