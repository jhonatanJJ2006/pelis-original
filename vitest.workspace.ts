import { defineWorkspace } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const commonExclude = ['**/node_modules/**', '**/e2e/**', '**/.next/**', '**/.turbo/**'];

export default defineWorkspace([
  {
    esbuild: { jsx: 'automatic' },
    resolve: {
      extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
    },
    test: {
      name: 'unit',
      environment: 'node',
      globals: true,
      include: [
        'packages/validators/src/**/*.test.ts',
        'apps/web/src/lib/**/*.test.ts',
        'apps/web/src/app/**/lib/**/*.test.ts',
        'apps/web/src/hooks/**/*.test.ts',
        'packages/ui/src/shared/**/*.test.ts',
        'packages/ui/src/features/**/*.test.ts',
        'packages/auth/src/**/*.test.ts',
        'packages/db/src/**/*.test.ts',
        'packages/player/src/**/*.test.ts',
        'packages/scripts-core/src/**/*.test.ts',
      ],
      exclude: commonExclude,
    },
  },
  {
    esbuild: { jsx: 'automatic' },
    resolve: {
      extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
      alias: {
        'next/link': fileURLToPath(new URL('./test/mocks/next-link.tsx', import.meta.url)),
        'next/image': fileURLToPath(new URL('./test/mocks/next-image.tsx', import.meta.url)),
      },
    },
    test: {
      name: 'components',
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./test/setup.ts'],
      include: [
        'packages/ui/src/**/*.test.tsx',
        'packages/player/src/**/*.test.tsx',
        'apps/web/src/components/**/*.test.tsx',
      ],
      exclude: commonExclude,
    },
  },
]);
