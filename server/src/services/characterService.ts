import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import {
  type CharacterClass,
  isValidClass,
  getStatsAtLevel,
  getAbilitiesForClassAtLevel,
  CLASS_PASSIVES,
  MAX_LEVEL,
  CLASS_LEVEL_UP_GAINS,
} from "../lib/constants";

export type CharacterInput = {
  name: string;
  class: string;
  avatarUrl?: string | null;
  userId: string;
};

export async function createCharacter(input: CharacterInput) {
  const { name, avatarUrl, userId } = input;
  const characterClass = input.class as CharacterClass;

  if (!isValidClass(characterClass)) {
    throw new Error(`Invalid class: ${characterClass}`);
  }

  const stats = getStatsAtLevel(characterClass, 1);

  const data: Prisma.CharacterCreateInput = {
    name,
    class: characterClass,
    level: 1,
    hp: stats.hp,
    maxHp: stats.hp,
    mana: stats.mana,
    maxMana: stats.mana,
    stamina: stats.stamina,
    maxStamina: stats.stamina,
    xp: 0,
    battlesWon: 0,

      user: { connect: { id: userId } },
    } as any;

  if (avatarUrl !== undefined) {
    data.avatarUrl = avatarUrl;
  }

  return prisma.character.create({ data });
}

export async function listCharacters(userId?: string) {
  if (userId) {
    return prisma.character.findMany({ where: { userId } });
  }
  return prisma.character.findMany();
}

export async function getCharacterById(id: string) {
  const character = await prisma.character.findUnique({ where: { id } });
  if (!character) return null;

  const characterClass = character.class as CharacterClass;
  const abilities = getAbilitiesForClassAtLevel(characterClass, character.level);
  const passive = CLASS_PASSIVES[characterClass];

  return { ...character, abilities, passive };
}

export async function updateCharacter(
  id: string,
  data: Partial<{ name: string; avatarUrl: string | null }>,
) {
  const updateData: Prisma.CharacterUpdateInput = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;

  return prisma.character.update({
    where: { id },
    data: updateData,
  });
}

export async function levelUpCharacter(id: string) {
  const character = await prisma.character.findUniqueOrThrow({ where: { id } });

  if (character.level >= MAX_LEVEL) {
    throw new Error(`Character is already at max level (${MAX_LEVEL})`);
  }

  const characterClass = character.class as CharacterClass;
  const newLevel = character.level + 1;
  const gains = CLASS_LEVEL_UP_GAINS[characterClass];
  const newStats = getStatsAtLevel(characterClass, newLevel);

  return prisma.character.update({
    where: { id },
    data: {
      level: newLevel,
      maxHp: newStats.hp,
      hp: newStats.hp, // fully heal on level up
      maxMana: newStats.mana,
      mana: newStats.mana, // fully restore mana on level up
      maxStamina: newStats.stamina,
      stamina: newStats.stamina, // fully restore stamina on level up
    },
  });
}

export async function addXp(id: string, amount: number) {
  const character = await prisma.character.findUniqueOrThrow({ where: { id } });
  const newXp = character.xp + amount;

  // xp threshold = level * 50
  const xpNeeded = character.level * 50;

  if (newXp >= xpNeeded && character.level < MAX_LEVEL) {
    // on level up reset xp to overflow amount
    const overflow = newXp - xpNeeded;
    await prisma.character.update({
      where: { id },
      data: { xp: overflow },
    });
    return levelUpCharacter(id);
  }

  return prisma.character.update({
    where: { id },
    data: { xp: newXp },
  });
}

export async function deleteCharacter(id: string) {
  // nuke related records first
  await prisma.partyCharacter.deleteMany({ where: { characterId: id } });
  await prisma.battleParticipant.deleteMany({ where: { characterId: id } });
  return prisma.character.delete({ where: { id } });
}
