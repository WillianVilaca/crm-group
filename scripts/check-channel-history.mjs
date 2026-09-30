/** Run with node --env-file=.env.local; all fixture data and DDL are rolled back. */
import fs from "node:fs";
import assert from "node:assert/strict";
import { randomUUID, X509Certificate } from "node:crypto";
import { Client } from "pg";

const uri = new URL(process.env.SUPABASE_DB_URL ?? "");
// Never let connection-string flags silently disable certificate verification.
for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert"]) uri.searchParams.delete(key);
const caPath = process.env.PGSSLROOTCERT;
let ca = caPath ? fs.readFileSync(caPath, "utf8") : undefined;
if (!ca && uri.hostname.endsWith(".pooler.supabase.com")) {
  // Public Supabase Root 2021 CA from the vendor's HTTPS download origin.
  // No database password is sent to this download endpoint.
  const response = await fetch("https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt", { signal: AbortSignal.timeout(10_000), redirect: "error" });
  if (!response.ok) throw new Error("supabase_ca_download_failed");
  ca = await response.text();
  const certificate = new X509Certificate(ca);
  if (!certificate.ca || !certificate.subject.includes("Supabase Root 2021")) throw new Error("supabase_ca_invalid");
}
const db = new Client({ connectionString: uri.toString(), ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) }, connectionTimeoutMillis: 10_000 });
const migration = fs.readFileSync(new URL("../supabase/migrations/20260930120000_0382_historico_de_conversas.sql", import.meta.url), "utf8");
let connected = false;
try {
  await db.connect(); connected = true;
  await db.query("begin; set local lock_timeout='5s'; set local statement_timeout='30s'");
  await db.query(migration);
  await db.query(migration); // Idempotent rollout, including triggers and redaction backfill.
  const org = randomUUID(); const other = randomUUID(); const channel = randomUUID();
  for (const id of [org, other]) await db.query("insert into organizations(id,slug,legal_name,display_name) values($1,$2,'History verification','History verification')", [id, `history-proof-${id}`]);
  await db.query("insert into channel_sessions(id,organization_id,provider,waha_session_name,status,webhook_secret_encrypted) values($1,$2,'waha',$3,'WORKING',$4)", [channel, org, `proof-${channel}`, Buffer.from("fixture-only")]);
  const sample = {
    external_id: "false_551188887777@c.us_HISTORY_PROOF", external_key: "HISTORY_PROOF", chat_id: "551188887777@c.us",
    identity_kind: "phone", phone_number: "+551188887777", lid: null, display_name: "Fixture",
    direction: "inbound", type: "text", body: "Historical fixture", sent_at: "2026-01-01T12:00:00.000Z", ack: 3,
  };
  // Real transport keys contain no underscores; use one accordingly.
  sample.external_id = "false_551188887777@c.us_HISTORYPROOF"; sample.external_key = "HISTORYPROOF";
  const call = async (orgId, messages) => (await db.query("select fn_import_channel_history($1,$2,$3::jsonb) as receipt", [orgId, channel, JSON.stringify(messages)])).rows[0].receipt;
  assert.deepEqual(await call(org, [sample]), { imported: 1, skipped: 0 });
  assert.deepEqual(await call(org, [sample]), { imported: 0, skipped: 1 });
  const { rows: [conversation] } = await db.query("select id,contact_id,status,unread_count_for_assignee,last_message_at from conversations where organization_id=$1 and channel_session_id=$2", [org, channel]);
  assert.equal(conversation.status, "closed"); assert.equal(conversation.unread_count_for_assignee, 0);
  assert.equal(conversation.last_message_at.toISOString(), sample.sent_at);
  assert.equal((await db.query("select count(*)::int as n from demandas where organization_id=$1", [org])).rows[0].n, 0);
  assert.equal((await db.query("select count(*)::int as n from event_log where organization_id=$1 and event_type in ('message.received','message.sent','conversation.routing_requested')", [org])).rows[0].n, 0);
  assert.equal((await db.query("select count(*)::int as n from job_queue where organization_id=$1", [org])).rows[0].n, 0);
  await db.query("savepoint tenant_check");
  await assert.rejects(call(other, [sample]), (e) => e.code === "42501");
  await db.query("rollback to savepoint tenant_check; release savepoint tenant_check");
  assert.equal((await db.query("select count(*)::int as n from messages where organization_id=$1", [other])).rows[0].n, 0);
  // An untrusted metadata marker must NOT suppress a genuine live inbound.
  await db.query("insert into messages(organization_id,conversation_id,contact_id,channel_session_id,external_id,type,direction,status,body,sent_at,metadata) values($1,$2,$3,$4,'LIVEPROOF','text','inbound','delivered','Live fixture',now(),'{\"historical_import\":true}')", [org, conversation.id, conversation.contact_id, channel]);
  assert.equal((await db.query("select count(*)::int as n from demandas where organization_id=$1", [org])).rows[0].n, 1);
  // Capture the identity BEFORE normal LGPD redaction removes it.
  await db.query("select fn_lgpd_cascade_redact_contact($1,$2,null)", [org, conversation.contact_id]);
  assert.deepEqual(await call(org, [{ ...sample, external_id: "false_551188887777@c.us_OLDERPROOF", external_key: "OLDERPROOF" }]), { imported: 0, skipped: 1 });
  assert.equal((await db.query("select count(*)::int as n from contacts where organization_id=$1 and not is_anonymized", [org])).rows[0].n, 0);
  const privileges = await db.query("select has_function_privilege('anon','public.fn_import_channel_history(uuid,uuid,jsonb)','execute') as anon,has_function_privilege('authenticated','public.fn_import_channel_history(uuid,uuid,jsonb)','execute') as authenticated,has_table_privilege('authenticated','public.contact_history_suppressions','select') as suppression_read");
  assert.deepEqual(privileges.rows[0], { anon: false, authenticated: false, suppression_read: false });
  await db.query("rollback");
  console.log("History database checks passed: isolation, deduplication, timestamps, no live dispatch, redaction and privileges. All fixtures rolled back.");
  if (process.argv.includes("--apply")) {
    await db.query("begin; set local lock_timeout='5s'; set local statement_timeout='60s'");
    await db.query(migration);
    await db.query("notify pgrst, 'reload schema'");
    await db.query("commit");
    console.log("Migration 0382 applied. No history import or channel restart was performed.");
  }
} catch (e) {
  if (connected) await db.query("rollback").catch(() => {});
  // No raw database exception, connection string or credentials in logs.
  console.error("History verification failed", { code: e.code ?? e.name, table: e.table, column: e.column, constraint: e.constraint, position: e.position,
    ...(e instanceof assert.AssertionError ? { actual: e.actual, expected: e.expected } : {}) });
  process.exitCode = 1;
} finally { await db.end().catch(() => {}); }
