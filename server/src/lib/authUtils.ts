import { prisma } from "../lib/prisma";

// verify that a user owns a party
export async function verifyPartyOwnership(
  partyId: string,
  userId: string
): Promise<boolean> {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
  });

  if (!party) return false;
  return party.userId === userId;
}
