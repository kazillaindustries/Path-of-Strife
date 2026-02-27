import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { getBattleById, useAbility, useBasicAttack, useRecovery } from "../services/battleService";
import { AREAS } from "../lib/enemies";

const router = Router();

router.post("/:id/ability", async (req: Request, res: Response) => {
  try {
    const battleId = req.params.id as string;
    const { characterId, abilityName, targetEnemyId, targetAllyId } = req.body;

    if (!characterId || !abilityName || !targetEnemyId) {
      return res.status(400).json({ error: "Missing characterId, abilityName, or targetEnemyId" });
    }

    const result = await useAbility(
      battleId,
      characterId,
      abilityName,
      targetEnemyId,
      targetAllyId,
    );
    res.json(result);
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message ?? "Failed to use ability" });
  }
});

router.post("/:id/attack", async (req: Request, res: Response) => {
  try {
    const battleId = req.params.id as string;
    const { characterId, targetEnemyId } = req.body;

    if (!characterId || !targetEnemyId) {
      return res.status(400).json({ error: "Missing characterId or targetEnemyId" });
    }

    const result = await useBasicAttack(battleId, characterId, targetEnemyId);
    res.json(result);
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message ?? "Failed to use basic attack" });
  }
});

router.post("/:id/recovery", async (req: Request, res: Response) => {
  try {
    const battleId = req.params.id as string;
    const { characterId, action } = req.body;

    if (!characterId || !action || !["rest", "meditate"].includes(action)) {
      return res
        .status(400)
        .json({ error: "Missing characterId or invalid action (rest/meditate)" });
    }

    const result = await useRecovery(battleId, characterId, action);
    res.json(result);
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message ?? "Failed to use recovery" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const battleId = req.params.id as string;
    const battle = await getBattleById(battleId);
    if (!battle) {
      return res.status(404).json({ error: "Battle not found" });
    }
    res.json(battle);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message ?? "Failed to fetch battle" });
  }
});

// battle metadata endpoint for debugging
router.get("/:id/bug-report", async (req: Request, res: Response) => {
  try {
    const battleId = req.params.id as string;
    const rawBattle = await prisma.battle.findUnique({
      where: { id: battleId },
      include: {
        participants: { include: { character: true } },
        party: true,
        run: true,
      },
    });

    if (!rawBattle) {
      return res.status(404).json({ error: "Battle not found" });
    }

    const battle = rawBattle as any;
    const battleLog = (battle.battleLog as any) || [];
    const statusEffects = (battle.statusEffects as any) || [];

    const participants = (battle.participants as any).map((p: any) => {
      const pEffects = statusEffects.filter((e: any) => e.targetId === p.characterId);
      return {
        characterId: p.characterId,
        name: p.character.name,
        class: p.character.class,
        level: p.character.level,
        currentHp: p.currentHp,
        maxHp: p.character.hp,
        currentMana: p.currentMana,
        maxMana: p.character.mana,
        currentStamina: p.currentStamina,
        maxStamina: p.character.stamina,
        statusEffects: pEffects.map((e: any) => ({
          type: e.type,
          turns: e.turns,
        })),
      };
    });

    const enemies = (battle.enemies as any).map((e: any) => ({
      id: e.id,
      name: e.name,
      definitionName: e.definitionName,
      currentHp: e.hp,
      maxHp: e.maxHp,
      isBoss: e.isBoss,
      statusEffects: statusEffects
        .filter((se: any) => se.targetId === e.id)
        .map((se: any) => ({
          type: se.type,
          turns: se.turns,
        })),
    }));

    const runArea =
      (battle.run as any)?.currentArea !== undefined
        ? (AREAS[(battle.run as any).currentArea]?.name ?? "N/A")
        : "N/A";
    const runStage = (battle.run as any)?.stageName ?? "N/A";
    const difficulty =
      runArea === "Forest"
        ? "1.0x (Normal)"
        : runArea === "Mountain"
          ? "1.3x (Hard)"
          : runArea === "Volcano"
            ? "1.6x (Harder)"
            : runArea === "Abyss"
              ? "2.0x (Hardest)"
              : "N/A";

    const bugReport = {
      battleId,
      timestamp: battle.createdAt,
      finished: battle.finished,
      won: battle.won,
      turn: battle.turn,
      battleType: battle.type,
      partyName: (battle.party as any)?.name,
      runArea,
      runStage,
      difficulty,
      easyMode: (battle.party as any)?.easyMode ?? false,
      participants,
      enemies,
      eventCount: battleLog.length,
      events: battleLog,
    };

    res.json(bugReport);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message ?? "Failed to generate bug report" });
  }
});

export default router;
