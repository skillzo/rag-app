import path from "path";
import fs from "fs";
import { query } from "../client";

const runMigrations = async () => {
  const dir = __dirname;

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const filePath = path.join(dir, file);
    const sql = fs.readFileSync(filePath, "utf8");
    console.log(`Running migration: ${file}`);
    await query(sql);
  }

  console.log("migration complete");
};

runMigrations();
