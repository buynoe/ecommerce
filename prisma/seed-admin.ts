import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const ADMIN_EMAIL    = "kiruthika@buynoe.com";
const ADMIN_NAME     = "Kiruthika";
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD || "9sW6Pe6AqDgfrT";

async function main() {
  const existing = await prisma.admin.findUnique({ where: { email: ADMIN_EMAIL } });

  if (existing) {
    console.log(`Admin already exists: ${ADMIN_EMAIL} — skipping.`);
    return;
  }

  const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);

  await prisma.admin.create({
    data: {
      name:     ADMIN_NAME,
      email:    ADMIN_EMAIL,
      password: hashed,
      role:     "SUPER_ADMIN",
    },
  });

  console.log("✅ Admin created successfully");
  console.log(`   Email   : ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log(`   Role    : SUPER_ADMIN`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
