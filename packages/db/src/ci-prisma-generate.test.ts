import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

function readRepoFile(relativePath: string) {
  return readFileSync(resolve(repoRoot, relativePath), 'utf8');
}

describe('prisma generate antes de next/build:vercel', () => {
  it('@pelis/db#build genera el cliente Prisma', () => {
    const pkg = JSON.parse(readRepoFile('packages/db/package.json')) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts.build).toMatch(/prisma generate/);
  });

  it('turbo build:vercel depende de ^build para correr @pelis/db#build', () => {
    const turbo = JSON.parse(readRepoFile('turbo.json')) as {
      tasks: Record<string, { dependsOn?: string[] }>;
    };
    expect(turbo.tasks['build:vercel']?.dependsOn).toContain('^build');
  });

  it('el script raíz build:vercel corre el pipeline turbo de @pelis/web', () => {
    const pkg = JSON.parse(readRepoFile('package.json')) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts['build:vercel']).toMatch(/turbo run build:vercel --filter=@pelis\/web/);
  });

  it('apps/web build:vercel genera Prisma antes de next build', () => {
    const pkg = JSON.parse(readRepoFile('apps/web/package.json')) as {
      scripts: Record<string, string>;
    };
    const script = pkg.scripts['build:vercel'];
    expect(script).toMatch(/@pelis\/db/);
    expect(script).toMatch(/prisma generate/);
    expect(script.indexOf('prisma generate')).toBeLessThan(script.indexOf('next build'));
  });

  it('el job deploy de CI genera el cliente antes de pnpm build:vercel', () => {
    const ci = readRepoFile('.github/workflows/ci.yml');
    const deployStart = ci.indexOf('\n  deploy:');
    expect(deployStart).toBeGreaterThan(-1);
    const deploy = ci.slice(deployStart);
    const generateAt = deploy.indexOf('prisma generate');
    const vercelAt = deploy.indexOf('pnpm build:vercel');
    expect(generateAt).toBeGreaterThan(-1);
    expect(vercelAt).toBeGreaterThan(-1);
    expect(generateAt).toBeLessThan(vercelAt);
  });
});
