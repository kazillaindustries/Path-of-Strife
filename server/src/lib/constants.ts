// big chungus class data
export const MARTIAL_CLASSES = ["Warrior", "Berserker", "Rogue", "Marksman"] as const; // melee flavor
export const CASTER_CLASSES = ["Mage", "Cleric", "Warlock", "Druid"] as const; // magic flavor
export const GISH_CLASSES = ["Paladin", "Spellblade", "DarkKnight", "Bard"] as const; // fucking guess

export const ALL_CLASSES = [...MARTIAL_CLASSES, ...CASTER_CLASSES, ...GISH_CLASSES] as const;

export type CharacterClass = (typeof ALL_CLASSES)[number];

export function isMartialClass(characterClass: string): boolean {
  return MARTIAL_CLASSES.includes(characterClass as any);
}

export function isCasterClass(characterClass: string): boolean {
  return CASTER_CLASSES.includes(characterClass as any);
}

export function isGishClass(characterClass: string): boolean {
  return GISH_CLASSES.includes(characterClass as any);
}

export function isValidClass(characterClass: string): boolean {
  return ALL_CLASSES.includes(characterClass as any);
}

export function classUsesStamina(characterClass: string): boolean {
  return isMartialClass(characterClass) || isGishClass(characterClass);
}

export function classUsesMana(characterClass: string): boolean {
  return isCasterClass(characterClass) || isGishClass(characterClass);
}

// class starting values and shi
export const CLASS_BASE_STATS: Record<
  CharacterClass,
  { hp: number; stamina: number; mana: number }
> = {
  // Martial
  Warrior: { hp: 60, stamina: 40, mana: 0 },
  Berserker: { hp: 55, stamina: 45, mana: 0 },
  Rogue: { hp: 50, stamina: 45, mana: 0 },
  Marksman: { hp: 55, stamina: 40, mana: 0 },
  // Caster
  Mage: { hp: 40, stamina: 0, mana: 60 },
  Cleric: { hp: 45, stamina: 0, mana: 60 },
  Warlock: { hp: 45, stamina: 0, mana: 65 },
  Druid: { hp: 50, stamina: 0, mana: 60 },
  // Gish
  Paladin: { hp: 55, stamina: 35, mana: 45 },
  Spellblade: { hp: 50, stamina: 35, mana: 40 },
  DarkKnight: { hp: 55, stamina: 40, mana: 30 },
  Bard: { hp: 45, stamina: 38, mana: 50 },
};

export const CLASS_LEVEL_UP_GAINS: Record<
  CharacterClass,
  { hp: number; stamina: number; mana: number }
> = {
  // Martial
  Warrior: { hp: 8, stamina: 3, mana: 0 },
  Berserker: { hp: 7, stamina: 4, mana: 0 },
  Rogue: { hp: 6, stamina: 4, mana: 0 },
  Marksman: { hp: 7, stamina: 3, mana: 0 },
  // Caster
  Mage: { hp: 5, stamina: 0, mana: 5 },
  Cleric: { hp: 6, stamina: 0, mana: 5 },
  Warlock: { hp: 5, stamina: 0, mana: 6 },
  Druid: { hp: 6, stamina: 0, mana: 5 },
  // Gish
  Paladin: { hp: 7, stamina: 2, mana: 3 },
  Spellblade: { hp: 6, stamina: 2, mana: 3 },
  DarkKnight: { hp: 7, stamina: 3, mana: 2 },
  Bard: { hp: 5, stamina: 2, mana: 3 },
};

