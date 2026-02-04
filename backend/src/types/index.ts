export type InterviewTurn = {
  role: "INTERVIEWER" | "CANDIDATE";
  content: string;
  evaluation?: AnswerEvaluation; // will only populate for candidate answers
};

export type InterviewSession = {
  id: string;
  resumeContent: string[];
  history: InterviewTurn[];
};

export type AnswerEvaluation = {
  correctness: number; // 0–5
  depth: number; // 0–5
  clarity: number; // 0–5
  experience: number; // 0–5
  redFlags: string[];
  feedback: string;
};
