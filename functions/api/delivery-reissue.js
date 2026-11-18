import {getSession,verifyPassword,json,sameOrigin} from "../_auth.js";
import {decryptSecret,sha256} from "../_delivery.js";
// Legacy route retained for compatibility: retrieves the SAME QR, never rotates it.
export async function onRequestPost({request,env}){
 if(!sameOrigin(request))return json({error:"طلب غير مسموح"},403);
 const user=await getSession(request,env);
 if(user?.role!=="owner")return json({error:"للمالك فقط"},403);
 let b;try{b=await request.json()}catch{return json({error:"بيانات غير صحيحة"},400)}
 if(!Number.isSafeInteger(b?.account_id)||b.account_id<1||typeof b?.owner_password!=="string"||b.owner_password.length>128)
  return json({error:"أدخل رقم العملية وكلمة مرور المالك"},400);
 try{
  const u=await env.DB.prepare("SELECT password_hash FROM users WHERE id=?").bind(user.id).first();
  if(!u||!await verifyPassword(b.owner_password,u.password_hash))return json({error:"كلمة مرور المالك غير صحيحة"},403);
  const row=await env.DB.prepare("SELECT encrypted_token,token_hash FROM account_deliveries WHERE account_id=?").bind(b.account_id).first();
  if(!row)return json({error:"التسليم غير موجود"},404);
  if(!row.encrypted_token)return json({error:"هذا التسليم قديم ولا تتوفر نسخة قابلة للاسترجاع من QR؛ تواصل مع مسؤول النظام"},409);
  const token=await decryptSecret(row.encrypted_token,env,b.account_id);
  if(!token||await sha256(token)!==row.token_hash)return json({error:"فشل التحقق من رابط التسليم"},503);
  await env.DB.prepare("INSERT INTO delivery_audit(account_id,action,actor) VALUES(?,?,?)").bind(b.account_id,"qr_viewed_by_owner","owner").run();
  return json({success:true,account_id:b.account_id,delivery_path:"/delivery.html?t="+token,notice:"هذا هو QR الأصلي نفسه. لم يتغير رمز PIN أو كلمة المرور."});
 }catch(e){console.error("QR retrieval failed",e);return json({error:"تعذر استرجاع QR"},503)}
}
