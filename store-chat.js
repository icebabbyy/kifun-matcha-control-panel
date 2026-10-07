import {supabase} from './supabase.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let session;try{session=JSON.parse(sessionStorage.getItem('happihaus-chat'));}catch{}
if(!session){session={conversationId:crypto.randomUUID(),clientKey:Array.from(crypto.getRandomValues(new Uint8Array(32))).map(n=>n.toString(16).padStart(2,'0')).join('')};sessionStorage.setItem('happihaus-chat',JSON.stringify(session));}
let messages=[],busy=false,polling=false,pendingId;
export function renderStoreChat(){
 const root=document.querySelector('#customer-view');if(!root||document.querySelector('#store-chat'))return;
 root.insertAdjacentHTML('beforeend',`<section id="store-chat" class="store-chat"><h2>ถามร้านก่อนเลือกชา</h2><p>ถามรสชาติหรือขอคำแนะนำได้ ร้านตอบกลับผ่านหน้านี้ · ไม่ต้องมี Telegram</p><div id="chat-messages" aria-live="polite"></div><form id="store-chat-form"><label>ชื่อของคุณ (ไม่บังคับ)<input name="name" maxlength="80"></label><label>คำถาม<textarea name="question" required maxlength="1000" placeholder="ชอบชาโทนถั่ว ดื่มลาเต้ แนะนำตัวไหนดี?"></textarea></label><button class="primary-btn">ส่งคำถามถึงร้าน</button><p id="chat-status" role="status"></p></form><small>เปิดหน้านี้รอคำตอบ · ชำระเงินและข้อมูลออเดอร์แยกจากแชต</small></section>`);renderMessages();
}
function renderMessages(){const out=document.querySelector('#chat-messages');if(out)out.innerHTML=messages.map(m=>`<div class="chat-question"><b>คุณ</b><p>${esc(m.question)}</p></div>${m.reply?`<div class="chat-answer"><b>ร้าน</b><p>${esc(m.reply)}</p></div>`:'<p class="muted">ส่งให้ร้านแล้ว · รอร้านตอบ</p>'}`).join('');}
async function poll(){if(polling||document.hidden)return;polling=true;try{const {data,error}=await supabase.functions.invoke('store-chat',{body:{...session,action:'poll'}});if(!error&&data?.ok){messages=data.messages;renderMessages();}}finally{polling=false;}}
document.addEventListener('submit',async e=>{
 if(e.target.id!=='store-chat-form')return;e.preventDefault();if(busy)return;
 const fd=new FormData(e.target),button=e.target.querySelector('button'),status=document.querySelector('#chat-status');busy=true;button.disabled=true;
 try{pendingId??=crypto.randomUUID();const {data,error}=await supabase.functions.invoke('store-chat',{body:{...session,action:'send',requestId:pendingId,name:String(fd.get('name')||'').trim(),question:String(fd.get('question')||'').trim()}});if(error||!data?.ok)throw new Error(data?.error||'ส่งข้อความยังไม่สำเร็จ กรุณาลองอีกครั้ง');pendingId=undefined;e.target.querySelector('textarea').value='';status.textContent='ส่งให้ร้านแล้ว เปิดหน้านี้รอคำตอบได้เลย';await poll();}catch(err){status.textContent=err.message;}finally{busy=false;button.disabled=false;}
});
document.addEventListener('input',e=>{if(e.target.closest('#store-chat-form'))pendingId=undefined;});
setInterval(poll,10000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll();});
