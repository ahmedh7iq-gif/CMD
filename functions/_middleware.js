import {getSession,json} from "./_auth.js";
export async function onRequest(context){
 const {request,env}=context,url=new URL(request.url);
 if(!url.pathname.startsWith("/api/"))return context.next();
 if(url.pathname==="/api/setup-owner"&&request.method==="POST")return context.next();
 if(url.pathname==="/api/login"&&request.method==="POST")return context.next();
 if(url.pathname==="/api/logout"&&request.method==="POST")return context.next();
 if(url.pathname==="/api/me"&&request.method==="GET")return context.next();
 const user=await getSession(request,env);if(!user)return json({error:"Authentication required"},401);
 context.data.user=user;return context.next();
}
