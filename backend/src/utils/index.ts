import { ollamaChat } from "../ai/ollama";
import { InterviewTurn } from "../types";

export const getRecentHistory = (
  history: InterviewTurn[],
  turns: number
): InterviewTurn[] => {
  return history.slice(-turns);
};

// follow up prompt

export function buildFollowUpPrompt(
  resumeContext: string[],
  history: InterviewTurn[]
) {
  const recentHistory = getRecentHistory(history, 5);

  return `
  You are a senior backend interviewer and you are conducting a interview with a candidate.
  
  Candidate resume:
  ${resumeContext.join("\n---\n")}
  
  Chat history:
  ${recentHistory.map((turn) => `${turn.role}: ${turn.content}`).join("\n")}

  Based on the conversation so far:
    - Ask ONE follow-up question
    - Go deeper into the candidate’s last answer
    - Do NOT introduce a new topic

  Output ONLY the follow-up question. No greeting, preamble, or explanation. Just the raw question.
  `;
}

export function buildNewQuestionPrompt(
  resumeContext: string[],
  history: InterviewTurn[]
) {
  const recentHistory = getRecentHistory(history, 6);

  return `
  You are a senior backend interviewer conducting an interview.

  Candidate resume:
  ${resumeContext.join("\n---\n")}

  Conversation so far:
  ${recentHistory.map((turn) => `${turn.role}: ${turn.content}`).join("\n")}

  The candidate just answered a follow-up. Now ask ONE new main question on a different topic.
  Pick a new backend area not yet covered. Focus on real-world experience and tradeoffs.

  Output ONLY the interview question. No greeting, preamble, or explanation. Just the raw question.
  `;
}

export function buildEvaluationResult(
  resumeContext: string[],
  question: string,
  answer: string
) {
  return `
  You are a senior backend interviewer evaluating a candidate answer.

  Candidate background (resume):
  ${resumeContext.join("\n---\n")}

  Interview question:
  ${question}

  Candidate answer:
  ${answer}

  Evaluate STRICTLY using this rubric:
  - Correctness (technical accuracy)
  - Depth (beyond surface-level)
  - Clarity (clear and structured)
  - Practical experience (real-world signals)

  Return ONLY valid JSON with this exact shape:
  {
    "correctness": number,
    "depth": number,
    "clarity": number,
    "experience": number,
    "redFlags": string[],
    "feedback": string
  }
`;
}

export async function evaluateAnswer(
  resumeContent: string[],
  question: string,
  answer: string
) {
  try {
    const prompt = buildEvaluationResult(resumeContent, question, answer);
    const evaluation = await ollamaChat(prompt);
    return JSON.parse(evaluation);
  } catch (error) {
    console.error("Error evaluating answer", error);
    return null;
  }
}
