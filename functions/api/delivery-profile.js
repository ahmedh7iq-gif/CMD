import {getSession,verifyPassword,json,sameOrigin} from "../_auth.js";
import {pinHash,validateTicket,encryptSecret,decryptSecret} from "../_delivery.js";
export async function onRequestPost({request,env}){
 if(!sameOrigin(request))return json({error:"طلب غير مسموح"},403);
 let b;try{b=await request.json()}catch{return json({error:"بيانات غير صحيحة"},400)}
 if(!["read","update"].includes(b?.mode))return json({error:"عملية غير صحيحة"},400);
 let id=null,actor="customer";
 if(b.owner===true){
  const u=await getSession(request,env);if(u?.role!=="owner"||typeof b.owner_password!=="string")return json({error:"غير مصرح"},403);
  const row=await env.DB.prepare("SELECT password_hash FROM users WHERE id=?").bind(u.id).first();
  if(!row||!await verifyPassword(b.owner_password,row.password_hash))return json({error:"فشل التحقق من المالك"},403);
  id=b.account_id;actor="owner";
 }else id=await validateTicket(b.ticket,env,b.mode==="update"?"update":"read");
 if(!Number.isSafeInteger(id)||id<1)return json({error:"انتهت صلاحية التحقق"},403);
 try{
  const row=await env.DB.prepare("SELECT encrypted_profile,permanently_locked,locked_until FROM account_deliveries WHERE account_id=?").bind(id).first();
  if(!row)return json({error:"الحساب غير موجود"},404);
  if(actor==="customer"&&(row.permanently_locked||(row.locked_until&&row.locked_until>Date.now()/1000)))return json({error:"الحساب مقفل"},423);
  const profile=row.encrypted_profile?JSON.parse(await decryptSecret(row.encrypted_profile,env,id)):{};
  if(b.mode==="read"){return json({account_full_name:profile.account_full_name||"",birth_date:profile.birth_date||"",phone:profile.phone||"",address:profile.address||""});}

  const {account_full_name,birth_date,address}=b;
  if(typeof account_full_name!=="string"||account_full_name.length>150||typeof birth_date!=="string"||birth_date.length>20||typeof address!=="string"||address.length>500||birth_date&&!/^\d{4}-\d{2}-\d{2}$/.test(birth_date))return json({error:"تحقق من الحقول"},400);
  const encrypted=await encryptSecret(JSON.stringify({account_full_name:account_full_name.trim(),birth_date,address:address.trim()}),env,id);
  await env.DB.prepare("UPDATE account_deliveries SET encrypted_profile=?,account_full_name=NULL,birth_date=NULL,address=NULL,updated_at=CURRENT_TIMESTAMP WHERE account_id=?").bind(encrypted,id).run();
  await env.DB.prepare("INSERT INTO delivery_audit(account_id,action,actor) VALUES(?,?,?)").bind(id,"profile_update","owner").run();
  return json({success:true});
 }catch(e){console.error("Profile failed",e);return json({error:"تعذر الوصول لبيانات الحساب"},503)}
}
