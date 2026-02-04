import { sessionStore } from "./sessionStore";
import {
  buildFollowUpPrompt,
  buildNewQuestionPrompt,
  evaluateAnswer,
} from "../utils";
import { ollamaChat } from "../ai/ollama";
import { createSession, insertMessage } from "../db/messageRepository";
import { AnswerEvaluation } from "../types";

const TOTAL_INTERVIEWER_TURNS = 10; // 5 main questions + 5 follow-ups

export type ProcessAnswerResult = {
  success: true;
  sessionId: string;
  content: string | null;
  evaluation: AnswerEvaluation | null;
  interviewComplete?: boolean;
  evaluations?: AnswerEvaluation[];
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

  const session = await sessionStore.get(sessionId);
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

  const interviewerCount = session.history.filter(
    (t) => t.role === "INTERVIEWER"
  ).length;

  if (interviewerCount >= TOTAL_INTERVIEWER_TURNS) {
    // Interview complete - no more questions
    await sessionStore.set(sessionId, session);
    await createSession(sessionId);

    const candidateSeq = session.history.length - 1;
    await insertMessage(
      sessionId,
      "CANDIDATE",
      answer,
      candidateSeq,
      evaluation ?? undefined
    );

    const evaluations = session.history
      .filter((t) => t.role === "CANDIDATE" && t.evaluation)
      .map((t) => t.evaluation!) as AnswerEvaluation[];

    return {
      success: true,
      sessionId,
      content: null,
      evaluation: evaluation ?? null,
      interviewComplete: true,
      evaluations,
    };
  }

  // Generate next question: follow-up (odd) or new question (even)
  const isFollowUp = interviewerCount % 2 === 1;
  const prompt = isFollowUp
    ? buildFollowUpPrompt(session.resumeContent, session.history)
    : buildNewQuestionPrompt(session.resumeContent, session.history);
  const nextQuestion = await ollamaChat(prompt);

  session.history.push({
    role: "INTERVIEWER",
    content: nextQuestion,
  });

  await sessionStore.set(sessionId, session);
  await createSession(sessionId);
  const candidateSeq = session.history.length - 2;
  const interviewerSeq = session.history.length - 1;
  await insertMessage(
    sessionId,
    "CANDIDATE",
    answer,
    candidateSeq,
    evaluation ?? undefined
  );
  await insertMessage(sessionId, "INTERVIEWER", nextQuestion, interviewerSeq);

  return {
    success: true,
    sessionId,
    content: nextQuestion,
    evaluation: evaluation ?? null,
  };
}
