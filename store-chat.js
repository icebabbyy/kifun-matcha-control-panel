import {supabase} from './supabase.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let session;try{session=JSON.parse(sessionStorage.getItem('happihaus-chat'));}catch{}
if(!session){session={conversationId:crypto.randomUUID(),clientKey:Array.from(crypto.getRandomValues(new Uint8Array(32))).map(n=>n.toString(16).padStart(2,'0')).join('')};sessionStorage.setItem('happihaus-chat',JSON.stringify(session));}
let messages=[],busy=false,polling=false,pendingId,open=false,seenReplies=0,hasConversation=sessionStorage.getItem('happihaus-chat-used')==='true';
export function renderStoreChat(){
 if(document.querySelector('#store-chat-widget'))return;
 document.body.insertAdjacentHTML('beforeend',`<div id="store-chat-widget"><button type="button" id="store-chat-toggle" class="chat-bubble" aria-expanded="false" aria-controls="store-chat">💬 สอบถาม (ถ้ามี)<span id="chat-unread" hidden>ร้านตอบแล้ว</span></button><section id="store-chat" class="store-chat chat-float" aria-label="สอบถามร้าน" hidden><div class="chat-float-head"><h2>สอบถามร้าน</h2><button type="button" id="store-chat-close" aria-label="ปิดช่องสอบถาม">×</button></div><p>มีคำถามเรื่องรสชาติหรืออยากขอคำแนะนำ พิมพ์ไว้ได้เลย</p><div id="chat-messages" aria-live="polite"></div><form id="store-chat-form"><label>ชื่อของคุณ (ไม่บังคับ)<input name="name" maxlength="80"></label><label>ข้อความ<textarea name="question" required maxlength="1000" placeholder="พิมพ์คำถามหรือหมายเหตุถึงร้าน…"></textarea></label><button class="primary-btn">ส่งข้อความถึงร้าน</button><p id="chat-status" role="status"></p></form><small>คำตอบจากร้านจะแสดงในช่องนี้</small></section></div>`);renderMessages();
}
function renderMessages(){const out=document.querySelector('#chat-messages');if(out)out.innerHTML=messages.map(m=>`<div class="chat-question"><b>คุณ</b><p>${esc(m.question)}</p></div>${m.reply?`<div class="chat-answer"><b>ร้าน</b><p>${esc(m.reply)}</p></div>`:'<p class="muted">ส่งให้ร้านแล้ว · รอร้านตอบ</p>'}`).join('');const count=messages.filter(m=>m.reply).length;if(open)seenReplies=count;const badge=document.querySelector('#chat-unread');if(badge)badge.hidden=count<=seenReplies;}
function toggle(value){open=value;document.querySelector('#store-chat').hidden=!open;document.querySelector('#store-chat-toggle').setAttribute('aria-expanded',String(open));renderMessages();if(open){poll();document.querySelector('#store-chat textarea').focus();}else document.querySelector('#store-chat-toggle').focus();}
document.addEventListener('click',e=>{if(e.target.closest('#store-chat-toggle'))toggle(!open);if(e.target.closest('#store-chat-close'))toggle(false);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&open){e.preventDefault();toggle(false);}});
async function poll(){if(polling||document.hidden||(!open&&!hasConversation))return;polling=true;try{const {data,error}=await supabase.functions.invoke('store-chat',{body:{...session,action:'poll'}});if(!error&&data?.ok){messages=data.messages;renderMessages();}}finally{polling=false;}}
document.addEventListener('submit',async e=>{
 if(e.target.id!=='store-chat-form')return;e.preventDefault();if(busy)return;
 const fd=new FormData(e.target),button=e.target.querySelector('button'),status=document.querySelector('#chat-status');busy=true;button.disabled=true;
 try{pendingId??=crypto.randomUUID();const {data,error}=await supabase.functions.invoke('store-chat',{body:{...session,action:'send',requestId:pendingId,name:String(fd.get('name')||'').trim(),question:String(fd.get('question')||'').trim()}});if(error||!data?.ok)throw new Error(data?.error||'ส่งข้อความยังไม่สำเร็จ กรุณาลองอีกครั้ง');pendingId=undefined;hasConversation=true;sessionStorage.setItem('happihaus-chat-used','true');e.target.querySelector('textarea').value='';status.textContent='ส่งให้ร้านแล้ว ปิดช่องนี้ได้ เมื่อร้านตอบจะมีแจ้งที่ปุ่มสอบถาม';await poll();}catch(err){status.textContent=err.message;}finally{busy=false;button.disabled=false;}
});
document.addEventListener('input',e=>{if(e.target.closest('#store-chat-form'))pendingId=undefined;});
setInterval(poll,10000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll();});
