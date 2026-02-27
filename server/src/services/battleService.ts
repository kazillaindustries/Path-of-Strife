import { prisma } from "../lib/prisma";
import {
  type CharacterClass,
  type Ability,
  rollDice,
  getAbilitiesForClassAtLevel,
  CLASS_PASSIVES,
  classUsesStamina,
  classUsesMana,
  isCasterClass,
  isMartialClass,
  REST_STAMINA_RECOVERY,
  MEDITATE_MANA_RECOVERY,
} from "../lib/constants";
import {
  type StatusEffect,
  createEffect,
  tickEffects,
  getDamageModifier,
  getDamageReduction,
  getVulnerabilityModifier,
  getFrenzyDamageTaken,
  hasEffect,
  getEffectsByType,
  removeEffectById,
} from "./statusEffects";
import { addXp } from "./characterService";
import {
  type BattleEnemy,
  type EnemyAbility,
  pickEnemyAbility,
  pickPhaseActionAbility,
  getEnemyPhaseDamageMultiplier,
  checkEnemyPhaseTransitions,
} from "../lib/enemies";
import { RUN_AREA_REWARD_MULTIPLIERS } from "../lib/constants";

export interface BattleEvent {
  type:
    | "ability"
    | "attack"
    | "recovery"
    | "dot"
    | "effect"
    | "enemy_attack"
    | "enemy_ability"
    | "reward"
    | "toggle"
    | "parry"
    | "dodge"
    | "miss"
    | "phase";
  actorId: string;
  target?: string;
  abilityName?: string;
  damage?: number;
  healing?: number;
  staminaRecovered?: number;
  manaRecovered?: number;
  effectApplied?: string;
  message: string;
}

function getEnemies(battle: any): BattleEnemy[] {
  return battle.enemies as unknown as BattleEnemy[];
}

function getAliveEnemies(enemies: BattleEnemy[]): BattleEnemy[] {
  return enemies.filter((e) => e.hp > 0);
}

function findEnemy(enemies: BattleEnemy[], enemyId: string): BattleEnemy | undefined {
  return enemies.find((e) => e.id === enemyId);
}

function updateEnemyInList(enemies: BattleEnemy[], updated: BattleEnemy): BattleEnemy[] {
  return enemies.map((e) => (e.id === updated.id ? updated : e));
}

function getTotalMaxHp(enemies: BattleEnemy[]): number {
  return enemies.reduce((sum, e) => sum + e.maxHp, 0);
}

// get poison dice count for scaling
function getPoisonDiceCount(characterLevel: number): number {
  if (characterLevel >= 9) return 3;
  if (characterLevel >= 5) return 2;
  return 1;
}

// start of combat

// override for carrying over stats from previous fight
export interface ParticipantOverride {
  characterId: string;
  currentHp: number;
  currentMana: number;
  currentStamina: number;
}

export async function startBattle(params: {
  partyId: string;
  enemies: BattleEnemy[];
  runId?: string;
  participantOverrides?: ParticipantOverride[];
  initialEffects?: StatusEffect[];
}) {
  const { partyId, enemies, runId, participantOverrides, initialEffects } = params;

  const party = await prisma.party.findUniqueOrThrow({
    where: { id: partyId },
    include: { members: { include: { character: true } } },
  });

  if (party.members.length === 0) throw new Error("Party has no members");
  if (party.members.length > 4) throw new Error("Party cannot have more than 4 members");

  const overrideMap = new Map((participantOverrides ?? []).map((o) => [o.characterId, o]));

  const data: any = {
    enemies: enemies as any,
    turn: 0,
    finished: false,
    won: false,
    statusEffects: initialEffects ?? [],
    party: { connect: { id: partyId } },
    participants: {
      create: party.members.map((m) => {
        const override = overrideMap.get(m.characterId);
        return {
          character: { connect: { id: m.characterId } },
          currentHp: override?.currentHp ?? m.character.hp,
          currentMana: override?.currentMana ?? m.character.mana,
          currentStamina: override?.currentStamina ?? m.character.stamina,
          hasActed: false,
          toggles: [],
        };
      }),
    },
  };

  if (runId) {
    data.run = { connect: { id: runId } };
  }

  return prisma.battle.create({
    data,
    include: { participants: { include: { character: true } } },
  });
}

export async function getBattleById(battleId: string) {
  const battle = await prisma.battle.findUnique({
    where: { id: battleId },
    include: { participants: { include: { character: true } } },
  });

  if (!battle) return null;

  const enrichedParticipants = battle.participants.map((p) => {
    const characterClass = p.character.class as CharacterClass;
    const abilities = getAbilitiesForClassAtLevel(characterClass, p.character.level);
    const passive = CLASS_PASSIVES[characterClass];
    const canRest = classUsesStamina(characterClass);
    const canMeditate = classUsesMana(characterClass);
    return { ...p, abilities, passive, canRest, canMeditate };
  });

  return {
    ...battle,
    participants: enrichedParticipants,
    enemies: getEnemies(battle),
    statusEffects: battle.statusEffects as unknown as StatusEffect[],
  };
}

