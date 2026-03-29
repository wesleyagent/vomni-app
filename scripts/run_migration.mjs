/**
 * Executes 003_business_operations.sql against Supabase
 * using the Management API SQL endpoint.
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = "https://obyewocpvopatuagqfkx.supabase.co";
const ANON_KEY = "sb_publishable_aUFcXzyVsE7PS_aegRUQKA_IyiorPw3";
const PROJECT_REF = "obyewocpvopatuagqfkx";

const sql = readFileSync(
  join(__dirname, "../supabase/migrations/003_business_operations.sql"),
  "utf-8"
);

// Split into individual statements (skip blanks / comments)
const statements = sql
  .split(";")
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith("--"));

async function runViaRpc() {
  console.log("Attempting via Supabase pg/query endpoint...");
  const res = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text.slice(0, 500));
  return res.ok;
}

async function runViaManagementApi() {
  console.log("\nAttempting via Supabase Management API...");
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text.slice(0, 500));
  return res.ok;
}

async function runViaRestRpc() {
  console.log("\nAttempting individual statements via REST rpc...");
  let allOk = true;
  for (const stmt of statements) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ANON_KEY}`,
        apikey: ANON_KEY,
      },
      body: JSON.stringify({ sql: stmt }),
    });
    if (!res.ok) {
      const t = await res.text();
      console.log(`  FAIL [${res.status}]: ${stmt.slice(0, 60)}...`);
      console.log("  Error:", t.slice(0, 200));
      allOk = false;
    } else {
      console.log(`  OK: ${stmt.slice(0, 60)}...`);
    }
  }
  return allOk;
}

(async () => {
  const ok1 = await runViaRpc();
  if (!ok1) {
    const ok2 = await runViaManagementApi();
    if (!ok2) {
      await runViaRestRpc();
    }
  }
  console.log("\nDone. Check output above — if all failed, paste the SQL from");
  console.log("supabase/migrations/003_business_operations.sql into the");
  console.log("Supabase Dashboard → SQL Editor → New query.");
})();
