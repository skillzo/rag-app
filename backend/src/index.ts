import "dotenv/config";
import express from "express";
import { readPdf } from "./utils/readPdf";
import path from "path";
import { chunkResume } from "./utils/chunkHandler";
import { askQuestion } from "./utils/buildPrompt";
import { searchChunks } from "./utils/searchChunks";
import { ingestResume } from "./utils/ingestResume";
import { ollamaEmbed } from "./ai/ollama";

const app = express();

app.get("/api/v1/upload", async (req, res) => {
  const resumePath = path.join(__dirname, "doc", "resume1.pdf");
  const pdfText = await readPdf(resumePath);
  const chunks = chunkResume(pdfText);

  const documentId = await ingestResume(chunks);
  return res.send(documentId);
});

app.get("/api/v1/question", async (req, res) => {
  const question = "backend interview questions";

  const embedding = await ollamaEmbed(question);
  const embeddedQuestion = await searchChunks(embedding, 5);
  console.log("embeddedQuestion", embeddedQuestion);
  const prompt = await askQuestion(embeddedQuestion);

  console.log("prompt", prompt);
  return res.send(prompt);
});

app.listen(8000, () => {
  console.log("Server is running on port 3000");
});