export const CLASS_PASSIVES: Record<CharacterClass, string> = {
  // Martial
  Warrior: "Resilient - +10% max HP",
  Berserker: "Bloodletter - +2% damage per 10% missing HP",
  Rogue: "Surgical Precision - +15% crit chance",
  Marksman: "Sharpshooter - +10% damage when Hunter's Mark active",
  // Caster
  Mage: "Disciplined - Meditate gives double mana back",
  Cleric: "Benediction - +20% healing received",
  Warlock: "Power in Misery - debuffed enemies also get poisoned for 3 turns",
  Druid: "Thorns - enemies that hit Druid take 2×level damage",
  // Gish
  Paladin: "Shield of Faith - 10% less damage taken when below 50% HP",
  Spellblade: "Spellvamp - grants 20% of damage dealt as mana",
  DarkKnight: "Goredrinker - abilities heal for 20% of damage dealt",
  Bard: "Treasure Hunter - +25% gold gained from battles",
};

// level cap
export const MAX_LEVEL = 10;

// ability unlock levels
export const ABILITY_UNLOCK_LEVELS = [1, 3, 6, 10] as const;

// recovery actions rest/meditate 50% of max except for mage i think
export const REST_STAMINA_RECOVERY = 50;
export const MEDITATE_MANA_RECOVERY = 50;

// post fight healing/recovery/meditation
export const RUN_BETWEEN_BATTLE_HP_HEAL_PERCENT = 30;
export const RUN_BETWEEN_BATTLE_MANA_RESTORE_PERCENT = 50;
export const RUN_BETWEEN_BATTLE_STAMINA_RESTORE_PERCENT = 50;

// big money
export const RUN_AREA_REWARD_MULTIPLIERS = [1.0, 1.5, 2.0, 3.0];
export const RUN_COMPLETION_BONUS_XP = 100;
export const RUN_COMPLETION_BONUS_GOLD = 50;

// rest stop bs

export type RestStopServiceKey = "fullHeal" | "damageBuff" | "protection" | "revive" | "shield";

export interface RestStopService {
  name: string;
  description: string;
  costs: number[]; // cost per area cleared
  instant: boolean; // true = one time effect | false = lasts whole next area
}

export const REST_STOP_SERVICES: Record<RestStopServiceKey, RestStopService> = {
  fullHeal: {
    name: "Full Heal",
    description: "Restore entire party to 100% HP, Mana, and Stamina",
    costs: [30, 60, 100],
    instant: true,
  },
  revive: {
    name: "Revive Blessing",
    description: "Dead characters revive at 100% HP instead of 30%",
    costs: [20, 45, 80],
    instant: true,
  },
  damageBuff: {
    name: "Damage Blessing",
    description: "+20% party damage for the next area (3 battles)",
    costs: [40, 75, 120],
    instant: false,
  },
  protection: {
    name: "Protection Blessing",
    description: "-20% damage taken for the next area (3 battles)",
    costs: [35, 65, 110],
    instant: false,
  },
  shield: {
    name: "Shield Blessing",
    description:
      "Each party member starts every battle in the next area with a shield (50% reduction on first hit)",
    costs: [25, 50, 90],
    instant: false,
  },
};

// party slot progression
// made the game harder so this is kinda useless now cuz you need muscle
export const PARTY_SLOT_UNLOCKS: Record<number, number> = {
  1: 0,
  2: 0,
  3: 0,
  4: 0,
};

// dice rolling function big brain shit
export function rollDice(count: number, sides: number): number {
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += Math.floor(Math.random() * sides) + 1;
  }
  return total;
}

// ability related types
export type ResourceType = "stamina" | "mana";

