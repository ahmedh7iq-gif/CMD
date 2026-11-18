import {getSession,verifyPassword,json,sameOrigin} from "../_auth.js";
import {newPin,pinHash} from "../_delivery.js";
export async function onRequestPost({request,env}){
 if(!sameOrigin(request))return json({error:"طلب غير مسموح"},403);
 const user=await getSession(request,env);if(user?.role!=="owner")return json({error:"للمالك فقط"},403);
 let b;try{b=await request.json()}catch{return json({error:"بيانات غير صحيحة"},400)}
 if(!Number.isSafeInteger(b?.account_id)||b.account_id<1||typeof b?.owner_password!=="string"||b.owner_password.length>128||b.confirm_identity!==true)return json({error:"يجب التحقق من هوية الزبون وتأكيد كلمة مرور المالك"},400);
 const u=await env.DB.prepare("SELECT password_hash FROM users WHERE id=?").bind(user.id).first();
 if(!u||!await verifyPassword(b.owner_password,u.password_hash))return json({error:"كلمة مرور المالك غير صحيحة"},403);
 try{
  const pin=newPin(),hash=await pinHash(pin,env);
  const r=await env.DB.prepare("UPDATE account_deliveries SET pin_hash=?,failed_attempts=0,lock_level=0,locked_until=NULL,permanently_locked=0,updated_at=CURRENT_TIMESTAMP WHERE account_id=?").bind(hash,b.account_id).run();
  if(!r.meta.changes)return json({error:"تسليم الحساب غير موجود"},404);
  await env.DB.prepare("INSERT INTO delivery_audit(account_id,action,actor) VALUES(?,?,?)").bind(b.account_id,"owner_recovery","owner").run();
  return json({success:true,pin,notice:"سلّم رمز PIN الجديد للزبون بشكل منفصل. الرمز القديم أصبح غير صالح."});
 }catch(e){console.error("Recovery failed",e);return json({error:"تعذر استعادة الوصول"},503)}
}
