import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {orderStates,orderButtons} from './order-status.js';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
Deno.serve(async(req:Request)=>{
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 const {data:config,error}=await db.rpc('store_telegram_config');
 if(error||!config?.store_telegram_webhook_secret||req.headers.get('x-telegram-bot-api-secret-token')!==config.store_telegram_webhook_secret)return new Response('Unauthorized',{status:401});
 try{
 const update=await req.json();const message=update.message;
 if(update.callback_query){
  const cb=update.callback_query;
  if(String(cb.message?.chat?.id)!==config.store_telegram_chat||String(cb.from?.id)!==config.store_telegram_chat)return new Response('ok');
  const match=/^order:(accept|decline|ready|complete):([a-f0-9-]{36})$/.exec(cb.data||'');
  if(!match)return new Response('ok');
  const {data:source,error:sourceError}=await db.from('store_orders').select('telegram_message_id').eq('request_id',match[2]).maybeSingle();
  if(sourceError||!source?.telegram_message_id)return new Response('retry',{status:500});
  if(source.telegram_message_id!==cb.message.message_id)return new Response('ok');
  const {data:order,error:decisionError}=await db.rpc('decide_store_order',{p_request:match[2],p_action:match[1],p_actor:cb.from.id});
  if(decisionError)return new Response('retry',{status:500});
  const label=orderStates[order.fulfillment as keyof typeof orderStates];
  const call=async(method:string,body:unknown)=>{const response=await fetch(`https://api.telegram.org/bot${config.store_telegram_token}/${method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});return await response.json();};
  await call('answerCallbackQuery',{callback_query_id:cb.id,text:label});
  const result=await call('editMessageText',{chat_id:config.store_telegram_chat,message_id:cb.message.message_id,text:(cb.message.text||'').split('\n\nสถานะร้าน:')[0]+`\n\nสถานะร้าน: ${label}\nการชำระเงิน: ${order.payment_status==='paid'?'ร้านยืนยันรับเงินแล้ว':'ยังไม่ชำระเงิน · รับเงินตอนส่งมอบ'}`,reply_markup:orderButtons(match[2],order.fulfillment)});
  return new Response(result.ok||result.description?.includes('message is not modified')?'ok':'retry',{status:result.ok||result.description?.includes('message is not modified')?200:500});
 }
 if(!message||String(message.chat?.id)!==config.store_telegram_chat||!message.reply_to_message?.message_id||typeof message.text!=='string')return new Response('ok');
 const {error:writeError}=await db.from('store_questions').update({reply:message.text.slice(0,4000),replied_at:new Date().toISOString()}).eq('telegram_message_id',message.reply_to_message.message_id);
 return new Response(writeError?'retry':'ok',{status:writeError?500:200});
 }catch{return new Response('Bad request',{status:400});}
});