export async function useAbility(
  battleId: string,
  characterId: string,
  abilityName: string,
  targetEnemyId: string,
  targetAllyId?: string,
) {
  const battle = await prisma.battle.findUnique({
    where: { id: battleId },
    include: { participants: { include: { character: true } } },
  });

  if (!battle) throw new Error("Battle not found");
  if (battle.finished) throw new Error("Battle is already over");

  const participant = battle.participants.find((p) => p.characterId === characterId);
  if (!participant) throw new Error("Character not in this battle");
  if (participant.currentHp <= 0) throw new Error("Character is dead");

  const character = participant.character;
  const characterClass = character.class as CharacterClass;
  const abilities = getAbilitiesForClassAtLevel(characterClass, character.level);
  const ability = abilities.find((a) => a.name === abilityName);

  if (!ability) throw new Error(`Ability '${abilityName}' not available`);

  // assassinate cooldown check
  const existingToggles = (participant.toggles as string[] | null) ?? [];
  if (existingToggles.includes("assassinate_cooldown")) {
    throw new Error("Can't use abilities this turn (Assassinate cooldown)");
  }

  // for healing abilities with ally target to skip enemy validation
  let enemies = getEnemies(battle);
  let targetEnemy: any = null;

  if (ability.effects.heal && targetAllyId) {
    // buff or healing target ally
  } else {
    // other -> target enemy
    targetEnemy = findEnemy(enemies, targetEnemyId);
    if (!targetEnemy) throw new Error("Target enemy not found");
    if (targetEnemy.hp <= 0) throw new Error("Target enemy is already dead");
  }

  // ability cost checker
  if (ability.costType === "stamina" && participant.currentStamina < ability.cost) {
    throw new Error(
      `Not enough stamina (need ${ability.cost}, have ${participant.currentStamina})`,
    );
  }
  if (ability.costType === "mana" && participant.currentMana < ability.cost) {
    throw new Error(`Not enough mana (need ${ability.cost}, have ${participant.currentMana})`);
  }

  const events: BattleEvent[] = [];
  let effects = (battle.statusEffects as StatusEffect[] | null) ?? [];
  let newPlayerHp = participant.currentHp;
  let newPlayerMana = participant.currentMana;
  let newPlayerStamina = participant.currentStamina;
  const toggles = (participant.toggles as string[] | null) ?? [];
  let allyHealed: { characterId: string; amount: number } | null = null;
  if (ability.costType === "stamina") {
    newPlayerStamina -= ability.cost;
  } else {
    newPlayerMana -= ability.cost;
  }

  const e = ability.effects;

  // toggle frenzy
  if (e.toggle) {
    const isActive = hasEffect(effects, characterId, "frenzy");
    if (isActive) {
      effects = effects.filter((ef) => !(ef.type === "frenzy" && ef.targetId === characterId));
      events.push({
        type: "toggle",
        actorId: characterId,
        message: `${character.name} deactivates Frenzy`,
      });
    } else {
      effects.push(createEffect("frenzy", characterId, characterId, 999, 50));
      events.push({
        type: "toggle",
        actorId: characterId,
        message: `${character.name} enters a Frenzy! (+50% damage, +25% damage taken)`,
      });
    }
  }

  // dmg
  if (e.damage) {
    if (!targetEnemy) throw new Error("Target enemy required for damage ability");

    // is aoe?
    const isAoe = e.aoe ?? false;
    const targetEnemies = isAoe
      ? enemies.filter((en) => en.hp > 0) // Hit all alive enemies
      : [targetEnemy]; // Hit single target

    // one roll for all enemies
    const baseDamageRoll = rollDice(e.damage.dice, e.damage.sides) + (e.damage.modifier ?? 0);

    let totalHealingFromDamage = 0;

    for (const enemy of targetEnemies) {
      let totalDamage = baseDamageRoll;

      const dmgMod = getDamageModifier(effects, characterId);
      totalDamage = Math.floor(totalDamage * dmgMod);

      const vulnMod = getVulnerabilityModifier(effects, enemy.id);
      totalDamage = Math.floor(totalDamage * vulnMod);

      // crit check
      let didCrit = false;
      if (!isAoe) {
        const critChance = (e.critChance ?? 0) + (characterClass === "Rogue" ? 0.15 : 0);
        if (critChance > 0 && Math.random() < critChance) {
          totalDamage *= 2;
          didCrit = true;
        }

        // assasinate autocrit
        if (e.autoCritIfFullHP && enemy.hp === enemy.maxHp) {
          totalDamage *= 2;
          didCrit = true;
        }

        if (e.hitTwice) {
          const secondHit = rollDice(e.damage.dice, e.damage.sides) + (e.damage.modifier ?? 0);
          totalDamage += Math.floor(secondHit * dmgMod * vulnMod);
        }

        if (e.hitTwiceIfMarked && hasEffect(effects, enemy.id, "huntersMark")) {
          totalDamage *= 2;
        }
      }

      if (e.extraDamagePerAlly) {
        const aliveAllies = battle.participants.filter(
          (p) => p.currentHp > 0 && p.characterId !== characterId,
        ).length;
        if (aliveAllies > 0) {
          const extraDmg = rollDice(
            e.extraDamagePerAlly.dice * aliveAllies,
            e.extraDamagePerAlly.sides,
          );
          totalDamage += extraDmg;
        }
      }

      // apply damage
      const prevEnemyHp = enemy.hp;
      enemy.hp = Math.max(0, enemy.hp - totalDamage);
      enemies = updateEnemyInList(enemies, enemy);

      const critText = didCrit ? " (CRIT!)" : "";
      events.push({
        type: "ability",
        actorId: characterId,
        target: enemy.id,
        abilityName: ability.name,
        damage: totalDamage,
        message: `${character.name} uses ${ability.name} on ${enemy.name} for ${totalDamage} damage${critText}`,
      });

      const phaseMessages = checkEnemyPhaseTransitions(enemy, prevEnemyHp);
      for (const msg of phaseMessages) {
        events.push({ type: "phase", actorId: enemy.id, message: msg });
      }
      if (phaseMessages.length > 0) {
        (enemy as any)._phasedThisTurn = true;
      }

      let healPercent = e.healPercent ?? 0;
      if (characterClass === "DarkKnight") healPercent += 20;
      if (healPercent > 0) {
        totalHealingFromDamage += Math.ceil((totalDamage * healPercent) / 100);
      }

      // spellvamp
      if (characterClass === "Spellblade") {
        const manaGain = Math.ceil((totalDamage * 20) / 100);
        newPlayerMana = Math.min(character.maxMana, newPlayerMana + manaGain);
        if (manaGain > 0) {
          events.push({
            type: "ability",
            actorId: characterId,
            manaRecovered: manaGain,
            message: `${character.name} recovers ${manaGain} mana from Spellvamp`,
          });
        }
      }
    }

    // goredrinker
    if (totalHealingFromDamage > 0) {
      const maxHp = character.maxHp;
      const actualHeal = Math.min(Math.floor(totalHealingFromDamage), maxHp - newPlayerHp);
      newPlayerHp = Math.min(maxHp, newPlayerHp + actualHeal);
      if (actualHeal > 0) {
        events.push({
          type: "ability",
          actorId: characterId,
          healing: actualHeal,
          message: `${character.name} heals for ${actualHeal} HP from ${ability.name}`,
        });
      }
    }
  }

  // actual healing
  if (e.heal) {
    let healAmount = rollDice(e.heal.dice, e.heal.sides) + (e.heal.modifier ?? 0);
    // cleric passive
    if (characterClass === "Cleric") {
      healAmount = Math.floor(healAmount * 1.2);
    }

    // target ally else self
    let targetCharacterId = characterId;
    let targetCharacter = character;
    let targetCurrentHp = newPlayerHp;
    let targetMaxHp = character.maxHp;

    if (targetAllyId) {
      const targetParticipant = battle.participants.find((p) => p.characterId === targetAllyId);
      if (!targetParticipant) {
        throw new Error(`Target ally not found`);
      }
      if (targetParticipant.currentHp <= 0) {
        throw new Error(`Target ally is already dead`);
      }
      targetCharacterId = targetAllyId;
      targetCharacter = targetParticipant.character;
      targetCurrentHp = targetParticipant.currentHp;
      targetMaxHp = targetParticipant.character.maxHp;
    }

    const actualHeal = Math.min(healAmount, targetMaxHp - targetCurrentHp);

    if (targetCharacterId === characterId) {
      newPlayerHp = Math.min(targetMaxHp, targetCurrentHp + actualHeal);
    } else {
      allyHealed = { characterId: targetCharacterId, amount: actualHeal };
    }

    events.push({
      type: "ability",
      actorId: characterId,
      healing: actualHeal,
      abilityName: ability.name,
      target: targetCharacterId,
      message:
        targetCharacterId === characterId
          ? `${character.name} uses ${ability.name} and heals for ${actualHeal} HP`
          : `${character.name} uses ${ability.name} on ${targetCharacter.name} and heals for ${actualHeal} HP`,
    });
  }

  // recoil damage
  if (e.selfDamage) {
    const selfDmg = rollDice(e.selfDamage.dice, e.selfDamage.sides) + (e.selfDamage.modifier ?? 0);
    newPlayerHp = Math.max(0, newPlayerHp - selfDmg);
    events.push({
      type: "ability",
      actorId: characterId,
      damage: selfDmg,
      message: `${character.name} takes ${selfDmg} self-damage from ${ability.name}`,
    });
  }

  // status effects
  const statusEffectTargets = (e.aoe ?? false) ? enemies.filter((en) => en.hp > 0) : [targetEnemy];

  for (const effectTarget of statusEffectTargets) {
    if (e.burn) {
      effects.push(
        createEffect("burn", characterId, effectTarget.id, e.burn.turns, 0, {
          count: e.burn.dice,
          sides: e.burn.sides,
        }),
      );
      events.push({
        type: "effect",
        actorId: characterId,
        target: effectTarget.id,
        effectApplied: "burn",
        message: `${effectTarget.name} is burning for ${e.burn.turns} turns`,
      });
    }
    if (e.poison) {
      const poisonDiceCount = getPoisonDiceCount(character.level);
      effects.push(
        createEffect("poison", characterId, effectTarget.id, e.poison.turns, 0, {
          count: poisonDiceCount,
          sides: e.poison.sides,
        }),
      );
      events.push({
        type: "effect",
        actorId: characterId,
        target: effectTarget.id,
        effectApplied: "poison",
        message: `${effectTarget.name} is poisoned for ${e.poison.turns} turns`,
      });
    }
    if (e.slow) {
      effects.push(createEffect("slow", characterId, effectTarget.id, e.slow.turns));
      events.push({
        type: "effect",
        actorId: characterId,
        target: effectTarget.id,
        effectApplied: "slow",
        message: `${effectTarget.name} is slowed for ${e.slow.turns} turns`,
      });
    }
    if (e.blind) {
      effects.push(
        createEffect("blind", characterId, effectTarget.id, e.blind.turns, e.blind.chance * 100),
      );
      events.push({
        type: "effect",
        actorId: characterId,
        target: effectTarget.id,
        effectApplied: "blind",
        message: `${effectTarget.name} is blinded for ${e.blind.turns} turns`,
      });
    }
    if (e.bossDamageReduction) {
      effects.push(
        createEffect(
          "bossDamageReduction",
          characterId,
          effectTarget.id,
          e.bossDamageReduction.turns,
          e.bossDamageReduction.percent,
        ),
      );
      events.push({
        type: "effect",
        actorId: characterId,
        target: effectTarget.id,
        effectApplied: "bossDamageReduction",
        message: `${effectTarget.name} deals ${e.bossDamageReduction.percent}% less damage for ${e.bossDamageReduction.turns} turns`,
      });
    }
    if (e.huntersMark) {
      effects.push(
        createEffect(
          "huntersMark",
          characterId,
          effectTarget.id,
          e.huntersMark.turns,
          e.huntersMark.percent,
        ),
      );
      events.push({
        type: "effect",
        actorId: characterId,
        target: effectTarget.id,
        effectApplied: "huntersMark",
        message: `${effectTarget.name} is marked! All party deals ${e.huntersMark.percent}% more damage for ${e.huntersMark.turns} turns`,
      });
    }
    if (e.vulnerability) {
      effects.push(
        createEffect(
          "vulnerability",
          characterId,
          effectTarget.id,
          e.vulnerability.turns,
          e.vulnerability.percent,
        ),
      );
      events.push({
        type: "effect",
        actorId: characterId,
        target: effectTarget.id,
        effectApplied: "vulnerability",
        message: `${effectTarget.name} takes ${e.vulnerability.percent}% more damage for ${e.vulnerability.turns} turns`,
      });
    }

    // warlock passive
    if (
      characterClass === "Warlock" &&
      (e.slow || e.blind || e.bossDamageReduction || e.vulnerability)
    ) {
      const poisonDiceCount = getPoisonDiceCount(character.level);
      effects.push(
        createEffect("poison", characterId, effectTarget.id, 3, 0, {
          count: poisonDiceCount,
          sides: 4,
        }),
      );
      events.push({
        type: "effect",
        actorId: characterId,
        target: effectTarget.id,
        effectApplied: "poison",
        message: `${effectTarget.name} is cursed with poison for 3 turns (Power in Misery)`,
      });
    }
  }

  // self targetting effects
  if (e.selfDamageBuff) {
    effects.push(
      createEffect(
        "selfDamageBuff",
        characterId,
        characterId,
        e.selfDamageBuff.turns,
        e.selfDamageBuff.percent,
      ),
    );
    events.push({
      type: "effect",
      actorId: characterId,
      effectApplied: "selfDamageBuff",
      message: `${character.name} deals ${e.selfDamageBuff.percent}% more damage for ${e.selfDamageBuff.turns} turns`,
    });
  }
  if (e.partyDamageBuff) {
    effects.push(
      createEffect(
        "partyDamageBuff",
        characterId,
        "party",
        e.partyDamageBuff.turns,
        e.partyDamageBuff.percent,
      ),
    );
    events.push({
      type: "effect",
      actorId: characterId,
      effectApplied: "partyDamageBuff",
      message: `Party deals ${e.partyDamageBuff.percent}% more damage for ${e.partyDamageBuff.turns} turns`,
    });
  }
  if (e.shieldUntilHit) {
    effects.push(
      createEffect(
        "shieldUntilHit",
        characterId,
        characterId,
        999,
        e.shieldUntilHit.damageReduction,
      ),
    );
    events.push({
      type: "effect",
      actorId: characterId,
      effectApplied: "shieldUntilHit",
      message: `${character.name} is shielded, next hit reduced by ${e.shieldUntilHit.damageReduction}%`,
    });
  }
  if (e.parry) {
    effects.push(
      createEffect("parry", characterId, characterId, 1, e.parry.maxDamagePerLevel, {
        count: e.parry.reflectPercent,
        sides: 0,
      }),
    );
    events.push({
      type: "effect",
      actorId: characterId,
      effectApplied: "parry",
      message: `${character.name} readies a parry`,
    });
  }
  if (e.haste) {
    effects.push(createEffect("haste", characterId, characterId, 1));
    events.push({
      type: "effect",
      actorId: characterId,
      effectApplied: "haste",
      message: `${character.name} gains haste and will act twice next turn`,
    });
  }
  if (e.partyEvasion) {
    effects.push(
      createEffect(
        "partyEvasion",
        characterId,
        "party",
        e.partyEvasion.turns,
        e.partyEvasion.percent,
      ),
    );
    events.push({
      type: "effect",
      actorId: characterId,
      effectApplied: "partyEvasion",
      message: `Party gains ${e.partyEvasion.percent}% evasion for ${e.partyEvasion.turns} turns`,
    });
  }
  if (e.selfWeakness) {
    effects.push(
      createEffect("selfWeakness", characterId, characterId, e.selfWeakness.turns, 0, {
        count: e.selfWeakness.dice,
        sides: e.selfWeakness.sides,
        ...(e.selfWeakness.modifier !== undefined ? { modifier: e.selfWeakness.modifier } : {}),
      }),
    );
    events.push({
      type: "effect",
      actorId: characterId,
      effectApplied: "selfWeakness",
      message: `${character.name} suffers dark energy backlash for ${e.selfWeakness.turns} turns`,
    });
  }

  const phasedEnemies = enemies.filter((e) => (e as any)._phasedThisTurn && e.hp > 0);
  for (const phasedEnemy of phasedEnemies) {
    const tempHpMap = new Map<string, number>();
    for (const p of battle.participants) {
      tempHpMap.set(p.characterId, p.currentHp);
    }

    const phaseActionResult = processBossPhaseAction(
      phasedEnemy,
      effects,
      battle.participants,
      tempHpMap,
    );

    events.push(...phaseActionResult.events);
    effects = phaseActionResult.effects;

    phaseActionResult.hpMap.forEach((hp, cid) => {
      if (cid === characterId) {
        newPlayerHp = hp;
      }
    });
  }

  const hpMap = new Map<string, number>();
  for (const p of battle.participants) {
    hpMap.set(p.characterId, p.characterId === characterId ? newPlayerHp : p.currentHp);
  }

  if (allyHealed) {
    const allyMaxHp =
      battle.participants.find((p) => p.characterId === allyHealed!.characterId)?.character.maxHp ??
      0;
    const currentAllyHp = hpMap.get(allyHealed.characterId) ?? 0;
    const newAllyHp = Math.min(allyMaxHp, currentAllyHp + allyHealed.amount);
    hpMap.set(allyHealed.characterId, newAllyHp);
  }

  const endOfTurn = resolveEndOfTurn(battle, effects, enemies, hpMap, characterId);
  const postEvents = endOfTurn.events;
  effects = endOfTurn.effects;
  enemies = endOfTurn.enemies;
  newPlayerHp = endOfTurn.hpMap.get(characterId) ?? newPlayerHp;
  const { finished, won, allActed } = endOfTurn;

  let rewardXp = 0;
  let rewardGold = 0;

  // apply cd to caster (again for assasinate damn)
  let updatedToggles = toggles;
  if (abilityName === "Assassinate" && characterClass === "Rogue") {
    updatedToggles = [...toggles, "assassinate_cooldown"];
  }

  // persistence
  const allEvents = [...events, ...postEvents];
  const result = await prisma.$transaction(async (tx: any) => {
    const rewards = await persistEndOfTurn(
      tx,
      battleId,
      battle,
      effects,
      enemies,
      endOfTurn.hpMap,
      characterId,
      { mana: newPlayerMana, stamina: newPlayerStamina },
      endOfTurn,
      allEvents,
      updatedToggles,
    );
    rewardXp = rewards.rewardXp;
    rewardGold = rewards.rewardGold;

    return tx.battle.findUnique({
      where: { id: battleId },
      include: { participants: { include: { character: true } } },
    });
  });

  if (won) {
    allEvents.push({
      type: "reward",
      actorId: characterId,
      message: `Victory! Earned ${rewardXp} XP and ${rewardGold} gold`,
    });
  }

  return {
    battle: result,
    events: allEvents,
    enemies,
    finished,
    won,
    rewardXp,
    rewardGold,
    statusEffects: effects,
  };
}

