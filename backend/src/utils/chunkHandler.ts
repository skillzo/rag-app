const SECTION_HEARDERS = [
  "education",
  "work experience",
  "experience",
  "skills",
  "projects",
  "certifications",
  "professional experience",
];

export const splitBySections = (text: string) => {
  const chunks: string[] = [];
  const indexes: { text: string; index: number }[] = [];

  for (const header of SECTION_HEARDERS) {
    const idx = text.toLowerCase().indexOf(header.toLowerCase());
    if (idx !== -1) {
      indexes.push({ text: header, index: idx });
    }
  }

  if (indexes.length === 0) {
    return [];
  }

  indexes.sort((a, b) => a.index - b.index);

  for (let i = 0; i < indexes.length - 1; i++) {
    const start = indexes[i].index;
    const end = indexes[i + 1].index ?? text.length;
    const chunk = text.slice(start, end).trim();
    chunks.push(chunk);
  }

  return chunks.filter(Boolean);
};

const MAX_CHUNK_SIZE = 3000;
const OVERLAP_SIZE = 300;

export function chunkBySize(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = start + MAX_CHUNK_SIZE;
    const chunk = text.slice(start, end);
    chunks.push(chunk.trim());
    start = end - OVERLAP_SIZE;
  }

  return chunks.filter(Boolean);
}

export function chunkResume(text: string): string[] {
  const sectionChunks = splitBySections(text);

  if (sectionChunks.length > 0) {
    return sectionChunks;
  }

  return chunkBySize(text);
}
