import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import {
  addCharacterToParty,
  createParty,
  deleteParty,
  getPartiesForUser,
  getPartyById,
  removeCharacterFromParty,
  updatePartyGold,
  addGoldToParty,
  getPartySlotInfo,
} from "../services/partyService";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const authenticatedUserId = (req as any).user.id;
    const parties = await getPartiesForUser(authenticatedUserId);
    res.json(parties);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message ?? "Failed to fetch parties" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, characterIds } = req.body;
    const userId = (req as any).user.id;

    if (!name) {
      return res.status(400).json({ error: "Missing name" });
    }

    const party = await createParty(userId, name, characterIds);
    res.status(201).json(party);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message ?? "Failed to create party" });
  }
});

router.get("/user/:userId", async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    const parties = await getPartiesForUser(userId);
    res.json(parties);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message ?? "Failed to fetch parties" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const partyId = req.params.id as string;
    const authenticatedUserId = (req as any).user.id;

    const party = await getPartyById(partyId);
    if (!party) {
      return res.status(404).json({ error: "Party not found" });
    }

    // verify user owns this party
    if (party.userId !== authenticatedUserId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    res.json(party);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message ?? "Failed to fetch party" });
  }
});

router.post("/:id/characters", async (req: Request, res: Response) => {
  try {
    const { characterId } = req.body;
    if (!characterId) {
      return res.status(400).json({ error: "Missing characterId" });
    }

    const partyId = req.params.id as string;
    const link = await addCharacterToParty(partyId, characterId);
    res.status(201).json(link);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message ?? "Failed to add character to party" });
  }
});

router.delete("/:id/characters/:characterId", async (req: Request, res: Response) => {
  try {
    const partyId = req.params.id as string;
    const characterId = req.params.characterId as string;
    await removeCharacterFromParty(partyId, characterId);
    res.status(204).send();
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message ?? "Failed to remove character from party" });
  }
});

router.put("/:id/gold", async (req: Request, res: Response) => {
  try {
    const partyId = req.params.id as string;
    const { gold } = req.body;

    if (typeof gold !== "number") {
      return res.status(400).json({ error: "Gold must be a number" });
    }

    const party = await updatePartyGold(partyId, gold);
    res.json(party);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message ?? "Failed to update party gold" });
  }
});

router.post("/:id/gold", async (req: Request, res: Response) => {
  try {
    const partyId = req.params.id as string;
    const { amount } = req.body;

    if (typeof amount !== "number") {
      return res.status(400).json({ error: "Amount must be a number" });
    }

    const party = await addGoldToParty(partyId, amount);
    res.json(party);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message ?? "Failed to add gold to party" });
  }
});

router.get("/:id/slots", async (req: Request, res: Response) => {
  try {
    const partyId = req.params.id as string;
    const slotInfo = await getPartySlotInfo(partyId);
    res.json(slotInfo);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message ?? "Failed to get slot info" });
  }
});

router.put("/:id/easy-mode", async (req: Request, res: Response) => {
  try {
    const partyId = req.params.id as string;
    const { easyMode } = req.body;

    if (typeof easyMode !== "boolean") {
      return res.status(400).json({ error: "easyMode must be a boolean" });
    }

    const updated = await prisma.party.update({
      where: { id: partyId },
      data: { easyMode },
      include: { members: { include: { character: true } } },
    });

    res.json(updated);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message ?? "Failed to update easy mode" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const partyId = req.params.id as string;
    await deleteParty(partyId);
    res.status(204).send();
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message ?? "Failed to delete party" });
  }
});

export default router;