// rest/meditate

export async function useRecovery(
  battleId: string,
  characterId: string,
  action: "rest" | "meditate",
) {
  const battle = await prisma.battle.findUnique({
    where: { id: battleId },
    include: { participants: { include: { character: true } } },
  });

  if (!battle) throw new Error("Battle not found");
  if (battle.finished) throw new Error("Battle is already over");

  const participant = battle.participants.find((p) => p.characterId === characterId);
  if (!participant) throw new Error("Character not in this battle");
  if (participant.currentHp <= 0) throw new Error("Character is dead");

  const character = participant.character;
  const characterClass = character.class as CharacterClass;
  const events: BattleEvent[] = [];

  let newStamina = participant.currentStamina;
  let newMana = participant.currentMana;

  if (action === "rest") {
    const recovery = Math.floor((character.maxStamina * REST_STAMINA_RECOVERY) / 100);
    newStamina = Math.min(character.maxStamina, newStamina + recovery);
    const recovered = newStamina - participant.currentStamina;
    events.push({
      type: "recovery",
      actorId: characterId,
      staminaRecovered: recovered,
      message: `${character.name} rests and recovers ${recovered} stamina`,
    });
  } else {
    let recovery = Math.floor((character.maxMana * MEDITATE_MANA_RECOVERY) / 100);
    // mage passive triggers here
    if (characterClass === "Mage") recovery *= 2;
    newMana = Math.min(character.maxMana, newMana + recovery);
    const recovered = newMana - participant.currentMana;
    events.push({
      type: "recovery",
      actorId: characterId,
      manaRecovered: recovered,
      message: `${character.name} meditates and recovers ${recovered} mana`,
    });
  }

  // turn done
  let effects = (battle.statusEffects as StatusEffect[] | null) ?? [];
  let enemies = getEnemies(battle);

  const hpMap = new Map<string, number>();
  for (const p of battle.participants) {
    hpMap.set(p.characterId, p.currentHp);
  }

  const endOfTurn = resolveEndOfTurn(battle, effects, enemies, hpMap, characterId);
  const postEvents = endOfTurn.events;
  effects = endOfTurn.effects;
  enemies = endOfTurn.enemies;
  const { finished, won } = endOfTurn;

  const allEvents = [...events, ...postEvents];

  await prisma.$transaction(async (tx: any) => {
    await persistEndOfTurn(
      tx,
      battleId,
      battle,
      effects,
      enemies,
      endOfTurn.hpMap,
      characterId,
      { mana: newMana, stamina: newStamina },
      endOfTurn,
      allEvents,
    );
  });

  return {
    events: allEvents,
    enemies,
    finished,
    won,
  };
}

