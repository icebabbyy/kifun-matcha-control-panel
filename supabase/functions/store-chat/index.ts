import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(v=>v.toString(16).padStart(2,'0')).join('');
const uuid=(s:unknown)=>typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'';const allowed=['https://icebabbyy.github.io','https://happihaus-matcha.vercel.app','http://127.0.0.1:5174','http://localhost:5173'];
 const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':allowed.includes(origin)?origin:allowed[0],'Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type','Vary':'Origin'};
 const reply=(status:number,value:unknown)=>new Response(JSON.stringify(value),{status,headers});
 if(origin&&!allowed.includes(origin))return reply(403,{ok:false});
 if(req.method==='OPTIONS')return new Response('ok',{headers});if(req.method!=='POST')return reply(405,{ok:false});
 try{
 const raw=await req.text();if(raw.length>4000)return reply(413,{ok:false,error:'ข้อความยาวเกินไป'});
 const b=JSON.parse(raw);if(!uuid(b.conversationId)||typeof b.clientKey!=='string'||!/^[a-f0-9]{64}$/.test(b.clientKey))return reply(400,{ok:false,error:'ข้อมูลแชตไม่ถูกต้อง'});
 const clientHash=await hash(b.clientKey);
 if(b.action==='poll'){
 const {data,error}=await db.from('store_questions').select('request_id,question,reply,created_at,replied_at').eq('conversation_id',b.conversationId).eq('client_hash',clientHash).order('created_at',{ascending:true}).limit(50);
 if(error)throw error;return reply(200,{ok:true,messages:data});
 }
 if(b.action!=='send'||!uuid(b.requestId)||typeof b.name!=='string'||b.name.length>80||typeof b.question!=='string'||!b.question.trim()||b.question.length>1000)return reply(400,{ok:false,error:'พิมพ์คำถามไม่เกิน 1,000 ตัวอักษร'});
 const {data:config}=await db.rpc('store_telegram_config');if(!config?.store_telegram_chat||!config?.store_telegram_token)return reply(503,{ok:false,error:'ร้านยังไม่เปิดรับข้อความ'});
 const ip=(req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim();
 const {data:saved,error}=await db.rpc('reserve_store_question',{p_request:b.requestId,p_conversation:b.conversationId,p_client:clientHash,p_ip:await hash(ip),p_name:b.name.trim(),p_question:b.question.trim()});
 if(error)return reply(429,{ok:false,error:'ส่งข้อความถี่เกินไป กรุณารอสักครู่'});
 if(saved.telegram_message_id)return reply(200,{ok:true});
 const sent=await fetch(`https://api.telegram.org/bot${config.store_telegram_token}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:config.store_telegram_chat,text:`💬 คำถามจากหน้าเว็บ · ห้อง ${b.conversationId.slice(0,8)}\nชื่อ: ${b.name.trim()||'ลูกค้า'}\n${b.question.trim()}\n\nตอบลูกค้าโดย Reply ข้อความนี้ใน Telegram คำตอบจะกลับไปแสดงบนหน้าเว็บลูกค้า`,reply_markup:{force_reply:true,selective:true}}),signal:AbortSignal.timeout(12000)});
 const result=await sent.json();if(!result.ok)return reply(502,{ok:false,error:'ส่งถึงร้านยังไม่สำเร็จ กรุณาลองอีกครั้ง'});
 const {error:markError}=await db.from('store_questions').update({telegram_message_id:result.result.message_id}).eq('request_id',b.requestId);if(markError)throw markError;
 return reply(200,{ok:true});
 }catch{return reply(500,{ok:false,error:'ส่งข้อความยังไม่สำเร็จ กรุณาลองอีกครั้ง'});}
});
