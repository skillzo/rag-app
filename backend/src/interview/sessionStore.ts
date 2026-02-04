import { InterviewSession } from "../types";
import { redis } from "../redis/client";

const KEY_PREFIX = "session:";

export const sessionStore = {
  async get(sessionId: string): Promise<InterviewSession | null> {
    const data = await redis.get(`${KEY_PREFIX}${sessionId}`);
    if (!data) return null;
    return JSON.parse(data) as InterviewSession;
  },

  async set(sessionId: string, session: InterviewSession): Promise<void> {
    await redis.set(`${KEY_PREFIX}${sessionId}`, JSON.stringify(session));
  },
};
