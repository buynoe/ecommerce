import { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Reset Password — Buynoe",
  description: "Forgot your Buynoe password? Enter your email to receive a reset link.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
