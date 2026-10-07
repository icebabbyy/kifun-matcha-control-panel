import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {transformSync} from 'esbuild';
const digest=async key=>Buffer.from(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(key))).toString('hex');
function handler(file,rows) {
 const db={rpc:async()=>({data:{store_telegram_chat:'7712176521',store_telegram_webhook_secret:'test-secret'}}),from:()=>{
  const filters=[];let changes;
  const result=()=>{const matched=rows.filter(row=>filters.every(([key,value])=>row[key]===value));if(changes)matched.forEach(row=>Object.assign(row,changes));return {data:matched,error:null};};
  const query={select:()=>query,update:value=>{changes=value;return query;},eq:(key,value)=>{filters.push([key,value]);return query;},order:()=>query,limit:async()=>result(),then:(resolve,reject)=>Promise.resolve(result()).then(resolve,reject)};return query;
 }};
 const source=fs.readFileSync(new URL('./supabase/functions/'+file+'/index.ts',import.meta.url),'utf8').replace(/^import[^\n]*\n/gm,'').replace(/^const db=createClient[^\n]*\n/m,'');
 let callback;vm.runInNewContext(transformSync(source,{loader:'ts',format:'cjs'}).code,{db,Deno:{env:{get:()=>''},serve:fn=>{callback=fn;}},crypto:webcrypto,TextEncoder,Request,Response,AbortSignal,console});return callback;
}
test('simultaneous clients only receive replies to their own Telegram messages',async()=>{
 const keyA='a'.repeat(64),keyB='b'.repeat(64),roomA='11111111-1111-4111-8111-111111111111',roomB='22222222-2222-4222-8222-222222222222';
 const rows=[{conversation_id:roomA,client_hash:await digest(keyA),telegram_message_id:100,question:'A',reply:null},{conversation_id:roomB,client_hash:await digest(keyB),telegram_message_id:101,question:'B',reply:null}];
 const webhook=handler('store-bot-webhook',rows),chat=handler('store-chat',rows);
 const reply=(id,text)=>webhook(new Request('https://example.test/webhook',{method:'POST',headers:{'x-telegram-bot-api-secret-token':'test-secret'},body:JSON.stringify({message:{chat:{id:7712176521},reply_to_message:{message_id:id},text}})}));
 await Promise.all([reply(100,'Answer A'),reply(101,'Answer B')]);
 const poll=async(room,key)=>{const response=await chat(new Request('https://example.test/chat',{method:'POST',headers:{origin:'https://icebabbyy.github.io'},body:JSON.stringify({action:'poll',conversationId:room,clientKey:key})}));assert.equal(response.status,200);return (await response.json()).messages;};
 const [a,b,wrong]=await Promise.all([poll(roomA,keyA),poll(roomB,keyB),poll(roomA,keyB)]);
 assert.equal(a.length,1);assert.equal(a[0].reply,'Answer A');assert.equal(b.length,1);assert.equal(b[0].reply,'Answer B');assert.deepEqual(wrong,[]);
});
