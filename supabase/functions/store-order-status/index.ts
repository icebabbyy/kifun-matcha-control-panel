import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(v=>v.toString(16).padStart(2,'0')).join('');
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'';const allowed=['https://icebabbyy.github.io','https://happihaus-matcha.vercel.app','http://127.0.0.1:5174'];
 const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':allowed.includes(origin)?origin:allowed[0],'Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type','Vary':'Origin'};
 const reply=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers});
 if(origin&&!allowed.includes(origin))return reply(403,{ok:false});
 if(req.method==='OPTIONS')return new Response('ok',{headers});if(req.method!=='POST')return reply(405,{ok:false});
 try{
 const raw=await req.text();if(raw.length>1000)return reply(413,{ok:false});const b=JSON.parse(raw);
 if(typeof b.requestId!=='string'||!/^[a-f0-9-]{36}$/.test(b.requestId)||typeof b.receiptKey!=='string'||!/^[a-f0-9]{64}$/.test(b.receiptKey))return reply(400,{ok:false});
 const {data,error}=await db.from('store_orders').select('order_number,total_cents,fulfillment,payment_status').eq('request_id',b.requestId).eq('details->>receipt_hash',await hash(b.receiptKey)).maybeSingle();
 if(error||!data)return reply(404,{ok:false});
 return reply(200,{ok:true,orderNumber:'HH-'+String(data.order_number).padStart(5,'0'),totalCents:data.total_cents,fulfillment:data.fulfillment,paymentStatus:data.payment_status});
 }catch{return reply(400,{ok:false});}
});