// basic no cost attack

export async function useBasicAttack(battleId: string, characterId: string, targetEnemyId: string) {
  const battle = await prisma.battle.findUnique({
    where: { id: battleId },
    include: { participants: { include: { character: true } }, party: true },
  });

  if (!battle) throw new Error("Battle not found");
  if (battle.finished) throw new Error("Battle is already over");

  const participant = battle.participants.find((p) => p.characterId === characterId);
  if (!participant) throw new Error("Character not in this battle");
  if (participant.currentHp <= 0) throw new Error("Character is dead");

  let enemies = getEnemies(battle);
  const targetEnemy = findEnemy(enemies, targetEnemyId);
  if (!targetEnemy) throw new Error("Target enemy not found");
  if (targetEnemy.hp <= 0) throw new Error("Target enemy is already dead");

  const character = participant.character;
  const characterClass = character.class as CharacterClass;
  const events: BattleEvent[] = [];
  let effects = (battle.statusEffects as StatusEffect[] | null) ?? [];

  const isEasyMode = (battle.party as any)?.easyMode ?? false;

  // class based dice rolls
  let damage: number;
  if (isMartialClass(characterClass)) {
    // martial dice
    const diceCount = isEasyMode ? 2 : 1;
    damage = rollDice(diceCount, 4) + Math.ceil(character.level / 2);
  } else if (isCasterClass(characterClass)) {
    // caster dice
    const diceCount = isEasyMode ? 2 : 1;
    damage = rollDice(diceCount, 2) + Math.ceil(character.level / 2);
  } else {
    // gish dice
    const diceCount = isEasyMode ? 2 : 1;
    damage = rollDice(diceCount, 3) + Math.ceil(character.level / 2);
  }

  const dmgMod = getDamageModifier(effects, characterId);
  const vulnMod = getVulnerabilityModifier(effects, targetEnemyId);
  damage = Math.floor(damage * dmgMod * vulnMod);

  targetEnemy.hp = Math.max(0, targetEnemy.hp - damage);
  enemies = updateEnemyInList(enemies, targetEnemy);

  events.push({
    type: "attack",
    actorId: characterId,
    target: targetEnemyId,
    damage,
    message: `${character.name} attacks ${targetEnemy.name} for ${damage} damage`,
  });

  const hpMap = new Map<string, number>();
  for (const p of battle.participants) {
    hpMap.set(p.characterId, p.currentHp);
  }

  const endOfTurn = resolveEndOfTurn(battle, effects, enemies, hpMap, characterId);
  const postEvents = endOfTurn.events;
  effects = endOfTurn.effects;
  enemies = endOfTurn.enemies;
  const { finished, won } = endOfTurn;

  const allEvents = [...events, ...postEvents];

  await prisma.$transaction(async (tx: any) => {
    await persistEndOfTurn(
      tx,
      battleId,
      battle,
      effects,
      enemies,
      endOfTurn.hpMap,
      characterId,
      {},
      endOfTurn,
      allEvents,
    );
  });

  return {
    events: [...events, ...postEvents],
    enemies,
    finished,
    won,
  };
}

