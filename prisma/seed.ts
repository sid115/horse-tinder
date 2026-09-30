import { PrismaClient } from "@prisma/client";
import { seedDemoData } from "./seed-data";

const prisma = new PrismaClient();

async function main() {
  await seedDemoData(prisma);
  console.log("Seed complete. Admin: admin/adminpass123 · Users: ann,ben,cara / password123");
}

main().finally(() => prisma.$disconnect());
