import { Router } from "express";
import { askRag } from "../services/pythonRag.service.js";

const router = Router();

router.post("/ask", async (req, res) => {
  const { question, categoryId, topic } = req.body || {};

  if (typeof question !== "string" || !question.trim()) {
    return res.status(400).json({
      ok: false,
      error: "Validation failed",
      message: "Question is required and must be non-empty.",
    });
  }

  if (question.length > 3000) {
    return res.status(413).json({
      ok: false,
      error: "Payload too large",
      message: "Question exceeds maximum length of 3000 characters.",
    });
  }

  const payload = {
    question: question.trim(),
    categoryId: typeof categoryId === "string" && categoryId.trim() ? categoryId.trim() : "emergency-knowledge",
    topic: typeof topic === "string" && topic.trim() ? topic.trim() : question.trim(),
  };

  try {
    const result = await askRag(payload);
    return res.json(result);
  } catch (err) {
    return res.status(503).json({
      ok: false,
      fallback: true,
      error: "Offline retrieval service unavailable",
      message:
        "Could not connect to the Python RAG service on port 8000. Start the Python service with: npm run dev:rag",
      detail: err.message,
    });
  }
});

export default router;
