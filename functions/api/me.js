import {getSession,json} from "../_auth.js";
export async function onRequestGet({request,env}){const user=await getSession(request,env);return user?json({user}):json({error:"غير مسجل الدخول"},401)}