export interface AbilityEffect {
  damage?: { dice: number; sides: number; modifier?: number };
  selfDamage?: { dice: number; sides: number; modifier?: number };
  heal?: { dice: number; sides: number; modifier?: number };
  healPercent?: number;
  burn?: { dice: number; sides: number; turns: number };
  poison?: { dice: number; sides: number; turns: number };
  slow?: { turns: number };
  blind?: { chance: number; turns: number };
  bossDamageReduction?: { percent: number; turns: number };
  selfWeakness?: { dice: number; sides: number; modifier?: number; turns: number };
  partyDamageBuff?: { percent: number; turns: number };
  selfDamageBuff?: { percent: number; turns: number };
  huntersMark?: { percent: number; turns: number };
  vulnerability?: { percent: number; turns: number };
  haste?: boolean;
  partyEvasion?: { percent: number; turns: number };
  toggle?: string; // toggle effect eg frenzy for the zerker
  aoe?: boolean;
  hitTwice?: boolean;
  hitTwiceIfMarked?: boolean; // hits twice if best ranger ability
  autoCritAbove50?: boolean;
  autoCritIfFullHP?: boolean; // rogue assassinate
  critChance?: number; // 0.00-1.00
  parry?: { maxDamagePerLevel: number; reflectPercent: number };
  shieldUntilHit?: { damageReduction: number };
  extraDamagePerAlly?: { dice: number; sides: number };
}

export interface Ability {
  name: string;
  unlockLevel: number;
  cost: number;
  costType: ResourceType;
  description: string;
  effects: AbilityEffect;
}

