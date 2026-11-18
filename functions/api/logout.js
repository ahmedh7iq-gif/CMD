import {json,sameOrigin} from "../_auth.js";
export async function onRequestPost({request}){if(!sameOrigin(request))return json({error:"طلب غير مسموح"},403);return json({success:true},200,{"Set-Cookie":"cmd_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0"})}
