import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

async function main() {
  const phone = process.argv[2] ?? '+50259755017';
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL es requerida');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const result = await prisma.user.updateMany({
      where: { phone },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
    console.log(`Desbloqueada(s): ${result.count} cuenta(s) con teléfono ${phone}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
