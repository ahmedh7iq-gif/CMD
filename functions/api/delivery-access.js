import {json,sameOrigin} from "../_auth.js";
import {sha256,pinHash,accessTicket} from "../_delivery.js";
const fail={error:"الرابط أو الرمز غير صحيح"};
export async function onRequestPost({request,env}){
 if(!sameOrigin(request))return json({error:"طلب غير مسموح"},403);
 let b;try{b=await request.json()}catch{return json(fail,400)}
 if(typeof b?.token!=="string"||!/^[0-9a-f]{64}$/.test(b.token)||typeof b?.pin!=="string"||!/^\d{6}$/.test(b.pin))return json(fail,400);
 try{
  const digest=await sha256(b.token);
  const row=await env.DB.prepare("SELECT d.account_id,d.pin_hash,d.failed_attempts,d.lock_level,d.locked_until,d.permanently_locked,a.customer_name,a.account_email FROM account_deliveries d JOIN sold_accounts a ON a.id=d.account_id WHERE d.token_hash=?").bind(digest).first();
  if(!row)return json(fail,403);
  if(row.permanently_locked)return json({error:"تم إيقاف الوصول نهائياً. تواصل مع مالك CMD.",permanent:true},423);
  const now=Math.floor(Date.now()/1000);
  if(row.locked_until&&row.locked_until>now)return json({error:"الحساب مقفل مؤقتاً",retry_after_seconds:row.locked_until-now},423);
  const match=(await pinHash(b.pin,env))===row.pin_hash;
  if(match){
   const updated=await env.DB.prepare("UPDATE account_deliveries SET failed_attempts=0,lock_level=0,locked_until=NULL,updated_at=CURRENT_TIMESTAMP WHERE account_id=? AND failed_attempts=? AND lock_level=? AND permanently_locked=0 AND (locked_until IS NULL OR locked_until<=?)").bind(row.account_id,row.failed_attempts,row.lock_level,now).run();
   if(!updated.meta.changes)return json({error:"أعد المحاولة لاحقاً"},429);
   // Only non-secret customer data until encrypted credential delivery is implemented.
   return json({success:true,customer_name:row.customer_name,account_email:row.account_email,credentials_available:true,ticket:await accessTicket(row.account_id,env)});
  }
  // Atomic compare-and-swap protects against simultaneous incorrect requests.
  const nextAttempts=row.failed_attempts+1;
  let level=row.lock_level,until=null,permanent=0,attempts=nextAttempts;
  if(level===0&&nextAttempts>=5){level=1;until=now+3600;attempts=0}
  else if(level>0){if(level>=4){level=5;permanent=1;attempts=0}else{level++;until=now+3600*Math.pow(2,level-1);attempts=0}}
  const updated=await env.DB.prepare("UPDATE account_deliveries SET failed_attempts=?,lock_level=?,locked_until=?,permanently_locked=?,updated_at=CURRENT_TIMESTAMP WHERE account_id=? AND failed_attempts=? AND lock_level=? AND permanently_locked=0 AND (locked_until IS NULL OR locked_until<=?)").bind(attempts,level,until,permanent,row.account_id,row.failed_attempts,row.lock_level,now).run();
  if(!updated.meta.changes)return json({error:"أعد المحاولة لاحقاً"},429);
  if(permanent)return json({error:"تم إيقاف الوصول نهائياً. تواصل مع مالك CMD.",permanent:true},423);
  if(until)return json({error:"تم قفل الحساب مؤقتاً",retry_after_seconds:until-now},423);
  return json({error:"رمز غير صحيح",remaining_attempts:5-nextAttempts},403);
 }catch(e){console.error("Delivery verification failed",e);return json({error:"تعذر التحقق حالياً"},503)}
}
