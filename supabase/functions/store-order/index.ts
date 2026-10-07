import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {priceOrder,baht} from './order-pricing.js';
import {orderButtons} from './order-status.js';
const origins=new Set(['https://icebabbyy.github.io','http://localhost:5173','http://127.0.0.1:5173','http://127.0.0.1:5174']);
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(v=>v.toString(16).padStart(2,'0')).join('');
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'';
 const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':origins.has(origin)?origin:'https://icebabbyy.github.io','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Vary':'Origin'};
 const reply=(status:number,value:unknown)=>new Response(JSON.stringify(value),{status,headers});
 if(origin&&!origins.has(origin))return reply(403,{ok:false,error:'Origin rejected'});
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='POST')return reply(405,{ok:false,error:'POST required'});
 let requestId:string|undefined;
 try{
  const raw=await req.text();if(raw.length>16000) return reply(413,{ok:false,error:'รายการยาวเกินไป'});
  const body=JSON.parse(raw);requestId=body.requestId;
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId||''))throw new Error('ข้อมูลออเดอร์ไม่ถูกต้อง');
  const customer=body.customer;
  if(!customer||typeof customer.name!=='string'||!customer.name.trim()||customer.name.length>80||typeof customer.phone!=='string'||customer.phone.length>20||typeof customer.note!=='string'||customer.note.length>500)throw new Error('กรุณาระบุข้อมูลผู้รับให้ถูกต้อง');
  const {data:catalogRow,error:catalogError}=await db.from('store_catalog').select('payload').eq('id',1).single();if(catalogError)throw new Error('โหลดเมนูไม่สำเร็จ');
  const catalog=catalogRow.payload;
  if(body.version!==catalog.version)throw new Error('เมนูมีการปรับราคา กรุณารีเฟรชหน้าแล้วสั่งใหม่');
  const order=priceOrder(catalog,body.cart);
  if(body.expectedTotal!==order.totalCents)throw new Error('ยอดเงินเปลี่ยน กรุณารีเฟรชหน้าแล้วสั่งใหม่');
  const {data:config,error:configError}=await db.rpc('store_telegram_config');
  if(configError||!config?.store_telegram_token||!config?.store_telegram_chat) return reply(503,{ok:false,error:'ร้านกำลังตั้งค่ารับออเดอร์ กรุณาสั่งที่หน้าร้านก่อน'});
  if(body.receiptKey!==undefined && (typeof body.receiptKey!=='string'||!/^[a-f0-9]{64}$/.test(body.receiptKey)))throw new Error('ข้อมูลติดตามออเดอร์ไม่ถูกต้อง');
  const details={customer:{name:customer.name.trim(),phone:customer.phone.trim(),note:customer.note.trim()},lines:order.lines,version:catalog.version,...(body.receiptKey?{receipt_hash:await hash(body.receiptKey)}:{})};
  const ip=(req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim();
  const {data:saved,error:saveError}=await db.rpc('claim_store_order',{p_request:requestId,p_ip:await hash(ip),p_hash:await hash(JSON.stringify(details)),p_details:details,p_total:order.totalCents});
  if(saveError)throw new Error(saveError.message.includes('RATE_LIMIT')?'สั่งถี่เกินไป กรุณารอสักครู่':saveError.message.includes('ORDER_PROCESSING')?'ออเดอร์กำลังส่ง กรุณารอสักครู่แล้วลองใหม่':'บันทึกออเดอร์ไม่สำเร็จ');
  const orderNumber='HH-'+String(saved.order_number).padStart(5,'0');
  if(saved.status==='notified')return reply(200,{ok:true,orderNumber,totalCents:saved.total_cents});
  const text=`🍵 ออเดอร์หน้าร้าน ${orderNumber}\nผู้รับ: ${details.customer.name}\nโทร: ${details.customer.phone||'ไม่ได้ระบุ'}\n\n`+order.lines.map((l:any)=>`${l.name} × ${l.quantity}\n${Object.values(l.selections).map((o:any)=>o.label).join(' · ')}\n฿${baht(l.totalCents)}`).join('\n\n')+`\n\nรวม ฿${baht(order.totalCents)}\nหมายเหตุ: ${details.customer.note||'—'}\nรอร้านยืนยัน · ยังไม่ชำระเงิน`;
  const sent=await fetch(`https://api.telegram.org/bot${config.store_telegram_token}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:config.store_telegram_chat,text,reply_markup:orderButtons(requestId!,'awaiting')}),signal:AbortSignal.timeout(12000)});
  const message=await sent.json();
  if(!sent.ok||!message.ok){await db.from('store_orders').update({status:'pending',claimed_at:null}).eq('request_id',requestId);return reply(502,{ok:false,error:'ร้านยังไม่ได้รับแจ้งเตือน กรุณาลองอีกครั้ง'});}
  const {error:markError}=await db.from('store_orders').update({status:'notified',notified_at:new Date().toISOString(),telegram_message_id:message.result.message_id}).eq('request_id',requestId);
  if(markError)return reply(503,{ok:false,error:'ส่งให้ร้านแล้ว แต่บันทึกสถานะไม่สำเร็จ กรุณาติดต่อร้านก่อนสั่งซ้ำ'});
  return reply(200,{ok:true,orderNumber,totalCents:order.totalCents});
 }catch(error){return reply(400,{ok:false,error:error instanceof Error && /^[ก-๙]/.test(error.message)?error.message:'ส่งออเดอร์ไม่สำเร็จ กรุณาลองอีกครั้ง'});}
});
