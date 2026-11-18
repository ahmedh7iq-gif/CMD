import {randomHex,newPin,sha256,pinHash,encryptSecret} from "../_delivery.js";
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
 if(b.delivery){
   const {account_full_name="",phone="",birth_date="",address="",initial_password=""}=b.delivery;
   if([[account_full_name,150],[phone,40],[address,500],[initial_password,256]].some(([v,n])=>typeof v!=="string"||v.length>n) || typeof birth_date!=="string" || (birth_date&&!/^\d{4}-\d{2}-\d{2}$/.test(birth_date)))return json({error:"تحقق من بيانات التسليم"},400);
   const token=randomHex(),pin=newPin(),tokenDigest=await sha256(token),pinDigest=await pinHash(pin,env);
   for(let attempt=0;attempt<3;attempt++){
     const {id}=await env.DB.prepare("SELECT COALESCE((SELECT seq FROM sqlite_sequence WHERE name='sold_accounts'),0)+1 AS id").first();
     const profile=JSON.stringify({account_full_name,phone,birth_date,address});
     const [link,details,password]=await Promise.all([encryptSecret(token,env,id),encryptSecret(profile,env,id),initial_password?encryptSecret(initial_password,env,id):null]);
     try{
       await env.DB.batch([
         env.DB.prepare("INSERT INTO sold_accounts(id,account_type,customer_name,account_email,notes,sale_price_iqd,cost_iqd,created_by) VALUES(?,?,?,?,?,?,?,?)").bind(id,type,name.trim(),email.trim(),notes.trim(),price,cost,user.id),
         env.DB.prepare("INSERT INTO account_deliveries(account_id,token_hash,pin_hash,encrypted_token,encrypted_profile,encrypted_password) VALUES(?,?,?,?,?,?)").bind(id,tokenDigest,pinDigest,link,details,password)
       ]);
       return json({success:true,id,pin,delivery_path:"/delivery.html?t="+token},201);
     }catch(error){if(!String(error).includes("UNIQUE constraint failed: sold_accounts.id")||attempt===2)throw error}
   }
 }
 const r=await env.DB.prepare("INSERT INTO sold_accounts (account_type,customer_name,account_email,notes,sale_price_iqd,cost_iqd,created_by) VALUES (?,?,?,?,?,?,?)").bind(type,name.trim(),email.trim(),notes.trim(),price,cost,user.id).run();
 return json({success:true,id:r.meta.last_row_id},201);
 }catch(e){console.error("Account insert failed",e);return json({error:"تعذر الحفظ. تأكد من إنشاء جدول الحسابات."},503)}
}

async function readEditable(request){
 let b;try{b=await request.json()}catch{return {error:"بيانات غير صحيحة"}}
 const {account_type,customer_name,account_email}=b||{};
 const notes=b?.notes??"",price=b?.sale_price_iqd,cost=b?.cost_iqd;
 if(!["apple","google"].includes(account_type)||typeof customer_name!=="string"||!customer_name.trim()||customer_name.length>120||typeof account_email!=="string"||account_email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account_email)||typeof notes!=="string"||notes.length>1000||![price,cost].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=1000000000))return {error:"تحقق من البيانات والأسعار"};
 return {data:{account_type,customer_name:customer_name.trim(),account_email:account_email.trim(),notes:notes.trim(),sale_price_iqd:price,cost_iqd:cost}};
}
export async function onRequestPut({request,env}){
 if(!sameOrigin(request))return json({error:"طلب غير مسموح"},403);
 if(!await owner(request,env))return json({error:"غير مصرح"},403);
 const id=Number(new URL(request.url).searchParams.get("id"));
 if(!Number.isSafeInteger(id)||id<1)return json({error:"رقم الحساب غير صحيح"},400);
 const parsed=await readEditable(request);if(parsed.error)return json({error:parsed.error},400);
 const x=parsed.data;
 try{
 const r=await env.DB.prepare("UPDATE sold_accounts SET account_type=?,customer_name=?,account_email=?,notes=?,sale_price_iqd=?,cost_iqd=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(x.account_type,x.customer_name,x.account_email,x.notes,x.sale_price_iqd,x.cost_iqd,id).run();
 if(!r.meta.changes)return json({error:"الحساب غير موجود"},404);
 return json({success:true,id});
 }catch(e){console.error("Account update failed",e);return json({error:"تعذر تعديل الحساب"},503)}
}
export async function onRequestDelete({request,env}){
 if(!sameOrigin(request))return json({error:"طلب غير مسموح"},403);
 if(!await owner(request,env))return json({error:"غير مصرح"},403);
 const id=Number(new URL(request.url).searchParams.get("id"));
 if(!Number.isSafeInteger(id)||id<1)return json({error:"رقم الحساب غير صحيح"},400);
 try{
 const r=await env.DB.prepare("DELETE FROM sold_accounts WHERE id=?").bind(id).run();
 if(!r.meta.changes)return json({error:"الحساب غير موجود"},404);
 return json({success:true,id});
 }catch(e){console.error("Account delete failed",e);return json({error:"تعذر حذف الحساب"},503)}
}
