import {verifyPassword,makeSession,cookieOptions,json,sameOrigin} from "../_auth.js";
export async function onRequestPost({request,env}){
 if(!sameOrigin(request))return json({error:"طلب غير مسموح"},403);
 if(!env.DB||!env.OWNER_SETUP_SECRET)return json({error:"إعداد الخادم غير مكتمل"},503);
 let body;try{body=await request.json()}catch{return json({error:"بيانات غير صحيحة"},400)}
 const username=body?.username,password=body?.password;
 if(typeof username!=="string"||username.length>100||typeof password!=="string"||password.length>128)return json({error:"بيانات الدخول غير صحيحة"},401);
 try{
 const user=await env.DB.prepare("SELECT id,full_name,username,role,is_active,password_hash FROM users WHERE username=?").bind(username).first();
 if(!user||!user.is_active||!(await verifyPassword(password,user.password_hash)))return json({error:"اسم المستخدم أو كلمة المرور غير صحيحة"},401);
 const token=await makeSession(env,user);
 return json({success:true},200,{"Set-Cookie":"cmd_session="+token+"; "+cookieOptions}); 
 }catch(e){console.error("Login failed",e);return json({error:"تعذر تسجيل الدخول"},500)}
}
