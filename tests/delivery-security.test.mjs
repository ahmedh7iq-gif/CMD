// Run with Node 22+: node --test tests/delivery-security.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {webcrypto} from "node:crypto";
globalThis.crypto ??= webcrypto;
const source=await readFile(new URL("../functions/_delivery.js",import.meta.url),"utf8");
const d=await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));
const env={OWNER_SETUP_SECRET:"test-only-hmac-secret-do-not-use-in-production",CMD_CREDENTIAL_KEY:"a1".repeat(32)};
const row={pin_hash:await d.pinHash("123456",env)};
env.DB={prepare(sql){assert.match(sql,/SELECT pin_hash/);return {bind(id){assert.equal(id,42);return {async first(){return row}}}}}};
test("PIN generation is six digits",()=>{for(let i=0;i<100;i++)assert.match(d.newPin(),/^\d{6}$/)});
test("PIN HMAC is stable but never plaintext",async()=>{
 const a=await d.pinHash("123456",env);
 assert.equal(a,await d.pinHash("123456",env));assert.notEqual(a,await d.pinHash("123457",env));
 assert.match(a,/^[0-9a-f]{64}$/);assert.ok(!a.includes("123456"));
});
test("AES-GCM roundtrip, random IV and account binding",async()=>{
 const first=await d.encryptSecret("private password",env,42);
 const second=await d.encryptSecret("private password",env,42);
 assert.notEqual(first,second);
 assert.equal(await d.decryptSecret(first,env,42),"private password");
 await assert.rejects(()=>d.decryptSecret(first,env,43));
 const corrupted=first.slice(0,-2)+(first.endsWith("00")?"01":"00");
 await assert.rejects(()=>d.decryptSecret(corrupted,env,42));
});
test("wrong or missing encryption key fails closed",async()=>{
 await assert.rejects(()=>d.encryptSecret("secret",{CMD_CREDENTIAL_KEY:"bad"},42));
 const ciphertext=await d.encryptSecret("secret",env,42);
 await assert.rejects(()=>d.decryptSecret(ciphertext,{CMD_CREDENTIAL_KEY:""},42));
});
test("ticket is scoped, expires, detects tampering and PIN reset",async()=>{
 const ticket=await d.accessTicket(42,env,"read");
 assert.equal(await d.validateTicket(ticket,env,"read"),42);
 assert.equal(await d.validateTicket(ticket,env,"update"),null);
 assert.equal(await d.validateTicket(ticket.slice(0,-1)+(ticket.endsWith("0")?"1":"0"),env),null);
 const old=row.pin_hash;row.pin_hash=await d.pinHash("654321",env);
 assert.equal(await d.validateTicket(ticket,env),null);row.pin_hash=old;
 const update=await d.accessTicket(42,env,"update");
 assert.equal(await d.validateTicket(update,env,"update"),42);
 const realNow=Date.now;
 try{Date.now=()=>realNow()+601000;assert.equal(await d.validateTicket(update,env,"update"),null)}
 finally{Date.now=realNow}
});
test("customer token hash is fixed length",async()=>{
 assert.match(d.randomHex(),/^[0-9a-f]{64}$/);
 assert.match(await d.sha256("example"),/^[0-9a-f]{64}$/);
});
