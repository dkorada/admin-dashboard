import { PrismaClient } from "@prisma/client";
import { DEMO_ACCOUNTS, seedDatabase } from "./seed-data.js";

const prisma = new PrismaClient();

seedDatabase(prisma)
  .then((counts) => {
    console.log(`Seeded ${counts.users} staff users, ${counts.customers} customers, ${counts.payments} payments.`);
    console.log("Demo accounts:");
    for (const a of DEMO_ACCOUNTS) console.log(`  ${a.role.padEnd(6)}  ${a.email}  /  ${a.password}`);
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