export const CLASS_ABILITIES: Record<CharacterClass, Ability[]> = {
  // martial class abilities
  Warrior: [
    {
      name: "Slash",
      unlockLevel: 1,
      cost: 10,
      costType: "stamina",
      description: "A powerful sword slash",
      effects: { damage: { dice: 2, sides: 6, modifier: 3 } },
    },
    {
      name: "Shield Bash",
      unlockLevel: 3,
      cost: 15,
      costType: "stamina",
      description: "Bash with shield, dazing the target and reducing their damage",
      effects: {
        damage: { dice: 1, sides: 8, modifier: 2 },
        bossDamageReduction: { percent: 50, turns: 1 },
      },
    },
    {
      name: "Rallying Cry",
      unlockLevel: 6,
      cost: 20,
      costType: "stamina",
      description: "Rally yourself or a target ally, healing them and boosting your damage",
      effects: {
        heal: { dice: 2, sides: 6, modifier: 5 },
        selfDamageBuff: { percent: 25, turns: 2 },
      },
    },
    {
      name: "Bladestorm",
      unlockLevel: 10,
      cost: 35,
      costType: "stamina",
      description: "A devastating whirlwind of blades",
      effects: { damage: { dice: 4, sides: 8, modifier: 5 }, aoe: true },
    },
  ],

  Berserker: [
    {
      name: "Cleave",
      unlockLevel: 1,
      cost: 10,
      costType: "stamina",
      description: "A wild axe swing",
      effects: { damage: { dice: 2, sides: 6, modifier: 2 }, aoe: true },
    },
    {
      name: "Frenzy",
      unlockLevel: 3,
      cost: 0,
      costType: "stamina",
      description: "Toggle: +50% damage dealt, +25% damage taken",
      effects: { toggle: "frenzy" },
    },
    {
      name: "Blood Fury",
      unlockLevel: 6,
      cost: 25,
      costType: "stamina",
      description: "Furious strike that heals from bloodlust",
      effects: { damage: { dice: 2, sides: 8, modifier: 3 }, healPercent: 25 },
    },
    {
      name: "Reckless Abandon",
      unlockLevel: 10,
      cost: 40,
      costType: "stamina",
      description: "Massive blow that damages self",
      effects: { damage: { dice: 4, sides: 10 }, selfDamage: { dice: 2, sides: 6 } },
    },
  ],

  Rogue: [
    {
      name: "Backstab",
      unlockLevel: 1,
      cost: 10,
      costType: "stamina",
      description: "Strike from the shadows with high crit chance",
      effects: { damage: { dice: 1, sides: 6, modifier: 2 }, critChance: 0.3 },
    },
    {
      name: "Parry & Riposte",
      unlockLevel: 3,
      cost: 15,
      costType: "stamina",
      description: "Parry next attack, reflect half of blocked damage",
      effects: { parry: { maxDamagePerLevel: 3, reflectPercent: 50 } },
    },
    {
      name: "Poisoned Blade",
      unlockLevel: 6,
      cost: 20,
      costType: "stamina",
      description: "Envenomed strike that poisons the target",
      effects: {
        damage: { dice: 1, sides: 8, modifier: 2 },
        poison: { dice: 1, sides: 4, turns: 3 },
      },
    },
    {
      name: "Assassinate",
      unlockLevel: 10,
      cost: 35,
      costType: "stamina",
      description:
        "Lethal strike, auto-crits if target is at full HP. Can't use abilities next turn.",
      effects: { damage: { dice: 3, sides: 8 }, autoCritIfFullHP: true },
    },
  ],

  Marksman: [
    {
      name: "Precise Shot",
      unlockLevel: 1,
      cost: 10,
      costType: "stamina",
      description: "A carefully aimed shot",
      effects: { damage: { dice: 2, sides: 6 } },
    },
    {
      name: "Hunter's Mark",
      unlockLevel: 3,
      cost: 15,
      costType: "stamina",
      description: "Mark the target, boosting all party damage",
      effects: { huntersMark: { percent: 25, turns: 3 } },
    },
    {
      name: "Pinning Shot",
      unlockLevel: 6,
      cost: 20,
      costType: "stamina",
      description: "Pin the target, reducing their damage",
      effects: {
        damage: { dice: 1, sides: 8, modifier: 2 },
        bossDamageReduction: { percent: 25, turns: 2 },
      },
    },
    {
      name: "Rain of Arrows",
      unlockLevel: 10,
      cost: 35,
      costType: "stamina",
      description: "A devastating volley hitting all enemies",
      effects: { damage: { dice: 4, sides: 6 }, aoe: true, hitTwiceIfMarked: true },
    },
  ],

  // caster class abilities
  Mage: [
    {
      name: "Firebolt",
      unlockLevel: 1,
      cost: 10,
      costType: "mana",
      description: "Launch a bolt of fire that burns",
      effects: {
        damage: { dice: 2, sides: 6, modifier: 2 },
        burn: { dice: 1, sides: 4, turns: 2 },
      },
    },
    {
      name: "Frost Nova",
      unlockLevel: 3,
      cost: 15,
      costType: "mana",
      description: "Blast of frost that slows the target",
      effects: { damage: { dice: 1, sides: 8 }, slow: { turns: 2 } },
    },
    {
      name: "Lightning Bolt",
      unlockLevel: 6,
      cost: 25,
      costType: "mana",
      description: "A powerful bolt of lightning",
      effects: { damage: { dice: 3, sides: 8 } },
    },
    {
      name: "Meteor",
      unlockLevel: 10,
      cost: 40,
      costType: "mana",
      description: "Summon a meteor, crashing down on all enemies",
      effects: { damage: { dice: 5, sides: 8, modifier: 5 }, aoe: true },
    },
  ],

  Cleric: [
    {
      name: "Prayer",
      unlockLevel: 1,
      cost: 15,
      costType: "mana",
      description: "Restore HP to a target",
      effects: { heal: { dice: 2, sides: 6, modifier: 3 } },
    },
    {
      name: "Divine Shield",
      unlockLevel: 3,
      cost: 20,
      costType: "mana",
      description: "Shield that reduces next incoming damage by 50%",
      effects: { shieldUntilHit: { damageReduction: 50 } },
    },
    {
      name: "Heavenstrike",
      unlockLevel: 6,
      cost: 25,
      costType: "mana",
      description: "Holy damage, extra per living ally",
      effects: { damage: { dice: 2, sides: 8 }, extraDamagePerAlly: { dice: 1, sides: 6 } },
    },
    {
      name: "Consecration",
      unlockLevel: 10,
      cost: 45,
      costType: "mana",
      description: "Holy rite that heals and weakens boss",
      effects: {
        heal: { dice: 3, sides: 8, modifier: 5 },
        bossDamageReduction: { percent: 50, turns: 3 },
      },
    },
  ],

  Warlock: [
    {
      name: "Hex",
      unlockLevel: 1,
      cost: 12,
      costType: "mana",
      description: "Curse the target, weakening their attacks",
      effects: { blind: { chance: 0.5, turns: 3 } },
    },
    {
      name: "Life Drain",
      unlockLevel: 3,
      cost: 18,
      costType: "mana",
      description: "Drain the targets life force",
      effects: { damage: { dice: 2, sides: 6 }, healPercent: 50 },
    },
    {
      name: "Curse of Misery",
      unlockLevel: 6,
      cost: 28,
      costType: "mana",
      description: "Summons a whirling darkness that curses all enemies",
      effects: {
        damage: { dice: 1, sides: 8 },
        aoe: true,
        bossDamageReduction: { percent: 50, turns: 2 },
      },
    },
    {
      name: "Drain Soul",
      unlockLevel: 10,
      cost: 40,
      costType: "mana",
      description: "Rip the soul from the target, but at a cost",
      effects: {
        damage: { dice: 4, sides: 8 },
        healPercent: 75,
        selfWeakness: { dice: 1, sides: 4, modifier: 2, turns: 3 },
      },
    },
  ],

  Druid: [
    {
      name: "Beast Claw",
      unlockLevel: 1,
      cost: 12,
      costType: "mana",
      description: "Strike with primal claws",
      effects: { damage: { dice: 1, sides: 8, modifier: 1 } },
    },
    {
      name: "Regrowth",
      unlockLevel: 3,
      cost: 16,
      costType: "mana",
      description: "Use nature's bounty to restore health",
      effects: { heal: { dice: 1, sides: 8, modifier: 2 } },
    },
    {
      name: "Entangle",
      unlockLevel: 6,
      cost: 24,
      costType: "mana",
      description: "Thorned vines entangle the target, weakening attacks",
      effects: { damage: { dice: 1, sides: 8 }, bossDamageReduction: { percent: 40, turns: 2 } },
    },
    {
      name: "Spore Cloud",
      unlockLevel: 10,
      cost: 38,
      costType: "mana",
      description: "Toxic spore cloud that poisons all enemies",
      effects: {
        damage: { dice: 2, sides: 6 },
        aoe: true,
        poison: { dice: 1, sides: 4, turns: 3 },
      },
    },
  ],

  // gish class abilities
  Paladin: [
    {
      name: "Blinding Smite",
      unlockLevel: 1,
      cost: 10,
      costType: "stamina",
      description: "Holy strike that blinds the target",
      effects: { damage: { dice: 2, sides: 6, modifier: 2 }, blind: { chance: 0.5, turns: 2 } },
    },
    {
      name: "Healing Hands",
      unlockLevel: 3,
      cost: 15,
      costType: "mana",
      description: "Healing touch that restores HP",
      effects: { heal: { dice: 1, sides: 8, modifier: 3 } },
    },
    {
      name: "Crusader Strike",
      unlockLevel: 6,
      cost: 20,
      costType: "stamina",
      description: "Strike with conviction and prejudice",
      effects: { damage: { dice: 2, sides: 8, modifier: 2 } },
    },
    {
      name: "Divine Judgment",
      unlockLevel: 10,
      cost: 40,
      costType: "mana",
      description: "Holy judgment that damages, heals, and protects",
      effects: {
        damage: { dice: 4, sides: 6 },
        healPercent: 50,
        bossDamageReduction: { percent: 25, turns: 2 },
      },
    },
  ],

  Spellblade: [
    {
      name: "Fire Slash",
      unlockLevel: 1,
      cost: 10,
      costType: "stamina",
      description: "Flame-infused blade strike",
      effects: {
        damage: { dice: 2, sides: 8, modifier: 2 },
        burn: { dice: 1, sides: 4, turns: 2 },
      },
    },
    {
      name: "Magical Surge",
      unlockLevel: 3,
      cost: 15,
      costType: "mana",
      description: "A blast of arcane energy",
      effects: { damage: { dice: 2, sides: 8 } },
    },
    {
      name: "Wind Dance",
      unlockLevel: 6,
      cost: 20,
      costType: "stamina",
      description: "Releases waves of cutting wind",
      effects: { damage: { dice: 2, sides: 6, modifier: 3 }, hitTwice: true },
    },
    {
      name: "Arcane Burst",
      unlockLevel: 10,
      cost: 40,
      costType: "mana",
      description: "Massive arcane explosion hitting all enemies",
      effects: { damage: { dice: 5, sides: 8 }, aoe: true },
    },
  ],

  DarkKnight: [
    {
      name: "Shadow Strike",
      unlockLevel: 1,
      cost: 10,
      costType: "stamina",
      description: "Dark blade strike that weakens the target",
      effects: { damage: { dice: 2, sides: 6, modifier: 2 } },
    },
    {
      name: "Marked for Death",
      unlockLevel: 3,
      cost: 15,
      costType: "mana",
      description: "Mark target, increasing all party damage",
      effects: { partyDamageBuff: { percent: 20, turns: 3 } },
    },
    {
      name: "Blood Sacrifice",
      unlockLevel: 6,
      cost: 20,
      costType: "stamina",
      description: "Enter a blood pact, lends you the power of demons",
      effects: {
        selfDamageBuff: { percent: 25, turns: 2 },
        selfDamage: { dice: 2, sides: 4, modifier: 3 },
      },
    },
    {
      name: "Eternal Darkness",
      unlockLevel: 10,
      cost: 40,
      costType: "mana",
      description: "Engulf target in darkness, making them cold and vulnerable",
      effects: { damage: { dice: 4, sides: 6 }, vulnerability: { percent: 25, turns: 3 } },
    },
  ],

  Bard: [
    {
      name: "Bardic Inspiration",
      unlockLevel: 1,
      cost: 12,
      costType: "stamina",
      description: "Inspire the party with a battle song",
      effects: { partyDamageBuff: { percent: 20, turns: 2 } },
    },
    {
      name: "Healing Tune",
      unlockLevel: 3,
      cost: 16,
      costType: "mana",
      description: "A soothing melody that restores health",
      effects: { heal: { dice: 1, sides: 8, modifier: 2 } },
    },
    {
      name: "Swift Step",
      unlockLevel: 6,
      cost: 18,
      costType: "stamina",
      description: "An upbeat tune, granting haste and evasion to the party",
      effects: { haste: true, partyEvasion: { percent: 25, turns: 2 } },
    },
    {
      name: "Crescendo",
      unlockLevel: 10,
      cost: 42,
      costType: "mana",
      description: "The ultimate performance, dealing damage and buffing the entire party",
      effects: {
        damage: { dice: 4, sides: 4 },
        partyDamageBuff: { percent: 40, turns: 1 },
        heal: { dice: 2, sides: 6 },
      },
    },
  ],
};

// unlock abilities
export function getAbilitiesForClassAtLevel(
  characterClass: CharacterClass,
  level: number,
): Ability[] {
  return CLASS_ABILITIES[characterClass].filter((a) => a.unlockLevel <= level);
}

// calculate stats at x level
export function getStatsAtLevel(characterClass: CharacterClass, level: number) {
  const base = CLASS_BASE_STATS[characterClass];
  const gains = CLASS_LEVEL_UP_GAINS[characterClass];
  const levelsGained = level - 1;

  let hp = base.hp + gains.hp * levelsGained;
  const stamina = base.stamina + gains.stamina * levelsGained;
  const mana = base.mana + gains.mana * levelsGained;

  // warrior passive idk maybe he becomes a beast at max havent tested it
  if (characterClass === "Warrior") {
    hp = Math.floor(hp * 1.1);
  }

  return { hp, stamina, mana };
}
