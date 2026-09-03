import * as dns from "dns";
import * as dotenv from "dotenv";
import * as path from "path";
import { Client } from "pg";
import * as fs from "fs";

dns.setDefaultResultOrder("ipv4first");
dotenv.config({ path: path.join(__dirname, "..", ".env") });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL");
  const sql = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "..",
      "..",
      "supabase",
      "migrations",
      "056_reception_documental_loans.sql",
    ),
    "utf8",
  );
  const client = new Client({
    connectionString: url,
    ssl:
      url.includes("supabase") || url.includes("pooler")
        ? { rejectUnauthorized: false }
        : undefined,
  });
  await client.connect();
  try {
    await client.query(sql);
    const r = await client.query<{ code: string }>(`
      SELECT p.code FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE r.code = 'RECEPCIONISTA'
      ORDER BY p.code`);
    console.log("OK 056. RECEPCIONISTA:", r.rows.map((x) => x.code).join(", "));
  } finally {
    await client.end();
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
