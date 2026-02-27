// status effects used in combat

export interface StatusEffect {
  id: string; // unique id for this effect instance
  type: StatusEffectType;
  sourceId: string; // character id that applied it
  targetId: string; // character id
  turnsRemaining: number;
  value?: number; // damage per tick, percent reduction, etc.
  dice?: { count: number; sides: number; modifier?: number }; // for DoT effects
}

export type StatusEffectType =
  | "burn" // DoT fire damage
  | "poison" // DoT poison damage
  | "slow" // boss acts last + deals -25% damage
  | "blind" // 50% chance to miss
  | "frenzy" // +50% damage dealt, +25% damage taken
  | "bossDamageReduction" // boss deals X% less damage
  | "selfDamageBuff" // character deals X% more damage
  | "partyDamageBuff" // all party members deal X% more damage
  | "huntersMark" // all party deals X% more to marked target
  | "vulnerability" // target takes X% more damage
  | "shieldUntilHit" // reduce next hit by X%, then remove
  | "parry" // parry next attack
  | "haste" // act twice next turn
  | "partyEvasion" // party has X% chance to dodge
  | "partyDamageReduction" // party takes X% less damage (blessing)
  | "selfWeakness"; // take X damage per turn (self-inflicted DoT)

let effectCounter = 0;

export function createEffect(
  type: StatusEffectType,
  sourceId: string,
  targetId: string,
  turnsRemaining: number,
  value?: number,
  dice?: { count: number; sides: number; modifier?: number },
): StatusEffect {
  const effect: StatusEffect = {
    id: `effect_${++effectCounter}_${Date.now()}`,
    type,
    sourceId,
    targetId,
    turnsRemaining,
  };
  if (value !== undefined) effect.value = value;
  if (dice !== undefined) effect.dice = dice;
  return effect;
}

export function tickEffects(effects: StatusEffect[]): StatusEffect[] {
  return effects
    .map((e) => ({ ...e, turnsRemaining: e.turnsRemaining - 1 }))
    .filter((e) => e.turnsRemaining > 0);
}

export function getEffectsOnTarget(effects: StatusEffect[], targetId: string): StatusEffect[] {
  return effects.filter((e) => e.targetId === targetId);
}

export function getEffectsByType(effects: StatusEffect[], type: StatusEffectType): StatusEffect[] {
  return effects.filter((e) => e.type === type);
}

export function removeEffectById(effects: StatusEffect[], id: string): StatusEffect[] {
  return effects.filter((e) => e.id !== id);
}

// calculate total damage modifier for an attacker
export function getDamageModifier(effects: StatusEffect[], attackerId: string): number {
  let modifier = 1.0;

  for (const effect of effects) {
    // self dmg buff
    if (effect.type === "selfDamageBuff" && effect.targetId === attackerId && effect.value) {
      modifier *= 1 + effect.value / 100;
    }
    // party dmg buff
    if (
      effect.type === "partyDamageBuff" &&
      effect.targetId === "party" &&
      !attackerId.startsWith("enemy_") &&
      effect.value
    ) {
      modifier *= 1 + effect.value / 100;
    }
    // frenzy big fucking damage
    if (effect.type === "frenzy" && effect.targetId === attackerId && effect.value) {
      modifier *= 1 + effect.value / 100;
    }
  }

  return modifier;
}

// calculate total damage reduction for an attacker
export function getDamageReduction(effects: StatusEffect[], attackerId: string): number {
  let reduction = 1.0;

  for (const effect of effects) {
    // target buffs
    if (effect.type === "bossDamageReduction" && effect.targetId === attackerId && effect.value) {
      reduction *= 1 - effect.value / 100;
    }
    // slow
    if (effect.type === "slow" && effect.targetId === attackerId) {
      reduction *= 0.75;
    }
  }

  return reduction;
}

// extra damage (vuln/hunters mark)
export function getVulnerabilityModifier(effects: StatusEffect[], targetId: string): number {
  let modifier = 1.0;

  for (const effect of effects) {
    if (effect.type === "vulnerability" && effect.targetId === targetId && effect.value) {
      modifier *= 1 + effect.value / 100;
    }
    if (effect.type === "huntersMark" && effect.targetId === targetId && effect.value) {
      modifier *= 1 + effect.value / 100;
    }
  }

  return modifier;
}

// check for effects
export function hasEffect(
  effects: StatusEffect[],
  targetId: string,
  type: StatusEffectType,
): boolean {
  return effects.some((e) => e.targetId === targetId && e.type === type);
}

// frenzy dmg taken modifier
export function getFrenzyDamageTaken(effects: StatusEffect[], targetId: string): number {
  const frenzy = effects.find((e) => e.type === "frenzy" && e.targetId === targetId);
  if (frenzy) return 1.25; // +25% dmg taken
  return 1.0;
}
