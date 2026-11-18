// Run: node --test tests/credential-policy.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const src=await readFile(new URL("../functions/_credential-policy.js",import.meta.url),"utf8");
const {mayUpdateCredential}=await import("data:text/javascript;base64,"+Buffer.from(src).toString("base64"));
test("only CMD owner may update stored credentials",()=>{
 assert.equal(mayUpdateCredential("owner"),true);
 for(const role of ["customer","guest",null,undefined,"admin",""])assert.equal(mayUpdateCredential(role),false);
});
