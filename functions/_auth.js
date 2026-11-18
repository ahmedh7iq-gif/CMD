const enc=new TextEncoder();
const hexToBytes=s=>new Uint8Array(s.match(/../g).map(x=>parseInt(x,16)));
const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const unb64=s=>Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0));
export async function verifyPassword(password,stored){
 const parts=stored.split("$");
 if(parts.length!==4||parts[0]!=="pbkdf2_sha256")return false;
 const iterations=Number(parts[1]);
 if(!Number.isInteger(iterations)||iterations<10000||iterations>1000000||!/^[0-9a-f]{32}$/i.test(parts[2])||!/^[0-9a-f]{64}$/i.test(parts[3]))return false;
 const key=await crypto.subtle.importKey("raw",enc.encode(password),"PBKDF2",false,["deriveBits"]);
 const hash=new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2",salt:hexToBytes(parts[2]),iterations,hash:"SHA-256"},key,256));
 const expected=hexToBytes(parts[3]);let diff=0;for(let i=0;i<hash.length;i++)diff|=hash[i]^expected[i];return diff===0;
}
async function signer(env){if(!env.OWNER_SETUP_SECRET)throw Error("Missing signing secret");return crypto.subtle.importKey("raw",enc.encode("CMD-session-v1:"+env.OWNER_SETUP_SECRET),{name:"HMAC",hash:"SHA-256"},false,["sign","verify"]);}
export async function makeSession(env,user){
 const payload=b64(enc.encode(JSON.stringify({id:user.id,exp:Math.floor(Date.now()/1000)+28800})));
 const sig=b64(await crypto.subtle.sign("HMAC",await signer(env),enc.encode(payload)));
 return payload+"."+sig;
}
export async function getSession(request,env){
 const cookie=request.headers.get("Cookie")||"";
 const token=cookie.split(";").map(x=>x.trim()).find(x=>x.startsWith("cmd_session="))?.slice(12);
 if(!token||token.length>2048)return null;
 const [payload,sig,...extra]=token.split(".");if(!payload||!sig||extra.length)return null;
 try{
 const valid=await crypto.subtle.verify("HMAC",await signer(env),unb64(sig),enc.encode(payload));if(!valid)return null;
 const data=JSON.parse(new TextDecoder().decode(unb64(payload)));
 if(!Number.isInteger(data.id)||!Number.isInteger(data.exp)||data.exp<=Date.now()/1000)return null;
 return await env.DB.prepare("SELECT id,full_name,username,role,is_active FROM users WHERE id=? AND is_active=1").bind(data.id).first();
 }catch{return null;}
}
export const cookieOptions="Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800";
export const json=(data,status=200,headers={})=>Response.json(data,{status,headers:{"Cache-Control":"no-store",...headers}});
export function sameOrigin(request){try{return new URL(request.headers.get("Origin")).origin===new URL(request.url).origin}catch{return false}}
