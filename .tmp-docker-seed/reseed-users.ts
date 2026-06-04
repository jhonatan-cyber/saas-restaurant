import 'dotenv/config';
import { PrismaClient, Role, UserStatus } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as bcrypt from 'bcrypt';

function parseDbUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port) || 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''),
    prepareCacheLength: 0,
  };
}

const adapter = new PrismaMariaDb(parseDbUrl(process.env.DATABASE_URL!));
const prisma = new PrismaClient({ adapter });

const USERS = [
  { email: 'owner@demo.test', password: 'Owner123!', fullName: 'Carlos Propietario', role: Role.OWNER, branchCode: null },
  { email: 'admin@demo.test', password: 'Admin123!', fullName: 'Ana Administradora', role: Role.ADMIN, branchCode: null },
  { email: 'cajero@demo.test', password: 'Cajero123!', fullName: 'Luis Cajero', role: Role.CAJERO, branchCode: 'CENTRO' },
  { email: 'mesero@demo.test', password: 'Mesero123!', fullName: 'Mar?a Mesera', role: Role.MESERO, branchCode: 'CENTRO' },
  { email: 'cocina@demo.test', password: 'Cocina123!', fullName: 'Pedro Cocinero', role: Role.COCINA, branchCode: 'CENTRO' },
] as const;

async function main() {
  const business = await prisma.business.findUniqueOrThrow({ where: { slug: 'demo' } });
  const branches = await prisma.branch.findMany({ where: { businessId: business.id } });
  const branchMap = new Map(branches.map((b) => [b.code, b.id]));

  await prisma.shift.deleteMany({ where: { businessId: business.id } });
  await prisma.cashRegister.deleteMany({ where: { businessId: business.id } });
  await prisma.user.deleteMany({ where: { businessId: business.id } });

  for (const u of USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.create({
      data: {
        businessId: business.id,
        email: u.email,
        passwordHash,
        fullName: u.fullName,
        role: u.role,
        status: UserStatus.ACTIVE,
        defaultBranchId: u.branchCode ? branchMap.get(u.branchCode) ?? null : null,
      },
    });
  }

  console.log('users recreated');
}

main().catch((err) => { console.error(err); process.exit(1); }).finally(() => prisma.$disconnect());