interface EndOfTurnResult {
  events: BattleEvent[];
  effects: StatusEffect[];
  enemies: BattleEnemy[];
  hpMap: Map<string, number>;
  finished: boolean;
  won: boolean;
  allActed: boolean;
}

function resolveEndOfTurn(
  battle: any,
  effects: StatusEffect[],
  enemies: BattleEnemy[],
  hpMap: Map<string, number>,
  activeCharacterId: string,
): EndOfTurnResult {
  const events: BattleEvent[] = [];

  const allActed = battle.participants.every((p: any) =>
    p.characterId === activeCharacterId
      ? true
      : p.hasActed || (hpMap.get(p.characterId) ?? p.currentHp) <= 0,
  );

  const aliveEnemies = getAliveEnemies(enemies);

  if (allActed && aliveEnemies.length > 0) {
    const enemyResult = processEnemyTurns(battle, effects, enemies, battle.participants, hpMap);
    events.push(...enemyResult.events);
    effects = enemyResult.effects;
    enemies = enemyResult.enemies;
    hpMap = enemyResult.hpMap;

    // dot tick enemies
    for (const enemy of getAliveEnemies(enemies)) {
      const dotResult = processDoTs(effects, enemy.id, enemy.hp, enemy.name);
      if (dotResult.hp !== enemy.hp) {
        enemy.hp = dotResult.hp;
        enemies = updateEnemyInList(enemies, enemy);
      }
      events.push(...dotResult.events);
    }

    // dot tick players
    for (const p of battle.participants) {
      const pHp = hpMap.get(p.characterId) ?? p.currentHp;
      if (pHp > 0) {
        const playerDot = processDoTs(effects, p.characterId, pHp, p.character.name);
        hpMap.set(p.characterId, playerDot.hp);
        events.push(...playerDot.events);
      }
    }

    // tick duration
    effects = tickEffects(effects);
  }

  // death check
  const allDead = battle.participants.every(
    (p: any) => (hpMap.get(p.characterId) ?? p.currentHp) <= 0,
  );
  const allEnemiesDead = getAliveEnemies(enemies).length === 0;
  const finished = allDead || allEnemiesDead;
  const won = allEnemiesDead && !allDead;

  return { events, effects, enemies, hpMap, finished, won, allActed };
}

