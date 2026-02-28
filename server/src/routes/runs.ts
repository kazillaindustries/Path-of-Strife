import { Router, Request, Response } from "express";
import {
  startRun,
  getRunById,
  advanceRun,
  abandonRun,
  getRestStopInfo,
  purchaseBlessing,
} from "../services/runService";
import { verifyPartyOwnership } from "../lib/authUtils";
import { prisma } from "../lib/prisma";
import { AREAS, BATTLES_PER_AREA } from "../lib/enemies";
import { type RestStopServiceKey, REST_STOP_SERVICES } from "../lib/constants";

const router = Router();

// list all areas and info
router.get("/areas", async (_req: Request, res: Response) => {
  const areas = AREAS.map((a) => ({
    name: a.name,
    order: a.order,
    stages: a.stages.map((s) => ({
      name: s.name,
      description: s.description,
      enemyPoolSize: s.enemyPool.length,
      bossName: s.boss.name,
      bossHp: s.boss.hp,
    })),
  }));
  res.json({ areas, battlesPerArea: BATTLES_PER_AREA });
});

// find active run for given party
router.get("/active/:partyId", async (req: Request, res: Response) => {
  try {
    const partyId = req.params.partyId as string;
    const userId = (req as any).user.id;

    // verify user owns this party
    const owns = await verifyPartyOwnership(partyId, userId);
    if (!owns) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const run = await prisma.run.findFirst({ where: { partyId, finished: false } });
    console.log(`[runs] active lookup for party=${partyId} -> run=${run ? run.id : "none"}`);
    if (!run) {
      return res.status(404).json({ error: "No active run found" });
    }
    const fullRun = await getRunById(run.id);
    console.log(`[runs] returning active run ${fullRun?.id} for party=${partyId}`);
    res.json(fullRun);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message ?? "Failed to find active run" });
  }
});

// new run
router.post("/start", async (req: Request, res: Response) => {
  try {
    const { partyId } = req.body;
    const userId = (req as any).user.id;

    if (!partyId) {
      return res.status(400).json({ error: "Missing partyId" });
    }

    // verify user owns this party
    const owns = await verifyPartyOwnership(partyId, userId);
    if (!owns) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const result = await startRun(partyId);
    console.log(`[runs] started run ${result.run?.id} for party=${partyId}`);
    res.status(201).json(result);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message ?? "Failed to start run" });
  }
});

// run info
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const run = await getRunById(req.params.id as string);
    if (!run) {
      return res.status(404).json({ error: "Run not found" });
    }
    res.json(run);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message ?? "Failed to fetch run" });
  }
});

// go next
router.post("/:id/advance", async (req: Request, res: Response) => {
  try {
    const result = await advanceRun(req.params.id as string);
    res.json(result);
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message ?? "Failed to advance run" });
  }
});

// abandon
router.post("/:id/abandon", async (req: Request, res: Response) => {
  try {
    const result = await abandonRun(req.params.id as string);
    res.json(result);
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message ?? "Failed to abandon run" });
  }
});

// rest stop info
router.get("/:id/shop", async (req: Request, res: Response) => {
  try {
    const result = await getRestStopInfo(req.params.id as string);
    res.json(result);
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message ?? "Failed to get shop info" });
  }
});

// buy shit
router.post("/:id/shop", async (req: Request, res: Response) => {
  try {
    const { service } = req.body;
    if (!service || !(service in REST_STOP_SERVICES)) {
      return res.status(400).json({
        error: `Invalid service. Valid options: ${Object.keys(REST_STOP_SERVICES).join(", ")}`,
      });
    }

    const result = await purchaseBlessing(req.params.id as string, service as RestStopServiceKey);
    res.json(result);
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message ?? "Failed to purchase blessing" });
  }
});

export default router;
