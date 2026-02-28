const { prisma } = require('../dist/lib/prisma');

async function main() {
  const characters = await prisma.character.findMany();
  for (const c of characters) {
    if (c.userId) continue;

    const partyChars = await prisma.partyCharacter.findMany({ where: { characterId: c.id }, include: { party: true } });
    const userIds = Array.from(new Set(partyChars.map(pc => pc.party?.userId).filter(Boolean)));

    if (userIds.length === 1) {
      await prisma.character.update({ where: { id: c.id }, data: { userId: userIds[0] } });
      console.log(`Backfilled character ${c.id} -> user ${userIds[0]}`);
    } else if (userIds.length > 1) {
      console.warn(`Character ${c.id} referenced by parties with multiple owners: ${userIds.join(', ')} — skipping`);
    } else {
      console.log(`Character ${c.id} has no owning party, left unassigned`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