async function persistEndOfTurn(
  tx: any,
  battleId: string,
  battle: any,
  effects: StatusEffect[],
  enemies: BattleEnemy[],
  hpMap: Map<string, number>,
  activeCharacterId: string,
  activeResources: { mana?: number; stamina?: number },
  endOfTurn: EndOfTurnResult,
  events: BattleEvent[] = [],
  updatedToggles?: string[],
) {
  const { finished, won, allActed } = endOfTurn;

  const currentBattleLog = ((battle.battleLog as any) ?? []) as BattleEvent[];
  const updatedBattleLog = [...currentBattleLog, ...events];

  await tx.battle.update({
    where: { id: battleId },
    data: {
      enemies: enemies as any,
      turn: allActed ? battle.turn + 1 : battle.turn,
      finished,
      won,
      statusEffects: effects as any,
      battleLog: updatedBattleLog as any,
    },
  });

  const activeHp = hpMap.get(activeCharacterId) ?? 0;
  await tx.battleParticipant.update({
    where: {
      battleId_characterId: { battleId, characterId: activeCharacterId },
    },
    data: {
      currentHp: activeHp,
      ...(activeResources.mana !== undefined ? { currentMana: activeResources.mana } : {}),
      ...(activeResources.stamina !== undefined ? { currentStamina: activeResources.stamina } : {}),
      hasActed: allActed ? false : true,
      ...(updatedToggles !== undefined ? { toggles: updatedToggles } : {}),
    },
  });

  if (allActed) {
    for (const p of battle.participants) {
      if (p.characterId === activeCharacterId) continue;
      const newHp = hpMap.get(p.characterId);
      if (newHp !== undefined && newHp !== p.currentHp) {
        await tx.battleParticipant.update({
          where: {
            battleId_characterId: {
              battleId,
              characterId: p.characterId,
            },
          },
          data: { currentHp: newHp },
        });
      }
    }

    await tx.battleParticipant.updateMany({
      where: { battleId },
      data: { hasActed: false },
    });

    const allParticipants = await tx.battleParticipant.findMany({
      where: { battleId },
    });
    for (const p of allParticipants) {
      const toggles = (p.toggles as string[] | null) ?? [];
      if (toggles.includes("assassinate_cooldown")) {
        const clearedToggles = toggles.filter((t) => t !== "assassinate_cooldown");
        await tx.battleParticipant.update({
          where: {
            battleId_characterId: { battleId, characterId: p.characterId },
          },
          data: { toggles: clearedToggles },
        });
      }
    }
  }

  let rewardXp = 0;
  let rewardGold = 0;

  if (won) {
    const totalMaxHp = getTotalMaxHp(enemies);
    let baseXp = 20 + Math.floor(totalMaxHp / 2);
    let baseGold = rollDice(2, 10) + 10;

    // scale rewards per area
    if (battle.runId) {
      const run = await tx.run.findUnique({ where: { id: battle.runId } });
      if (run) {
        const multiplier = RUN_AREA_REWARD_MULTIPLIERS[run.currentArea] ?? 1.0;
        baseXp = Math.floor(baseXp * multiplier);
        baseGold = Math.floor(baseGold * multiplier);
      }
    }

    rewardXp = baseXp;
    rewardGold = baseGold;

    // bard passive
    const hasBard = battle.participants.some(
      (p: any) => p.character.class === "Bard" && (hpMap.get(p.characterId) ?? p.currentHp) > 0,
    );
    if (hasBard) rewardGold = Math.floor(rewardGold * 1.25);

    // xp on player level
    for (const p of battle.participants) {
      await addXp(p.characterId, rewardXp);
      await tx.character.update({
        where: { id: p.characterId },
        data: { battlesWon: { increment: 1 } },
      });
    }

    // gold on party level
    if (battle.partyId) {
      const party = await tx.party.findUnique({
        where: { id: battle.partyId },
      });
      if (party) {
        await tx.party.update({
          where: { id: battle.partyId },
          data: { gold: party.gold + rewardGold },
        });
      }
    }
  }

  return { rewardXp, rewardGold };
}

function processBossPhaseAction(
  enemy: BattleEnemy,
  effects: StatusEffect[],
  participants: any[],
  hpMap: Map<string, number>,
): {
  events: BattleEvent[];
  effects: StatusEffect[];
  hpMap: Map<string, number>;
} {
  const events: BattleEvent[] = [];

  const ability = pickPhaseActionAbility(enemy);
  const abilityName = ability.name;

  const aliveParticipants = participants.filter((p) => {
    const hp = hpMap.get(p.characterId) ?? p.currentHp;
    return hp > 0;
  });

  if (aliveParticipants.length === 0) {
    return { events, effects, hpMap };
  }

  const isAoe = ability.aoe ?? true; // phase transition moves prefer aoes
  const targets = isAoe
    ? aliveParticipants
    : [aliveParticipants[Math.floor(Math.random() * aliveParticipants.length)]];

  // big brain math for damage rolls
  let baseDamage = 0;
  if (ability.damage) {
    baseDamage =
      rollDice(ability.damage.dice, ability.damage.sides) + (ability.damage.modifier ?? 0);
  } else {
    baseDamage = rollDice(1, 4) + 1;
  }

  //enemies
  // buff
  const enemyDmgMod = getDamageModifier(effects, enemy.id);
  baseDamage = Math.floor(baseDamage * enemyDmgMod);

  // dmg reduction
  const dmgReduction = getDamageReduction(effects, enemy.id);
  baseDamage = Math.floor(baseDamage * dmgReduction);

  // apply dmg to target
  for (const target of targets) {
    const targetId = target.characterId;
    const targetCharacter = target.character;
    let damage = baseDamage;

    // evasion check
    const evasionEffect = effects.find(
      (ef) => ef.type === "partyEvasion" && ef.targetId === "party",
    );
    if (evasionEffect && evasionEffect.value) {
      if (Math.random() < evasionEffect.value / 100) {
        events.push({
          type: "dodge",
          actorId: targetId,
          message: `${targetCharacter.name} dodges ${enemy.name}'s ${abilityName}!`,
        });
        continue;
      }
    }

    //part
    const partyReduction = effects.find(
      (ef) => ef.type === "partyDamageReduction" && ef.targetId === "party",
    );
    if (partyReduction && partyReduction.value) {
      damage = Math.floor(damage * (1 - partyReduction.value / 100));
    }

    const frenzyMod = getFrenzyDamageTaken(effects, targetId);
    damage = Math.floor(damage * frenzyMod);

    // paladin passive
    if (targetCharacter.class === "Paladin") {
      const targetHp = hpMap.get(targetId) ?? target.currentHp;
      if (targetHp < targetCharacter.maxHp * 0.5) {
        damage = Math.floor(damage * 0.9);
      }
    }

    // apply damage
    const currentHp = hpMap.get(targetId) ?? target.currentHp;
    const newHp = Math.max(0, currentHp - damage);
    hpMap.set(targetId, newHp);

    if (ability.damage) {
      events.push({
        type: "enemy_ability",
        actorId: enemy.id,
        target: targetId,
        damage,
        abilityName,
        message: `${enemy.name} uses ${abilityName} on ${targetCharacter.name} for ${damage} damage`,
      });
    }

    // apply status effects
    if (ability.effects) {
      const ae = ability.effects;
      if (ae.burn) {
        effects.push(
          createEffect("burn", enemy.id, targetId, ae.burn.turns, 0, {
            count: ae.burn.dice,
            sides: ae.burn.sides,
          }),
        );
        events.push({
          type: "effect",
          actorId: enemy.id,
          target: targetId,
          effectApplied: "burn",
          message: `${targetCharacter.name} is burning for ${ae.burn.turns} turns`,
        });
      }
      if (ae.poison) {
        const poisonDiceCount = getPoisonDiceCount(targetCharacter.level);
        effects.push(
          createEffect("poison", enemy.id, targetId, ae.poison.turns, 0, {
            count: poisonDiceCount,
            sides: ae.poison.sides,
          }),
        );
        events.push({
          type: "effect",
          actorId: enemy.id,
          target: targetId,
          effectApplied: "poison",
          message: `${targetCharacter.name} is poisoned for ${ae.poison.turns} turns`,
        });
      }
      if (ae.blind) {
        effects.push(
          createEffect("blind", enemy.id, targetId, ae.blind.turns, ae.blind.chance * 100),
        );
        events.push({
          type: "effect",
          actorId: enemy.id,
          target: targetId,
          effectApplied: "blind",
          message: `${targetCharacter.name} is blinded for ${ae.blind.turns} turns`,
        });
      }
    }
  }

  return { events, effects, hpMap };
}

