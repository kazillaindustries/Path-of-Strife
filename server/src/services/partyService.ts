import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { PARTY_SLOT_UNLOCKS } from "../lib/constants";

// get max party size based on best wins
function getMaxPartySize(characters: { battlesWon: number }[]): number {
  const bestWins = characters.length > 0 ? Math.max(...characters.map((c) => c.battlesWon)) : 0;

  let maxSlots = 1;
  for (const [slots, winsNeeded] of Object.entries(PARTY_SLOT_UNLOCKS)) {
    if (bestWins >= winsNeeded) {
      maxSlots = Math.max(maxSlots, Number(slots));
    }
  }
  return maxSlots;
}

export async function createParty(userId: string, name: string, characterIds?: string[]) {
  // check slots if adding chars straight up
  if (characterIds && characterIds.length > 0) {
    const characters = await prisma.character.findMany({
      where: { id: { in: characterIds } },
      select: { battlesWon: true },
    });
    const maxSlots = getMaxPartySize(characters);
    if (characterIds.length > maxSlots) {
      throw new Error(
        `Cannot create party with ${characterIds.length} members. Max slots unlocked: ${maxSlots}.`,
      );
    }
  }

  const data: Prisma.PartyCreateInput = {
    name,
    user: { connect: { id: userId } },
  };

  if (characterIds && characterIds.length > 0) {
    data.members = {
      create: characterIds.map((characterId) => ({
        character: { connect: { id: characterId } },
      })),
    };
  }

  return prisma.party.create({
    data,
    include: {
      members: {
        include: {
          character: true,
        },
      },
    },
  });
}

export async function getPartyById(id: string) {
  return prisma.party.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          character: true,
        },
      },
    },
  });
}

export async function getPartiesForUser(userId: string) {
  return prisma.party.findMany({
    where: { userId },
    include: {
      members: {
        include: { character: true },
      },
    },
  });
}

export async function addCharacterToParty(partyId: string, characterId: string) {
  // get party and its members
  const party = await prisma.party.findUniqueOrThrow({
    where: { id: partyId },
    include: {
      members: {
        include: { character: { select: { battlesWon: true } } },
      },
    },
  });

  // block dupes
  if (party.members.some((m: any) => m.characterId === characterId)) {
    throw new Error("Character is already in this party.");
  }

  // grab new char stats for slot math
  const newChar = await prisma.character.findUniqueOrThrow({
    where: { id: characterId },
    select: { battlesWon: true },
  });

  // calc max slots with everyone
  const allChars = [...party.members.map((m: any) => m.character), newChar];
  const maxSlots = getMaxPartySize(allChars);

  if (party.members.length + 1 > maxSlots) {
    throw new Error(`Party is full. Current members: ${party.members.length}/${maxSlots}.`);
  }

  return prisma.partyCharacter.create({
    data: {
      party: { connect: { id: partyId } },
      character: { connect: { id: characterId } },
    },
  });
}

export async function removeCharacterFromParty(partyId: string, characterId: string) {
  // deleteMany is chill if it doesnt exist
  const result = await prisma.partyCharacter.deleteMany({
    where: {
      partyId,
      characterId,
    },
  });
  return result;
}

export async function updatePartyGold(partyId: string, gold: number) {
  return prisma.party.update({
    where: { id: partyId },
    data: { gold },
  });
}

export async function addGoldToParty(partyId: string, amount: number) {
  const party = await prisma.party.findUniqueOrThrow({ where: { id: partyId } });
  return prisma.party.update({
    where: { id: partyId },
    data: { gold: party.gold + amount },
  });
}

export async function getPartySlotInfo(partyId: string) {
  const party = await prisma.party.findUniqueOrThrow({
    where: { id: partyId },
    include: {
      members: {
        include: { character: { select: { battlesWon: true } } },
      },
    },
  });

  const maxSlots = getMaxPartySize(party.members.map((m: any) => m.character));
  const bestWins =
    party.members.length > 0 ? Math.max(...party.members.map((m: any) => m.character.battlesWon)) : 0;

  // find next slot unlock
  const sortedThresholds = Object.entries(PARTY_SLOT_UNLOCKS)
    .map(([slots, wins]) => ({ slots: Number(slots), wins }))
    .sort((a, b) => a.wins - b.wins);

  const nextUnlock = sortedThresholds.find((t) => t.wins > bestWins);

  return {
    currentMembers: party.members.length,
    maxSlots,
    bestBattlesWon: bestWins,
    nextUnlock: nextUnlock ? { slots: nextUnlock.slots, battlesWonNeeded: nextUnlock.wins } : null,
  };
}

export async function deleteParty(partyId: string) {
  // nuke battles tied to this party's runs
  const runs = await prisma.run.findMany({
    where: { partyId },
    select: { id: true },
  });

  const runIds = runs.map((r: any) => r.id);

  // nuke those run battles
  if (runIds.length > 0) {
    await prisma.battle.deleteMany({
      where: { runId: { in: runIds } },
    });
  }

  // nuke all runs
  await prisma.run.deleteMany({
    where: { partyId },
  });

  // nuke members
  await prisma.partyCharacter.deleteMany({
    where: { partyId },
  });

  // nuke the party
  return prisma.party.delete({
    where: { id: partyId },
  });
}
