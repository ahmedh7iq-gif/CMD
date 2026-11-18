const enc=new TextEncoder();
export const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
export function randomHex(bytes=32){const b=new Uint8Array(bytes);crypto.getRandomValues(b);return hex(b)}
export function newPin(){const b=new Uint32Array(1);const limit=Math.floor(4294967296/1000000)*1000000;do{crypto.getRandomValues(b)}while(b[0]>=limit);return String(b[0]%1000000).padStart(6,"0")}
export async function sha256(value){return hex(new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(value))))}
export async function pinHash(pin,env){if(!env.OWNER_SETUP_SECRET)throw Error("Missing server secret");const key=await crypto.subtle.importKey("raw",enc.encode(env.OWNER_SETUP_SECRET),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return hex(new Uint8Array(await crypto.subtle.sign("HMAC",key,enc.encode("CMD-delivery-pin-v1:"+pin))))}
export function secureHeaders(){return {"Cache-Control":"no-store","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff"}}
