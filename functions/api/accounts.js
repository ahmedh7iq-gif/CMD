import {getSession,json,sameOrigin} from "../_auth.js";
async function owner(request,env){const user=await getSession(request,env);return user?.role==="owner"?user:null}
export async function onRequestGet({request,env}){
 if(!await owner(request,env))return json({error:"غير مصرح"},403);
 try{
 const rows=await env.DB.prepare("SELECT id,account_type,customer_name,account_email,notes,sale_price_iqd,cost_iqd,created_at FROM sold_accounts ORDER BY id DESC LIMIT 200").all();
 return json({accounts:rows.results||[]});
 }catch(e){console.error("Accounts list failed",e);return json({error:"قاعدة الحسابات غير جاهزة. نفّذ ملف SQL أولاً."},503)}
}
export async function onRequestPost({request,env}){
 if(!sameOrigin(request))return json({error:"طلب غير مسموح"},403);
 const user=await owner(request,env);if(!user)return json({error:"غير مصرح"},403);
 let b;try{b=await request.json()}catch{return json({error:"بيانات غير صحيحة"},400)}
 const type=b?.account_type,name=b?.customer_name,email=b?.account_email,notes=b?.notes??"",price=b?.sale_price_iqd,cost=b?.cost_iqd;
 if(!["apple","google"].includes(type)||typeof name!=="string"||!name.trim()||name.length>120||typeof email!=="string"||email.length>254||!/^\S+@\S+\.\S+$/.test(email)||typeof notes!=="string"||notes.length>1000||![price,cost].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=1000000000))return json({error:"تحقق من البيانات والأسعار"},400);
 try{
 const r=await env.DB.prepare("INSERT INTO sold_accounts (account_type,customer_name,account_email,notes,sale_price_iqd,cost_iqd,created_by) VALUES (?,?,?,?,?,?,?)").bind(type,name.trim(),email.trim(),notes.trim(),price,cost,user.id).run();
 return json({success:true,id:r.meta.last_row_id},201);
 }catch(e){console.error("Account insert failed",e);return json({error:"تعذر الحفظ. تأكد من إنشاء جدول الحسابات."},503)}
}
