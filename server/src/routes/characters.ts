import { Router, Request, Response } from "express";
import {
  createCharacter,
  deleteCharacter,
  getCharacterById,
  listCharacters,
  updateCharacter,
  levelUpCharacter,
  addXp,
} from "../services/characterService";
import { isValidClass, ALL_CLASSES, CLASS_BASE_STATS, CLASS_PASSIVES } from "../lib/constants";

const router = Router();

router.get("/classes", (_req: Request, res: Response) => {
  const classes = ALL_CLASSES.map((c) => ({
    name: c,
    baseStats: CLASS_BASE_STATS[c],
    passive: CLASS_PASSIVES[c],
  }));
  res.json(classes);
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, class: characterClass, avatarUrl } = req.body;

    if (!name || !characterClass) {
      return res.status(400).json({ error: "Missing required fields: name and class" });
    }

    if (!isValidClass(characterClass)) {
      return res
        .status(400)
        .json({ error: `Invalid class. Valid classes: ${ALL_CLASSES.join(", ")}` });
    }

    const character = await createCharacter({
      name,
      class: characterClass,
      avatarUrl,
    });

    res.status(201).json(character);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message ?? "Failed to create character" });
  }
});

router.get("/", async (_req: Request, res: Response) => {
  try {
    const characters = await listCharacters();
    res.json(characters);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message ?? "Failed to list characters" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const characterId = req.params.id as string;
    const character = await getCharacterById(characterId);
    if (!character) {
      return res.status(404).json({ error: "Character not found" });
    }
    res.json(character);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message ?? "Failed to fetch character" });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const characterId = req.params.id as string;
    const character = await updateCharacter(characterId, req.body ?? {});
    res.json(character);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message ?? "Failed to update character" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const characterId = req.params.id as string;
    await deleteCharacter(characterId);
    res.status(204).send();
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message ?? "Failed to delete character" });
  }
});

router.post("/:id/levelup", async (req: Request, res: Response) => {
  try {
    const characterId = req.params.id as string;
    const character = await levelUpCharacter(characterId);
    res.json(character);
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message ?? "Failed to level up character" });
  }
});

router.post("/:id/xp", async (req: Request, res: Response) => {
  try {
    const characterId = req.params.id as string;
    const { amount } = req.body;

    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "Amount must be a positive number" });
    }

    const character = await addXp(characterId, amount);
    res.json(character);
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message ?? "Failed to add XP" });
  }
});

export default router;
