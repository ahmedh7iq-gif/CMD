import {getSession,verifyPassword,json,sameOrigin} from "../_auth.js";
import {randomHex,newPin,sha256,pinHash} from "../_delivery.js";
// Rotate both QR token and PIN after owner identity verification.
// Existing receipts and previously issued access tickets become invalid.
export async function onRequestPost({request,env}){
 if(!sameOrigin(request))return json({error:"طلب غير مسموح"},403);
 const user=await getSession(request,env);
 if(user?.role!=="owner")return json({error:"للمالك فقط"},403);
 let b;try{b=await request.json()}catch{return json({error:"بيانات غير صحيحة"},400)}
 if(!Number.isSafeInteger(b?.account_id)||b.account_id<1||typeof b?.owner_password!=="string"||b.owner_password.length>128||b.confirm_revoke!==true)
  return json({error:"أكد إلغاء الوصل القديم وأدخل كلمة مرور المالك"},400);
 try{
  const u=await env.DB.prepare("SELECT password_hash FROM users WHERE id=?").bind(user.id).first();
  if(!u||!await verifyPassword(b.owner_password,u.password_hash))return json({error:"كلمة مرور المالك غير صحيحة"},403);
  const token=randomHex(),pin=newPin();
  const digest=await sha256(token),pinDigest=await pinHash(pin,env);
  const updated=await env.DB.prepare("UPDATE account_deliveries SET token_hash=?,pin_hash=?,failed_attempts=0,lock_level=0,locked_until=NULL,permanently_locked=0,updated_at=CURRENT_TIMESTAMP WHERE account_id=?")
    .bind(digest,pinDigest,b.account_id).run();
  if(!updated.meta.changes)return json({error:"التسليم غير موجود"},404);
  await env.DB.prepare("INSERT INTO delivery_audit(account_id,action,actor) VALUES(?,?,?)").bind(b.account_id,"qr_reissued","owner").run();
  return json({success:true,account_id:b.account_id,delivery_path:"/delivery.html?t="+token,pin,notice:"تم إبطال QR القديم وPIN القديم. اطبع الوصل الجديد وسلّم PIN بشكل منفصل."});
 }catch(e){console.error("Delivery rotation failed",e);return json({error:"تعذر إعادة إصدار الوصل"},503)}
}
