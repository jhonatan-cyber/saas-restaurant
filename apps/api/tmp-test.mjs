import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
const adapter = new PrismaMariaDb({
  host: "127.0.0.1",
  port: 3306,
  user: "saas_app",
  password: "saas_dev_2026",
  database: "saas_restaurant",
  prepareCacheLength: 0,
});
const prisma = new PrismaClient({ adapter });
const r = await prisma.$queryRawUnsafe("SELECT 1 as test");
console.log("OK:", r);
