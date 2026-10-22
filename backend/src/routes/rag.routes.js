import { Router } from "express";
import { askRag } from "../services/pythonRag.service.js";
const router = Router();
router.post("/ask", async (req, res) => {
  const { question, categoryId, topic } = req.body || {};
  if (typeof question !== "string" || !question.trim()) return res.status(400).json({ message: "Question is required." });
  if (question.length > 3000) return res.status(413).json({ message: "Question is too long." });
  if (typeof categoryId !== "string" || typeof topic !== "string") return res.status(400).json({ message: "categoryId and topic are required." });
  try { res.json(await askRag({ question: question.trim(), categoryId, topic })); }
  catch (err) { res.status(503).json({ message: "Offline retrieval service unavailable. Start the Python RAG service.", detail: err.message }); }
});
export default router;
