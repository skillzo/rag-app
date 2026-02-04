import "dotenv/config";
import express, { Router } from "express";
import { readPdf } from "./utils/readPdf";
import path from "path";
import { chunkResume } from "./utils/chunkHandler";
import { askQuestion } from "./utils/buildPrompt";
import { searchChunks } from "./utils/searchChunks";
import { ingestResume } from "./utils/ingestResume";
import { ollamaEmbed } from "./ai/ollama";
import { randomUUID } from "crypto";
import { sessionStore } from "./interview/sessionStore";
import { processAnswer } from "./interview/answerService";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "*",
  })
);
const router: Router = express.Router();

router.post("/api/v1/upload", async (req, res) => {
  try {
    const resumePath = path.join(__dirname, "doc", "resume1.pdf");
    const pdfText = await readPdf(resumePath);
    const chunks = chunkResume(pdfText);
    const documentId = await ingestResume(chunks);
    return res.status(200).send(documentId);
  } catch (err) {
    console.error("Error in /api/v1/upload:", err);
    return res.status(500).json({ error: "Failed to upload resume" });
  }
});

router.post("/api/v1/start", async (req, res) => {
  try {
    const question = "backend interview questions";
    const embedding = await ollamaEmbed(question);
    const embeddedQuestion = await searchChunks(embedding, 5);
    const prompt = await askQuestion(embeddedQuestion);

    const sessionId = randomUUID();
    sessionStore.set(sessionId, {
      id: sessionId,
      resumeContent: embeddedQuestion,
      history: [
        {
          role: "INTERVIEWER",
          content: prompt,
        },
      ],
    });

    console.log("sessionId", sessionId);

    return res.status(200).json({ sessionId, content: prompt });
  } catch (err) {
    console.error("Error in /api/v1/start:", err);
    return res.status(500).json({ error: "Failed to start session" });
  }
});

router.post("/api/v1/answer", async (req, res) => {
  try {
    const { sessionId, answer } = req.body;
    const result = await processAnswer(sessionId, answer);

    if (!result.success) {
      return res.status(result.statusCode).json({ error: result.error });
    }

    return res.status(200).json({
      sessionId: result.sessionId,
      content: result.content,
      evaluation: result.evaluation,
    });
  } catch (err) {
    console.error("Error in /api/v1/answer:", err);
    return res.status(500).json({ error: "Failed to process answer" });
  }
});

router.get("/api/v1/get-history", async (req, res) => {
  try {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) {
      return res
        .status(400)
        .json({ error: "sessionId query param is required" });
    }

    const session = sessionStore.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const history = session.history;
    return res.status(200).json({ history });
  } catch (err) {
    console.error("Error in /api/v1/get-history:", err);
    return res.status(500).json({ error: "Failed to get history" });
  }
});

app.use(router);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("a user connected", socket.id);

  socket.on("disconnect", () => {
    console.log("a user disconnected", socket.id);
  });

  socket.on("message", async (data) => {
    try {
      const { sessionId, answer } = data;
      socket.emit("ai_thinking", { message: true });
      const result = await processAnswer(sessionId, answer);
      socket.emit("ai_thinking", { message: false });

      if (!result.success) {
        socket.emit("error", { message: result.error });
        return;
      }

      socket.emit("response", {
        sessionId: result.sessionId,
        content: result.content,
        evaluation: result.evaluation,
      });
    } catch (err) {
      console.error("Error handling message:", err);
      socket.emit("error", { message: "Failed to process answer" });
    }
  });
});

httpServer.listen(8000, () => {
  console.log("Server is running on port 8000");
});
