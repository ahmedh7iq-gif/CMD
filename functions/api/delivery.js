import {getSession,json,sameOrigin} from "../_auth.js";
import {randomHex,newPin,sha256,pinHash,encryptSecret} from "../_delivery.js";
export async function onRequestPost({request,env}){
 if(!sameOrigin(request))return json({error:"طلب غير مسموح"},403);
 const user=await getSession(request,env);if(user?.role!=="owner")return json({error:"للمالك فقط"},403);
 let body;try{body=await request.json()}catch{return json({error:"بيانات غير صحيحة"},400)}
 const id=body?.account_id;
 if(!Number.isSafeInteger(id)||id<1)return json({error:"رقم العملية غير صحيح"},400);
 try{
  const account=await env.DB.prepare("SELECT id FROM sold_accounts WHERE id=?").bind(id).first();
  if(!account)return json({error:"عملية البيع غير موجودة"},404);
  const existing=await env.DB.prepare("SELECT account_id FROM account_deliveries WHERE account_id=?").bind(id).first();
  if(existing)return json({error:"تم تجهيز تسليم لهذه العملية مسبقاً. لا يمكن إعادة إصدار الرمز من هذه الواجهة."},409);
  const token=randomHex(),pin=newPin(),tokenDigest=await sha256(token),pinDigest=await pinHash(pin,env),encryptedToken=await encryptSecret(token,env,id);
  await env.DB.prepare("INSERT INTO account_deliveries(account_id,token_hash,pin_hash,encrypted_token) VALUES(?,?,?,?)").bind(id,tokenDigest,pinDigest,encryptedToken).run();
  return json({success:true,account_id:id,delivery_path:"/delivery.html?t="+token,pin,notice:"احفظ رمز PIN وسلّمه للزبون بشكل منفصل؛ لن يظهر مرة ثانية."},201);
 }catch(e){console.error("Delivery issue failed",e);return json({error:"تعذر تجهيز التسليم. تأكد من تنفيذ ترحيل قاعدة البيانات."},503)}
}
