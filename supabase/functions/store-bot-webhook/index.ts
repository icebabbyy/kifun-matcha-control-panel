import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
Deno.serve(async(req:Request)=>{
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 const {data:config,error}=await db.rpc('store_telegram_config');
 if(error||!config?.store_telegram_webhook_secret||req.headers.get('x-telegram-bot-api-secret-token')!==config.store_telegram_webhook_secret)return new Response('Unauthorized',{status:401});
 try{
 const update=await req.json();const message=update.message;
 if(!message||String(message.chat?.id)!==config.store_telegram_chat||!message.reply_to_message?.message_id||typeof message.text!=='string')return new Response('ok');
 const {error:writeError}=await db.from('store_questions').update({reply:message.text.slice(0,4000),replied_at:new Date().toISOString()}).eq('telegram_message_id',message.reply_to_message.message_id);
 return new Response(writeError?'retry':'ok',{status:writeError?500:200});
 }catch{return new Response('Bad request',{status:400});}
});
