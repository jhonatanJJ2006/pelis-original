/**
 * Persist canonical Spanish category / country / language / title
 * onto existing TVChannel rows. Does not add streams.
 */
import { PrismaClient } from "@prisma/client";
import { normalizeChannelFields } from "../src/lib/tv-taxonomy";

const prisma = new PrismaClient();

async function main() {
  const channels = await prisma.tVChannel.findMany({
    select: {
      id: true,
      name: true,
      category: true,
      country: true,
      language: true,
    },
  });

  let updated = 0;
  const categoryCounts = new Map<string, number>();

  for (const ch of channels) {
    const next = normalizeChannelFields(ch);
    const changed =
      next.name !== ch.name ||
      next.category !== ch.category ||
      next.country !== (ch.country ?? null) ||
      next.language !== (ch.language ?? "es");
    categoryCounts.set(next.category, (categoryCounts.get(next.category) ?? 0) + 1);
    if (!changed) continue;
    await prisma.tVChannel.update({
      where: { id: ch.id },
      data: {
        name: next.name,
        category: next.category,
        country: next.country,
        language: next.language,
      },
    });
    updated++;
  }

  console.log("normalized " + updated + " of " + channels.length + " channels");
  const sorted = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1]);
  for (const [cat, n] of sorted) {
    console.log("  " + cat + ": " + n);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
