import fs from "fs";
import pdfParse from "pdf-parse";

export const readPdf = async (filePath: string) => {
  const buffer = fs.readFileSync(filePath);

  const pdf = await pdfParse(buffer);
  return pdf.text
    .replace(/\r\n/g, "\n")
    .replace(/\n{2,}/g, "\n\n")
    .trim();
};
