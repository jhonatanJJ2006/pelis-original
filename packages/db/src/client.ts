import { PrismaClient } from '@prisma/client';

/**
 * Pool por proceso. Con varios workers de Next (cluster) cada uno abre su propio
 * pool, así que lo acotamos para no agotar `max_connections` de Postgres.
 * PRISMA_CONNECTION_LIMIT / PRISMA_POOL_TIMEOUT permiten ajustarlo.
 */
export function withPoolParams(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  try {
    const url = new URL(raw);
    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', process.env.PRISMA_CONNECTION_LIMIT ?? '10');
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', process.env.PRISMA_POOL_TIMEOUT ?? '20');
    }
    return url.toString();
  } catch {
    return raw;
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: withPoolParams(process.env.DATABASE_URL) } },
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
