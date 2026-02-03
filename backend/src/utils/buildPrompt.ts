import { ollamaChat } from "../ai/ollama";

export const buildPrompt = (chunks: string[]) => {
  return `
    You are a senior backend interviewer.
    
    Candidate resume:
    ${chunks.join("\n---\n")}
    
    Ask ONE deep backend interview question.
    Focus on real-world experience and tradeoffs.
    `;
};

export async function askQuestion(resumeChunks: string[]) {
  const prompt = buildPrompt(resumeChunks);
  return ollamaChat(prompt);
}
