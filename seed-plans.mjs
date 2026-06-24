import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adapter = new PrismaLibSql({ url: `file:${path.join(__dirname, "prisma/dev.db")}` });
const prisma = new PrismaClient({ adapter });

const PLANS = [
  {
    key: "TRIAL",
    name: "Free Trial",
    price: 0,
    sortOrder: 0,
    description: "Try Buynoe free for 30 days — no credit card needed",
    features: JSON.stringify([
      "1 store",
      "500 products",
      "500 orders/month",
      "Razorpay & COD",
      "Standard shipping (Delhivery)",
      "Email support",
    ]),
    isPopular: false,
    isActive: true,
  },
  {
    key: "BASIC",
    name: "Basic",
    price: 299900,
    sortOrder: 1,
    description: "Perfect for new merchants just getting started",
    features: JSON.stringify([
      "1 store",
      "500 products",
      "2,000 orders/month",
      "Razorpay, COD & UPI payments",
      "Standard shipping (Delhivery)",
      "Discounts & coupons",
      "Basic analytics",
      "Email support",
    ]),
    isPopular: false,
    isActive: true,
  },
  {
    key: "PRO",
    name: "Pro",
    price: 499900,
    sortOrder: 2,
    description: "For growing businesses that need more power",
    features: JSON.stringify([
      "1 store",
      "1,000 products",
      "Unlimited orders",
      "All payment gateways",
      "All 5 shipping carriers",
      "Advanced discounts & coupons",
      "Advanced analytics",
      "Priority support",
      "Staff accounts",
    ]),
    isPopular: true,
    isActive: true,
  },
];

async function run() {
  for (const p of PLANS) {
    await prisma.plan.upsert({ where: { key: p.key }, update: p, create: p });
    console.log("Seeded:", p.key, `₹${(p.price / 100).toFixed(0)}/mo`);
  }
  // Deactivate Enterprise
  await prisma.plan.updateMany({ where: { key: "ENTERPRISE" }, data: { isActive: false } });
  console.log("Enterprise deactivated.");
  await prisma.$disconnect();
  console.log("Done.");
}

run().catch((e) => { console.error(e); process.exit(1); });
