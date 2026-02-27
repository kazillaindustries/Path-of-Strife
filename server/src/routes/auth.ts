import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// join / login with email
router.post("/join", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email is required" });
    }

    // clean up email
    const normalizedEmail = email.toLowerCase().trim();

    // get or create user
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // new user
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: normalizedEmail.split("@")[0] || null, // use email prefix as default name
          sessionToken: uuidv4(),
        },
      });
    } else if (!user.sessionToken) {
      // existing user with no token yet -> generate one
      user = await prisma.user.update({
        where: { id: user.id },
        data: { sessionToken: uuidv4() },
      });
    }

    res.json({
      token: user.sessionToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error: any) {
    console.error("Auth error:", error);
    res.status(500).json({ error: error.message ?? "Failed to join" });
  }
});

export default router;
