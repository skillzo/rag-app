import { Router } from "express";
import { query } from "../db/client";

export const healthRouter: Router = Router();

healthRouter.get("/health/db", async (_, res) => {
  try {
    await query("SELECT 1");
    res.json({ status: "ok" });
  } catch {
    res.status(500).json({ status: "db_down" });
  }
});
