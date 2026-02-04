import { query } from "./client";
import { AnswerEvaluation } from "../types";

export async function createSession(sessionId: string): Promise<void> {
  await query(
    `INSERT INTO sessions (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`,
    [sessionId]
  );
}

export async function insertMessage(
  sessionId: string,
  role: "INTERVIEWER" | "CANDIDATE",
  content: string,
  sequence: number,
  evaluation?: AnswerEvaluation
): Promise<void> {
  await query(
    `INSERT INTO messages (session_id, role, content, evaluation, sequence)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      sessionId,
      role,
      content,
      evaluation ? JSON.stringify(evaluation) : null,
      sequence,
    ]
  );
}
