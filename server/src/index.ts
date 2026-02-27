import express from "express";
import charactersRouter from "./routes/characters";
import partiesRouter from "./routes/parties";
import battlesRouter from "./routes/battles";
import runsRouter from "./routes/runs";
import authRouter from "./routes/auth";
import { authMiddleware } from "./middleware/auth";
import { rateLimitMiddleware } from "./middleware/rateLimit";
import { prisma } from "./lib/prisma";
import cors from "cors";

const app = express();

app.use(express.json());
// allow CORS from the frontend 
app.use(cors({ origin: true }));
app.use(rateLimitMiddleware);

// public auth endpoints (no token required)
app.use("/auth", authRouter);

// all other routes require auth token
// health check should be public and not hit the DB/auth middleware
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(authMiddleware);

app.use("/characters", charactersRouter);
app.use("/parties", partiesRouter);
app.use("/battles", battlesRouter);
app.use("/runs", runsRouter);

app.get("/", (_req, res) => {
  res.json({
    message: "RPG API is running",
    endpoints: ["/auth/join", "/characters", "/parties", "/battles", "/runs"],
  });
});



const port = process.env.PORT ? Number(process.env.PORT) : 3000;

app.listen(port, () => {
  // startup log for me
  console.log(`RPG backend listening on port ${port}`);
});
