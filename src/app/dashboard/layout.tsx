import { redirect } from "next/navigation";
import { getMerchant } from "@/lib/auth";
import Sidebar from "@/components/dashboard/Sidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import EmailVerifyBanner from "@/components/dashboard/EmailVerifyBanner";
import TrialExpiredGate from "@/components/dashboard/TrialExpiredGate";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const merchant = await getMerchant();
  if (!merchant) redirect("/login");

  const trialExpired =
    merchant.plan === "TRIAL" &&
    !!merchant.trialEndsAt &&
    new Date(merchant.trialEndsAt) < new Date();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar storeName={merchant.store?.name} plan={merchant.plan} logo={merchant.store?.logo ?? undefined} />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader
          storeName={merchant.store?.name ?? ""}
          storeSlug={merchant.store?.slug ?? ""}
          merchantName={merchant.name}
          merchantEmail={merchant.email}
          plan={merchant.plan}
        />
        {!merchant.emailVerified && <EmailVerifyBanner email={merchant.email} />}
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
      <TrialExpiredGate trialExpired={trialExpired} merchantName={merchant.name} />
    </div>
  );
}
