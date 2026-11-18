// CMD premium receipt. Drawn with Canvas so PNG download and print use the same layout.
// The only QR payload is the opaque delivery URL. No PIN, password or cost appears.
(function(){
"use strict";
const W=1080,H=1480;
function round(ctx,x,y,w,h,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
function txt(ctx,text,x,y,size,color,weight="400",align="right"){
 ctx.font=weight+" "+size+"px system-ui, Arial, sans-serif";ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline="middle";ctx.fillText(String(text),x,y)
}
function split(ctx,text,maxWidth){
 const words=String(text).split(/\s+/);const lines=[];let line="";
 for(const word of words){const next=line?line+" "+word:word;if(ctx.measureText(next).width>maxWidth&&line){lines.push(line);line=word}else line=next}
 if(line)lines.push(line);return lines;
}
async function qrCanvas(url){
 const el=document.createElement("div");el.style.cssText="position:fixed;left:-9999px;top:0;background:white";document.body.append(el);
 try{
  new QRCode(el,{text:url,width:260,height:260,correctLevel:QRCode.CorrectLevel.M});
  const canvas=el.querySelector("canvas");if(canvas&&canvas.width)return canvas;
  const img=el.querySelector("img");if(img){await new Promise((ok,bad)=>{if(img.complete&&img.naturalWidth)return ok();img.onload=ok;img.onerror=bad});return img}
  throw Error("تعذر إنشاء QR");
 }finally{el.remove()}
}
async function buildReceipt({name,email,price,url}){
 if(!/^https:\/\//.test(url))throw Error("رابط التسليم غير آمن");
 const c=document.createElement("canvas");c.width=W;c.height=H;const ctx=c.getContext("2d");
 ctx.fillStyle="#f0f4fa";ctx.fillRect(0,0,W,H);
 round(ctx,42,42,996,1396,32,"#ffffff");
 // Deep navy branded header
 const grad=ctx.createLinearGradient(42,42,1038,420);grad.addColorStop(0,"#0c1b34");grad.addColorStop(1,"#254879");
 round(ctx,42,42,996,365,32,grad);
 ctx.fillStyle="#fff";ctx.fillRect(42,300,996,107);
 round(ctx,90,98,155,54,15,"#ffffff22");
 txt(ctx,"CMD",167,125,40,"#ffffff","900","center");
 txt(ctx,"ACCOUNT DELIVERY",95,182,17,"#d2e1f6","600","left");
 txt(ctx,"وصل بيع",960,136,53,"#ffffff","800");
 txt(ctx,"نسختك الخاصة من CMD",960,204,22,"#d9e6fa");
 round(ctx,88,322,904,113,20,"#f1f6ff");
 txt(ctx,"إثبات عملية البيع",952,362,29,"#172e50","800");
 txt(ctx,"احتفظ بهذا الوصل للرجوع إلى بيانات حسابك",952,403,19,"#60728d");
 // Customer and email, exactly two information rows
 txt(ctx,"اسم الزبون",954,505,23,"#65758b","600");
 ctx.save();ctx.direction="rtl";ctx.font="700 35px system-ui, Arial, sans-serif";
 const lines=split(ctx,name,850);lines.slice(0,2).forEach((l,i)=>txt(ctx,l,954,554+i*42,35,"#172e50","700"));ctx.restore();
 ctx.fillStyle="#e5eaf2";ctx.fillRect(94,646,892,2);
 txt(ctx,"البريد الإلكتروني",954,704,23,"#65758b","600");
 ctx.save();ctx.direction="ltr";ctx.font="600 30px system-ui, Arial, sans-serif";
 const emailLines=split(ctx,email,860);emailLines.slice(0,2).forEach((l,i)=>txt(ctx,l,954,756+i*36,30,"#172e50","600"));ctx.restore();
 // QR delivery panel
 round(ctx,88,827,904,338,24,"#f3f7fd");
 const qr=await qrCanvas(url);
 ctx.fillStyle="#fff";ctx.fillRect(120,857,280,280);ctx.drawImage(qr,130,867,260,260);
 txt(ctx,"رمز تسليم الحساب",948,900,32,"#172e50","800");
 txt(ctx,"امسح الرمز بالكاميرا",948,964,24,"#455c7c","600");
 txt(ctx,"لفتح صفحة حسابك المحمية",948,1008,22,"#455c7c");
 txt(ctx,"رمز PIN يُسلَّم لك بشكل منفصل",948,1075,20,"#8a6070","600");
 // Price summary
 round(ctx,88,1202,904,120,22,"#152c4c");
 txt(ctx,"المبلغ المدفوع",946,1243,25,"#d6e3f5","600");
 txt(ctx,price,946,1290,38,"#ffffff","800");
 ctx.fillStyle="#e5eaf2";ctx.fillRect(90,1363,900,2);
 txt(ctx,"CMD  •  شكراً لثقتك بنا",540,1395,20,"#64748b","600","center");
 return c;
}
async function savePng(canvas,name){
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/png"));
 if(!blob)throw Error("تعذر حفظ الصورة");
 const file=new File([blob],name,{type:"image/png"});
 // iOS Share Sheet lets users choose Save Image; fallback to browser download.
 if(navigator.canShare&&navigator.canShare({files:[file]})){
  try{await navigator.share({files:[file],title:"وصل CMD"});return}catch(e){if(e.name==="AbortError")return}
 }
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
window.CMDReceipt={buildReceipt,savePng};
})();
