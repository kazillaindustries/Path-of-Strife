import { prisma } from "../lib/prisma";
import {
  AREAS,
  BATTLES_PER_AREA,
  type AreaDefinition,
  type StageDefinition,
  pickRandomStage,
  createMobEncounter,
  createBossEncounter,
  findStageByName,
} from "../lib/enemies";
import { startBattle, type ParticipantOverride } from "./battleService";
import {
  RUN_BETWEEN_BATTLE_HP_HEAL_PERCENT,
  RUN_BETWEEN_BATTLE_MANA_RESTORE_PERCENT,
  RUN_BETWEEN_BATTLE_STAMINA_RESTORE_PERCENT,
  RUN_AREA_REWARD_MULTIPLIERS,
  RUN_COMPLETION_BONUS_XP,
  RUN_COMPLETION_BONUS_GOLD,
  REST_STOP_SERVICES,
  CLASS_BASE_STATS,
  type RestStopServiceKey,
} from "../lib/constants";
import { addXp } from "./characterService";
import { type StatusEffect, createEffect } from "./statusEffects";

// types

export interface RunPath {
  areaName: string;
  stageName: string;
}

// start run

export async function startRun(partyId: string) {
  // grab party with members
  const party = await prisma.party.findUniqueOrThrow({
    where: { id: partyId },
    include: { members: { include: { character: true } } },
  });

  if (party.members.length === 0) {
    throw new Error("Party has no members");
  }

  // check for active run already
  const activeRun = await prisma.run.findFirst({
    where: { partyId, finished: false },
  });
  if (activeRun) {
    throw new Error("Party already has an active run. Finish or abandon it first.");
  }

  // build the path: one random stage per area in order
  const path: RunPath[] = AREAS.sort((a, b) => a.order - b.order).map((area) => {
    const stage = pickRandomStage(area);
    return { areaName: area.name, stageName: stage.name };
  });

  // reset gold and levels in one go
  const run = await prisma.$transaction(async (tx: any) => {
    // reset gold
    await tx.party.update({
      where: { id: partyId },
      data: { gold: 0 },
    });

    // reset chars to level 1
    for (const member of party.members) {
      const baseStats = CLASS_BASE_STATS[member.character.class as keyof typeof CLASS_BASE_STATS];
      await tx.character.update({
        where: { id: member.characterId },
        data: {
          level: 1,
          xp: 0,
          hp: baseStats.hp,
          maxHp: baseStats.hp,
          mana: baseStats.mana,
          maxMana: baseStats.mana,
          stamina: baseStats.stamina,
          maxStamina: baseStats.stamina,
        },
      });
    }

    // create the run
    return tx.run.create({
      data: {
        partyId,
        path: path as any,
        currentArea: 0,
        currentBattle: 0,
        finished: false,
        won: false,
      },
    });
  });

  // kick off first battle automatically
  const firstBattle = await createNextBattle(run.id);

  // fetch the full run with battles to return to client
  const fullRun = await getRunById(run.id);

  return {
    run: fullRun,
    path,
    totalAreas: path.length,
    battlesPerArea: BATTLES_PER_AREA,
    totalBattles: path.length * BATTLES_PER_AREA,
    currentBattle: firstBattle,
  };
}

// get run

export async function getRunById(runId: string) {
  const run = await prisma.run.findUnique({
    where: { id: runId },
    include: {
      battles: {
        orderBy: { createdAt: "asc" },
        include: { participants: { include: { character: true } } },
      },
    },
  });

  if (!run) return null;

  const path = run.path as unknown as RunPath[];

  return {
    ...run,
    path,
    totalAreas: path.length,
    battlesPerArea: BATTLES_PER_AREA,
    totalBattles: path.length * BATTLES_PER_AREA,
    progress: {
      area: run.currentArea,
      areaName: path[run.currentArea]?.areaName ?? "Complete",
      stageName: path[run.currentArea]?.stageName ?? "Complete",
      battle: run.currentBattle,
      battleType: run.currentBattle < BATTLES_PER_AREA - 1 ? "mob" : "boss",
    },
  };
}

// advance run

