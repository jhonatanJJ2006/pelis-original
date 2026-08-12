// One-shot seed for popular TV channels.
import { prisma } from '../src/client';
import '../src/registry-bootstrap';
import { invoke } from '../src/invoke';

async function main() {
  const result = await invoke({
    name: 'tv.seedPopularChannels',
    args: { dryRun: false },
    ctx: { userId: null, isAdmin: true },
  });
  console.log('TV seeded:', result);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });