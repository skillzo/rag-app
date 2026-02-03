const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";

export const ollamaChat = async (prompt: string) => {
  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama3:latest",
      prompt: prompt,
      stream: false,
    }),
  });

  const data = await res.json();
  console.log("ollama response", data);
  return data.response;
};

export const ollamaEmbed = async (text: string) => {
  const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "nomic-embed-text",
      prompt: text,
    }),
  });
  const data = await res.json();
  return data.embedding;
};
