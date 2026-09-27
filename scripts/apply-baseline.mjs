import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { Client } from "pg";

const root = process.cwd();
const envPath = path.join(root, ".env.local");
const sqlPath = path.join(root, "supabase", "baseline.sql");

if (!fs.existsSync(envPath)) {
  throw new Error("Arquivo .env.local não encontrado.");
}

const env = fs.readFileSync(envPath, "utf8");
const match = env.match(/^SUPABASE_DB_URL\s*=\s*(.*)$/m);
const connectionString = match?.[1]?.trim();

if (!connectionString) {
  throw new Error(
    "Adicione SUPABASE_DB_URL ao .env.local usando a URI de conexão do Supabase.",
  );
}

const sql = fs.readFileSync(sqlPath, "utf8");
const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  console.log("Conectando ao Supabase...");
  await client.connect();
  await client.query("set statement_timeout = 0");
  console.log("Aplicando supabase/baseline.sql. Isso pode levar alguns minutos...");
  await client.query(sql);
  console.log("Baseline aplicado com sucesso.");
} finally {
  await client.end().catch(() => undefined);
}
