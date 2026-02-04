import { sessionStore } from "./sessionStore";
import { buildFollowUpPrompt, evaluateAnswer } from "../utils";
import { ollamaChat } from "../ai/ollama";

export type ProcessAnswerResult = {
  success: true;
  sessionId: string;
  content: string;
  evaluation: any | null;
};

export type ProcessAnswerError = {
  success: false;
  error: string;
  statusCode: number;
};

export type ProcessAnswerResponse = ProcessAnswerResult | ProcessAnswerError;

export async function processAnswer(
  sessionId: string,
  answer: string
): Promise<ProcessAnswerResponse> {
  // Validation
  if (!sessionId || answer === undefined || answer === null) {
    return {
      success: false,
      error: "sessionId and answer are required",
      statusCode: 400,
    };
  }

  const session = sessionStore.get(sessionId);
  if (!session) {
    return {
      success: false,
      error: "Session not found",
      statusCode: 404,
    };
  }

  const lastTurn = session.history[session.history.length - 1];
  if (!lastTurn || lastTurn.role !== "INTERVIEWER") {
    return {
      success: false,
      error: "No interviewer question to answer",
      statusCode: 400,
    };
  }

  const question = lastTurn.content;

  // Evaluate answer
  const evaluation = await evaluateAnswer(
    session.resumeContent,
    question,
    answer
  );

  // Update session history with candidate answer
  session.history.push({
    role: "CANDIDATE",
    content: answer,
    evaluation: evaluation ?? undefined,
  });

  // Generate follow-up question
  const prompt = buildFollowUpPrompt(session.resumeContent, session.history);
  const followUp = await ollamaChat(prompt);

  // Update session history with interviewer follow-up
  session.history.push({
    role: "INTERVIEWER",
    content: followUp,
  });

  return {
    success: true,
    sessionId,
    content: followUp,
    evaluation: evaluation ?? null,
  };
}
