import { execSync } from 'child_process';

/**
 * E2E must not wipe the developer's database. On loopback, a name that does
 * not already contain "test" is rewritten to "<name>_test" before prepare.
 */
export function useLoopbackTestDatabase(): void {
  const current = process.env.DATABASE_URL;
  if (!current) {
    throw new Error('DATABASE_URL is required for e2e');
  }

  const url = new URL(current);
  if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    return;
  }

  const name = decodeURIComponent(url.pathname.replace(/^\//, ''));
  if (!name.toLowerCase().includes('test')) {
    url.pathname = `/${name}_test`;
    process.env.DATABASE_URL = url.toString();
  }
}

export function migrateAndPrepareTestDatabase(): void {
  useLoopbackTestDatabase();
  const options = {
    cwd: process.cwd(),
    stdio: 'inherit' as const,
    env: process.env,
  };
  execSync('npx prisma migrate deploy', options);
  execSync('npm run db:prepare:test', options);
}
