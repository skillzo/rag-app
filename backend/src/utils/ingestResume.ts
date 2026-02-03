import { ollamaEmbed } from "../ai/ollama";
import { pool } from "../db/client";

export async function ingestResume(chunks: string[]) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const docRes = await client.query(
      "INSERT INTO documents (source) VALUES ($1) RETURNING id",
      ["resume"],
    );
    const documentId = docRes.rows[0].id;

    console.log("documentId", documentId);
    for (const chunk of chunks) {
      const embedding = await ollamaEmbed(chunk);
      if (embedding.length !== 768) {
        throw new Error(`Invalid embedding length: ${embedding.length}`);
      }
      const vector = `[${embedding.join(",")}]`;

      console.log("vector length", embedding.length);

      await client.query(
        "INSERT INTO chunks (document_id, content, embedding) VALUES ($1, $2, $3::vector)",
        [documentId, chunk, vector],
      );
    }

    await client.query("COMMIT");
    console.log("ingestion complete");
    return documentId;
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("ingestion failed", err);
    throw err;
  } finally {
    client.release();
  }
}
