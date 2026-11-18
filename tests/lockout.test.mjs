// Run: node --test tests/lockout.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const source=await readFile(new URL("../functions/_lockout.js",import.meta.url),"utf8");
const {nextPinFailure}=await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));
test("first five wrong PINs lock for one hour",()=>{
 for(let n=0;n<4;n++){const x=nextPinFailure(n,0,1000);assert.equal(x.level,0);assert.equal(x.remaining,4-n)}
 assert.deepEqual(nextPinFailure(4,0,1000),{attempts:0,level:1,until:4600,permanent:0,remaining:0});
});
test("one failed attempt after each lock doubles duration, then permanent",()=>{
 for(const [level,hours] of [[1,2],[2,4],[3,8],[4,16]]){const x=nextPinFailure(0,level,1000);assert.equal(x.until,1000+hours*3600);assert.equal(x.level,level+1)}
 const x=nextPinFailure(0,5,1000);assert.equal(x.permanent,1);assert.equal(x.level,6);assert.equal(x.until,null);
});
