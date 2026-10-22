import { Router } from "express";
const router = Router();
router.get("/", (_req, res) => res.json({ ok: true, service: "kiwix-emergency-api", mode: "local" }));
export default router;