export async function advanceRun(runId: string) {
  const run = await prisma.run.findUniqueOrThrow({
    where: { id: runId },
    include: {
      battles: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (run.finished) {
    throw new Error("Run is already finished");
  }

  // if waiting at rest stop, continue on
  if (run.atRestStop) {
    await prisma.run.update({
      where: { id: runId },
      data: { atRestStop: false },
    });

    // grab last battle for carry over
    const lastBattle = run.battles[0];
    const battle = await createNextBattle(runId, lastBattle?.id);
    const path = run.path as unknown as RunPath[];

    return {
      run: { ...run, atRestStop: false },
      message: `Entering ${path[run.currentArea]!.areaName} — ${path[run.currentArea]!.stageName}, battle ${run.currentBattle + 1}/${BATTLES_PER_AREA}`,
      nextBattle: battle,
      restStop: false,
    };
  }

  // make sure last battle actually happened and was won
  const lastBattle = run.battles[0];
  if (!lastBattle) {
    throw new Error("No battles in this run yet");
  }
  if (!lastBattle.finished) {
    throw new Error("Current battle is still in progress");
  }
  if (!lastBattle.won) {
    // party lost, bail out and reset everything
    if (run.partyId) {
      await prisma.$transaction(async (tx: any) => {
        // reset gold
        await tx.party.update({
          where: { id: run.partyId },
          data: { gold: 0 },
        });

        // reset everyone to level 1
        const party = await tx.party.findUnique({
          where: { id: run.partyId },
          include: { members: { include: { character: true } } },
        });
        if (party) {
          for (const member of party.members) {
            const baseStats =
              CLASS_BASE_STATS[member.character.class as keyof typeof CLASS_BASE_STATS];
            await tx.character.update({
              where: { id: member.characterId },
              data: {
                level: 1,
                xp: 0,
                hp: baseStats.hp,
                maxHp: baseStats.hp,
                mana: baseStats.mana,
                maxMana: baseStats.mana,
                stamina: baseStats.stamina,
                maxStamina: baseStats.stamina,
              },
            });
          }
        }
      });
    }

    await prisma.run.update({
      where: { id: runId },
      data: { finished: true, won: false },
    });
    return {
      run: { ...run, finished: true, won: false },
      message: "Run failed — your party was defeated.",
      nextBattle: null,
      rewards: null,
      restStop: false,
    };
  }

  // figure out next battle
  const path = run.path as unknown as RunPath[];
  let nextArea = run.currentArea;
  let nextBattle = run.currentBattle + 1;
  const movingToNewArea = nextBattle >= BATTLES_PER_AREA;

  if (movingToNewArea) {
    nextArea += 1;
    nextBattle = 0;
  }

  if (nextArea >= path.length) {
    // run done!
    const bonusXp = RUN_COMPLETION_BONUS_XP;
    const bonusGold = RUN_COMPLETION_BONUS_GOLD;

    const lastBattleFull = await prisma.battle.findUniqueOrThrow({
      where: { id: lastBattle.id },
      include: { participants: true },
    });

    for (const p of lastBattleFull.participants) {
      await addXp(p.characterId, bonusXp);
    }

    if (run.partyId) {
      await prisma.party.update({
        where: { id: run.partyId },
        data: { gold: { increment: bonusGold } },
      });
    }

    await prisma.run.update({
      where: { id: runId },
      data: { finished: true, won: true, currentArea: nextArea, currentBattle: 0 },
    });
    return {
      run: { ...run, finished: true, won: true, currentArea: nextArea },
      message: "Run complete — all areas conquered!",
      nextBattle: null,
      rewards: { bonusXp, bonusGold },
      restStop: false,
    };
  }

  if (movingToNewArea) {
    // entering new area, set up rest stop
    await prisma.run.update({
      where: { id: runId },
      data: {
        currentArea: nextArea,
        currentBattle: nextBattle,
        atRestStop: true,
        blessings: [], // clear old blessings
      },
    });

    const services = getRestStopServicesForArea(run.currentArea);

    return {
      run: { ...run, currentArea: nextArea, currentBattle: nextBattle, atRestStop: true },
      message: `Area cleared! Rest stop available before ${path[nextArea]!.areaName}.`,
      nextBattle: null,
      restStop: true,
      restStopServices: services,
    };
  }

  // same area next battle, go immediately
  await prisma.run.update({
    where: { id: runId },
    data: { currentArea: nextArea, currentBattle: nextBattle },
  });

  const battle = await createNextBattle(runId, lastBattle.id);

  return {
    run: { ...run, currentArea: nextArea, currentBattle: nextBattle },
    message: `Advancing to ${path[nextArea]!.areaName} — ${path[nextArea]!.stageName}, battle ${nextBattle + 1}/${BATTLES_PER_AREA}`,
    nextBattle: battle,
    restStop: false,
  };
}

// rest stop stuff

/** get services available at rest stop after area clear */
function getRestStopServicesForArea(areaCleared: number) {
  return Object.entries(REST_STOP_SERVICES).map(([key, service]) => ({
    key: key as RestStopServiceKey,
    name: service.name,
    description: service.description,
    cost: service.costs[areaCleared] ?? service.costs[service.costs.length - 1]!,
    instant: service.instant,
  }));
}

/** rest stop info: services, blessings, gold */
export async function getRestStopInfo(runId: string) {
  const run = await prisma.run.findUniqueOrThrow({
    where: { id: runId },
    include: { party: true },
  });

  if (!run.atRestStop) {
    throw new Error("Run is not at a rest stop");
  }

  // area cleared is currentArea - 1
  const areaCleared = run.currentArea - 1;
  const services = getRestStopServicesForArea(areaCleared);
  const currentBlessings = (run.blessings as unknown as string[] | null) ?? [];

  return {
    gold: run.party?.gold ?? 0,
    services,
    currentBlessings,
  };
}

/** buy a blessing at rest stop */
export async function purchaseBlessing(runId: string, serviceKey: RestStopServiceKey) {
  const run = await prisma.run.findUniqueOrThrow({
    where: { id: runId },
    include: { party: true },
  });

  if (!run.atRestStop) {
    throw new Error("Run is not at a rest stop");
  }

  if (!run.party) {
    throw new Error("Run has no party");
  }

  const service = REST_STOP_SERVICES[serviceKey];
  if (!service) {
    throw new Error(`Unknown service: ${serviceKey}`);
  }

  // check blessing not already bought
  const currentBlessings = (run.blessings as unknown as string[] | null) ?? [];
  if (currentBlessings.includes(serviceKey)) {
    throw new Error(`${service.name} has already been purchased for this rest stop`);
  }

  // Area just cleared
  const areaCleared = run.currentArea - 1;
  const cost = service.costs[areaCleared] ?? service.costs[service.costs.length - 1]!;

  if (run.party.gold < cost) {
    throw new Error(`Not enough gold. Need ${cost}, have ${run.party.gold}`);
  }

  // take gold and add blessing
  const updatedBlessings = [...currentBlessings, serviceKey];

  await prisma.party.update({
    where: { id: run.party.id },
    data: { gold: { decrement: cost } },
  });

  await prisma.run.update({
    where: { id: runId },
    data: { blessings: updatedBlessings },
  });

  return {
    purchased: serviceKey,
    name: service.name,
    cost,
    goldRemaining: run.party.gold - cost,
    currentBlessings: updatedBlessings,
  };
}

// abandon run

export async function abandonRun(runId: string) {
  const run = await prisma.run.findUniqueOrThrow({
    where: { id: runId },
    include: { party: { include: { members: { include: { character: true } } } } },
  });

  if (run.finished) {
    throw new Error("Run is already finished");
  }

  // nuke gold and reset levels
  if (run.partyId) {
    await prisma.$transaction(async (tx: any) => {
      // Clear gold
      await tx.party.update({
        where: { id: run.partyId },
        data: { gold: 0 },
      });

      // reset base stats as well
      for (const member of run.party.members) {
        const baseStats = CLASS_BASE_STATS[member.character.class as keyof typeof CLASS_BASE_STATS];
        await tx.character.update({
          where: { id: member.characterId },
          data: {
            level: 1,
            xp: 0,
            hp: baseStats.hp,
            maxHp: baseStats.hp,
            mana: baseStats.mana,
            maxMana: baseStats.mana,
            stamina: baseStats.stamina,
            maxStamina: baseStats.stamina,
          },
        });
      }
    });
  }

  await prisma.run.update({
    where: { id: runId },
    data: { finished: true, won: false },
  });

  return { message: "Run abandoned" };
}

// internal: create next battle

async function createNextBattle(runId: string, previousBattleId?: string) {
  const run = await prisma.run.findUniqueOrThrow({
    where: { id: runId },
    include: {
      party: {
        include: {
          members: { include: { character: true } },
        },
      },
    },
  });

  const path = run.path as unknown as RunPath[];
  const currentPath = path[run.currentArea];
  if (!currentPath) {
    throw new Error("Run has no more areas");
  }

  const stageInfo = findStageByName(currentPath.stageName);
  if (!stageInfo) {
    throw new Error(`Stage '${currentPath.stageName}' not found in definitions`);
  }

  const { area, stage } = stageInfo;

  // battles 0-1 are mobs, 2 is boss
  const isBossBattle = run.currentBattle >= BATTLES_PER_AREA - 1;
  let enemies = isBossBattle
    ? createBossEncounter(stage, area.order)
    : createMobEncounter(stage, area.order);

  // easy mode difficulty scaling
  if ((run.party as any)?.easyMode) {
    // scales per area: Forest/Mountain/Volcano/Abyss
    const easyModeMultipliers = [0.7, 0.9, 1.0, 1.2];
    const multiplier = easyModeMultipliers[area.order] ?? 0.7;

    enemies = enemies.map((enemy) => {
      const scaledAbilities = enemy.abilities.map((ab) => {
        if (!ab.damage) return ab;
        return {
          ...ab,
          damage: {
            dice: ab.damage.dice,
            sides: ab.damage.sides,
            modifier: Math.max(0, Math.ceil((ab.damage.modifier ?? 0) * multiplier)),
          },
        };
      });
      return {
        ...enemy,
        hp: Math.ceil(enemy.hp * multiplier),
        maxHp: Math.ceil(enemy.maxHp * multiplier),
        abilities: scaledAbilities,
      };
    });
  }

  // carry hp/mana/stamina from last battle with partial heals
  let participantOverrides: ParticipantOverride[] | undefined;
  const blessings = (run.blessings as unknown as string[] | null) ?? [];

  if (previousBattleId) {
    const prevBattle = await prisma.battle.findUniqueOrThrow({
      where: { id: previousBattleId },
      include: { participants: { include: { character: true } } },
    });

    participantOverrides = prevBattle.participants.map((p) => {
      const char = p.character;

      // full heal blessing overrides everything
      if (blessings.includes("fullHeal")) {
        return {
          characterId: p.characterId,
          currentHp: char.maxHp,
          currentMana: char.maxMana,
          currentStamina: char.maxStamina,
        };
      }

      // apply between-battle healing
      const healedHp = Math.min(
        char.maxHp,
        p.currentHp + Math.floor((char.maxHp * RUN_BETWEEN_BATTLE_HP_HEAL_PERCENT) / 100),
      );
      const restoredMana = Math.min(
        char.maxMana,
        p.currentMana + Math.floor((char.maxMana * RUN_BETWEEN_BATTLE_MANA_RESTORE_PERCENT) / 100),
      );
      const restoredStamina = Math.min(
        char.maxStamina,
        p.currentStamina +
          Math.floor((char.maxStamina * RUN_BETWEEN_BATTLE_STAMINA_RESTORE_PERCENT) / 100),
      );

      // dead chars revive blessing = full hp else minimal
      const finalHp =
        p.currentHp <= 0
          ? blessings.includes("revive")
            ? char.maxHp
            : Math.max(1, Math.floor((char.maxHp * RUN_BETWEEN_BATTLE_HP_HEAL_PERCENT) / 100))
          : healedHp;

      return {
        characterId: p.characterId,
        currentHp: finalHp,
        currentMana: restoredMana,
        currentStamina: restoredStamina,
      };
    });
  } else {
    // first battle
    participantOverrides = run.party.members.map((m) => ({
      characterId: m.characterId,
      currentHp: m.character.maxHp,
      currentMana: m.character.maxMana,
      currentStamina: m.character.maxStamina,
    }));
  }

  // initial status effects from persistent blessings
  const initialEffects: StatusEffect[] = [];
  const party = run.party;

  if (blessings.includes("damageBuff")) {
    initialEffects.push(createEffect("partyDamageBuff", "blessing", "party", 999, 20));
  }

  if (blessings.includes("protection")) {
    initialEffects.push(createEffect("partyDamageReduction", "blessing", "party", 999, 20));
  }

  if (blessings.includes("shield") && party) {
    for (const member of party.members) {
      initialEffects.push(createEffect("shieldUntilHit", "blessing", member.characterId, 999, 50));
    }
  }

  const battle = await startBattle({
    partyId: run.partyId,
    enemies,
    runId: run.id,
    ...(participantOverrides ? { participantOverrides } : {}),
    ...(initialEffects.length > 0 ? { initialEffects } : {}),
  });

  return battle;
}
