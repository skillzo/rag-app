import { pool, query } from "../db/client";

export const searchChunks = async (query: number[], limit = 5) => {
  const queryVector = `[${query.join(",")}]`;
  const res = await pool.query(
    `
        SELECT content
        FROM chunks
        ORDER BY embedding <=> $1::vector
        LIMIT $2
        `,
    [queryVector, limit]
  );

  return res.rows.map((r) => r.content);
};
