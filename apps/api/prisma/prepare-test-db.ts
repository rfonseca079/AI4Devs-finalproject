import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import {
  DevSeedError,
  assertNotProductionSeed,
  assertTestDatabaseName,
} from '../src/common/utils/admin-bootstrap';
import { runDevSeed } from './seed-dev';

function targetSummary(
  databaseUrl: string,
  nodeEnv: string | undefined,
): string {
  const parsed = new URL(databaseUrl);
  return [
    'Test database prepare target:',
    `- NODE_ENV: ${nodeEnv ?? '(unset)'}`,
    `- host: ${parsed.hostname || 'unknown'}`,
    `- port: ${parsed.port || '5432'}`,
    `- database: ${decodeURIComponent(parsed.pathname.replace(/^\//, '')) || 'unknown'}`,
  ].join('\n');
}

async function emptyDomainTables(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    await prisma.$transaction([
      prisma.workOrderTask.deleteMany(),
      prisma.workOrder.deleteMany(),
      prisma.vehicleOwnership.deleteMany(),
      prisma.vehicle.deleteMany(),
      prisma.client.deleteMany(),
      prisma.user.deleteMany(),
    ]);
  } finally {
    await prisma.$disconnect();
  }
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  assertNotProductionSeed(process.env.NODE_ENV);
  assertTestDatabaseName(databaseUrl);
  console.log(targetSummary(databaseUrl as string, process.env.NODE_ENV));
  await emptyDomainTables();
  await runDevSeed();
}

if (require.main === module) {
  main().catch(async (error: unknown) => {
    if (error instanceof DevSeedError) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    process.exit(1);
  });
}
