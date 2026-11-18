import {getSession,verifyPassword,json,sameOrigin} from "../_auth.js";
import {encryptSecret,decryptSecret,validateTicket} from "../_delivery.js";
import {mayUpdateCredential} from "../_credential-policy.js";
export async function onRequestPost({request,env}){
 if(!sameOrigin(request))return json({error:"طلب غير مسموح"},403);
 let b;try{b=await request.json()}catch{return json({error:"بيانات غير صحيحة"},400)}
 const mode=b?.mode;
 if(!["read","update"].includes(mode))return json({error:"عملية غير صحيحة"},400);
 let id=null,actor="customer";
 const user=await getSession(request,env);
 if(b?.owner===true){
  if(user?.role!=="owner"||typeof b.owner_password!=="string")return json({error:"ممنوع"},403);
  const u=await env.DB.prepare("SELECT password_hash FROM users WHERE id=?").bind(user.id).first();
  if(!u||!await verifyPassword(b.owner_password,u.password_hash))return json({error:"إعادة التحقق فشلت"},403);
  id=b.account_id;actor="owner";
 }else{
  id=await validateTicket(b?.ticket,env,mode==="update"?"update":"read");
 }
 if(!Number.isSafeInteger(id)||id<1)return json({error:"انتهت جلسة التحقق، أعد إدخال PIN"},403);
 if(mode==="update"&&!mayUpdateCredential(actor))return json({error:"تحديث كلمة المرور المحفوظة يتطلب موافقة مالك CMD. تواصل مع الإدارة."},403);
 if(mode==="update"&&(typeof b.password!=="string"||b.password.length<1||b.password.length>256))return json({error:"كلمة المرور غير صالحة"},400);
 try{
  const row=await env.DB.prepare("SELECT encrypted_password,permanently_locked,locked_until FROM account_deliveries WHERE account_id=?").bind(id).first();
  if(!row)return json({error:"الحساب غير موجود"},404);
  if(actor==="customer"&&(row.permanently_locked||(row.locked_until&&row.locked_until>Date.now()/1000)))return json({error:"الوصول مقفل"},423);
  if(mode==="read"){
   const password=await decryptSecret(row.encrypted_password,env,id);
   await env.DB.prepare("INSERT INTO delivery_audit(account_id,action,actor) VALUES(?,?,?)").bind(id,"password_view",actor).run();
   return json({password});
  }
  const encrypted=await encryptSecret(b.password,env,id);
  await env.DB.prepare("UPDATE account_deliveries SET encrypted_password=?,updated_at=CURRENT_TIMESTAMP WHERE account_id=?").bind(encrypted,id).run();
  await env.DB.prepare("INSERT INTO delivery_audit(account_id,action,actor) VALUES(?,?,?)").bind(id,"password_update",actor).run();
  return json({success:true,notice:"تم تحديث كلمة المرور المحفوظة في CMD فقط. يجب تغييرها لدى Apple أو Google بشكل منفصل."});
 }catch(e){console.error("Credential operation failed",e);return json({error:"تعذر تنفيذ العملية، تحقق من إعداد التشفير وترحيل قاعدة البيانات"},503)}
}
