import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

// attach user to req if valid token
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Missing auth token" });
    }

    const user = await prisma.user.findUnique({
      where: { sessionToken: token },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    (req as any).user = user;
    next();
  } catch (error: any) {
    console.error("Auth error:", error);
    res.status(500).json({ error: "Auth failed" });
  }
}