function processEnemyTurns(
  battle: any,
  effects: StatusEffect[],
  enemies: BattleEnemy[],
  participants: any[],
  hpMap: Map<string, number>,
): {
  events: BattleEvent[];
  effects: StatusEffect[];
  enemies: BattleEnemy[];
  hpMap: Map<string, number>;
} {
  const events: BattleEvent[] = [];

  for (const enemy of getAliveEnemies(enemies)) {
    // check if blinded
    const blindEffect = effects.find((ef) => ef.type === "blind" && ef.targetId === enemy.id);
    if (blindEffect && blindEffect.value) {
      const missChance = blindEffect.value / 100;
      if (Math.random() < missChance) {
        events.push({
          type: "miss",
          actorId: enemy.id,
          message: `${enemy.name} is blinded and misses!`,
        });
        continue;
      }
    }

    // pick alive targets
    const aliveParticipants = participants.filter((p) => {
      const hp = hpMap.get(p.characterId) ?? p.currentHp;
      return hp > 0;
    });

    if (aliveParticipants.length === 0) break;

    const ability = pickEnemyAbility(enemy);
    const abilityName = ability.name;

    // phase dmg multiplier (bosses only)
    const phaseMultiplier = getEnemyPhaseDamageMultiplier(enemy);

    // self buffs
    if (!ability.damage && !ability.effects) {
      if (ability.selfBuff) {
        effects.push(
          createEffect(
            "selfDamageBuff",
            enemy.id,
            enemy.id,
            ability.selfBuff.turns,
            ability.selfBuff.percent,
          ),
        );
        events.push({
          type: "enemy_ability",
          actorId: enemy.id,
          abilityName,
          message: `${enemy.name} uses ${abilityName}! (+${ability.selfBuff.percent}% damage for ${ability.selfBuff.turns} turns)`,
        });
      }
      if (ability.selfShield) {
        effects.push(
          createEffect(
            "bossDamageReduction",
            enemy.id,
            enemy.id,
            ability.selfShield.turns,
            ability.selfShield.percent,
          ),
        );
        events.push({
          type: "enemy_ability",
          actorId: enemy.id,
          abilityName,
          message: `${enemy.name} uses ${abilityName}! (Takes ${ability.selfShield.percent}% less damage for ${ability.selfShield.turns} turns)`,
        });
      }
      continue;
    }

    // targetting
    const isAoe = ability.aoe ?? false;
    const targets = isAoe
      ? aliveParticipants
      : [aliveParticipants[Math.floor(Math.random() * aliveParticipants.length)]];

    // base dmg
    let baseDamage: number;
    if (ability.damage) {
      baseDamage =
        rollDice(ability.damage.dice, ability.damage.sides) + (ability.damage.modifier ?? 0);
    } else {
      baseDamage = rollDice(1, 4) + 1;
    }

    baseDamage = Math.floor(baseDamage * phaseMultiplier);

    // apply enemy buffing
    const enemyDmgMod = getDamageModifier(effects, enemy.id);
    baseDamage = Math.floor(baseDamage * enemyDmgMod);

    // apply dmg reduction
    const dmgReduction = getDamageReduction(effects, enemy.id);
    baseDamage = Math.floor(baseDamage * dmgReduction);

    // apply self buff/shield if ability also does damage (no moves do that yet but can leave it for future ideas)
    if (ability.selfBuff) {
      effects.push(
        createEffect(
          "selfDamageBuff",
          enemy.id,
          enemy.id,
          ability.selfBuff.turns,
          ability.selfBuff.percent,
        ),
      );
    }
    if (ability.selfShield) {
      effects.push(
        createEffect(
          "bossDamageReduction",
          enemy.id,
          enemy.id,
          ability.selfShield.turns,
          ability.selfShield.percent,
        ),
      );
    }

    // apply dmg and effects
    let totalDamageDealt = 0;

    for (const target of targets) {
      const targetId = target.characterId;
      let targetHp = hpMap.get(targetId) ?? target.currentHp;
      const targetCharacter = target.character;
      let damage = baseDamage;

      // evasion check
      const evasionEffect = effects.find(
        (ef) => ef.type === "partyEvasion" && ef.targetId === "party",
      );
      if (evasionEffect && evasionEffect.value) {
        if (Math.random() < evasionEffect.value / 100) {
          events.push({
            type: "dodge",
            actorId: targetId,
            message: `${targetCharacter.name} dodges ${enemy.name}'s ${abilityName}!`,
          });
          continue;
        }
      }

      // parry check
      const parryEffect = effects.find((ef) => ef.type === "parry" && ef.targetId === targetId);
      if (parryEffect && parryEffect.value && parryEffect.dice) {
        const maxDamage = parryEffect.value * targetCharacter.level;
        const blocked = Math.max(0, damage - maxDamage);
        const reflected = Math.floor((blocked * parryEffect.dice.count) / 100);
        damage = Math.min(damage, maxDamage);

        if (reflected > 0) {
          enemy.hp = Math.max(0, enemy.hp - reflected);
          enemies = updateEnemyInList(enemies, enemy);
          events.push({
            type: "parry",
            actorId: targetId,
            target: enemy.id,
            damage: reflected,
            message: `${targetCharacter.name} parries ${enemy.name}'s ${abilityName}! Takes max ${maxDamage} damage, reflects ${reflected} back`,
          });
        }
        effects = removeEffectById(effects, parryEffect.id);
      }

      // shield sheck
      const shieldEffect = effects.find(
        (ef) => ef.type === "shieldUntilHit" && ef.targetId === targetId,
      );
      if (shieldEffect && shieldEffect.value) {
        damage = Math.floor(damage * (1 - shieldEffect.value / 100));
        effects = removeEffectById(effects, shieldEffect.id);
        events.push({
          type: "effect",
          actorId: targetId,
          message: `${targetCharacter.name}'s shield absorbs ${shieldEffect.value}% of the damage`,
        });
      }

      // party dmg reduction (from the shield blessing)
      const partyReduction = effects.find(
        (ef) => ef.type === "partyDamageReduction" && ef.targetId === "party",
      );
      if (partyReduction && partyReduction.value) {
        damage = Math.floor(damage * (1 - partyReduction.value / 100));
      }

      // frenzy self debuff
      const frenzyMod = getFrenzyDamageTaken(effects, targetId);
      damage = Math.floor(damage * frenzyMod);

      // paladin passive
      if (targetCharacter.class === "Paladin" && targetHp < targetCharacter.maxHp * 0.5) {
        damage = Math.floor(damage * 0.9);
      }

      // thorns
      if (targetCharacter.class === "Druid") {
        const thornsDamage = 2 * targetCharacter.level;
        enemy.hp = Math.max(0, enemy.hp - thornsDamage);
        enemies = updateEnemyInList(enemies, enemy);
        events.push({
          type: "effect",
          actorId: targetId,
          target: enemy.id,
          damage: thornsDamage,
          message: `${enemy.name} takes ${thornsDamage} thorns damage from ${targetCharacter.name}`,
        });
      }

      targetHp = Math.max(0, targetHp - damage);
      hpMap.set(targetId, targetHp);
      totalDamageDealt += damage;

      if (ability.damage) {
        events.push({
          type: "enemy_attack",
          actorId: enemy.id,
          target: targetId,
          damage,
          abilityName,
          message: `${enemy.name} uses ${abilityName} on ${targetCharacter.name} for ${damage} damage`,
        });
      }

      // fuck this guy in particular (apply status effects)
      if (ability.effects) {
        const ae = ability.effects;
        if (ae.burn) {
          effects.push(
            createEffect("burn", enemy.id, targetId, ae.burn.turns, 0, {
              count: ae.burn.dice,
              sides: ae.burn.sides,
            }),
          );
          events.push({
            type: "effect",
            actorId: enemy.id,
            target: targetId,
            effectApplied: "burn",
            message: `${targetCharacter.name} is burning for ${ae.burn.turns} turns`,
          });
        }
        if (ae.poison) {
          const poisonDiceCount = getPoisonDiceCount(targetCharacter.level);
          effects.push(
            createEffect("poison", enemy.id, targetId, ae.poison.turns, 0, {
              count: poisonDiceCount,
              sides: ae.poison.sides,
            }),
          );
          events.push({
            type: "effect",
            actorId: enemy.id,
            target: targetId,
            effectApplied: "poison",
            message: `${targetCharacter.name} is poisoned for ${ae.poison.turns} turns`,
          });
        }
        if (ae.blind) {
          effects.push(
            createEffect("blind", enemy.id, targetId, ae.blind.turns, ae.blind.chance * 100),
          );
          events.push({
            type: "effect",
            actorId: enemy.id,
            target: targetId,
            effectApplied: "blind",
            message: `${targetCharacter.name} is blinded for ${ae.blind.turns} turns`,
          });
        }
      }
    }

    // enemy direct heal
    if (ability.heal) {
      const healAmount =
        rollDice(ability.heal.dice, ability.heal.sides) + (ability.heal.modifier ?? 0);
      const prevEnemyHp = enemy.hp;
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + healAmount);
      enemies = updateEnemyInList(enemies, enemy);
      const actualHeal = enemy.hp - prevEnemyHp;
      if (actualHeal > 0) {
        events.push({
          type: "enemy_ability",
          actorId: enemy.id,
          healing: actualHeal,
          abilityName,
          message: `${enemy.name} uses ${abilityName} and heals for ${actualHeal} HP`,
        });
      }
    }

    // enemy lifesteal
    if (ability.selfHealPercent && totalDamageDealt > 0) {
      const healAmount = Math.floor((totalDamageDealt * ability.selfHealPercent) / 100);
      const prevEnemyHp = enemy.hp;
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + healAmount);
      enemies = updateEnemyInList(enemies, enemy);
      const actualHeal = enemy.hp - prevEnemyHp;
      if (actualHeal > 0) {
        events.push({
          type: "enemy_ability",
          actorId: enemy.id,
          healing: actualHeal,
          abilityName,
          message: `${enemy.name} drains life and heals for ${actualHeal} HP`,
        });
      }
    }
  }

  return { events, effects, enemies, hpMap };
}

// damage over time

function processDoTs(
  effects: StatusEffect[],
  targetId: string,
  currentHp: number,
  targetName: string,
): { hp: number; events: BattleEvent[] } {
  const events: BattleEvent[] = [];
  let hp = currentHp;

  for (const effect of effects) {
    if (effect.targetId !== targetId) continue;
    if (!effect.dice || effect.dice.sides === 0) continue;

    if (effect.type === "burn" || effect.type === "poison" || effect.type === "selfWeakness") {
      const dotDamage =
        rollDice(effect.dice.count, effect.dice.sides) + (effect.dice.modifier ?? 0);
      hp = Math.max(0, hp - dotDamage);

      const label = effect.type === "selfWeakness" ? "dark energy" : effect.type;
      events.push({
        type: "dot",
        actorId: targetId,
        damage: dotDamage,
        message: `${targetName} takes ${dotDamage} ${label} damage`,
      });
    }
  }

  return { hp, events };
}
