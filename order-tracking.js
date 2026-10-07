import {supabase} from './supabase.js';
import {orderStates} from './order-status.js';
import {baht} from './order-pricing.js';
let tracked,polling=false;
try{tracked=JSON.parse(sessionStorage.getItem('happihaus-last-order'));}catch{}
export function trackOrder(order){tracked={...order,fulfillment:'awaiting',paymentStatus:'unpaid'};sessionStorage.setItem('happihaus-last-order',JSON.stringify(tracked));renderOrderTracking();poll();}
export function renderOrderTracking(){
 const root=document.querySelector('#store-result');if(!root||!tracked)return;
 root.innerHTML=`<div class="order-tracking"><b>${tracked.orderNumber.replace(/[^A-Z0-9-]/g,'')} · ฿${baht(tracked.totalCents)}</b><p>${orderStates[tracked.fulfillment]||orderStates.awaiting}</p>${tracked.fulfillment==='declined'||tracked.fulfillment==='completed'?'':`<small>ชำระเงินตอนรับเครื่องดื่ม · สแกน QR ที่ร้านหรือเงินสด<br>${tracked.fulfillment==='awaiting'?'รอร้านยืนยันก่อน · ไม่ต้องจ่ายล่วงหน้า':'ไม่ต้องจ่ายล่วงหน้า'}</small>`}</div>`;
}
async function poll(){if(!tracked||polling||document.hidden||['completed','declined'].includes(tracked.fulfillment))return;polling=true;try{const {data,error}=await supabase.functions.invoke('store-order-status',{body:{requestId:tracked.requestId,receiptKey:tracked.receiptKey}});if(!error&&data?.ok){Object.assign(tracked,data);sessionStorage.setItem('happihaus-last-order',JSON.stringify(tracked));renderOrderTracking();}}finally{polling=false;}}
setInterval(poll,5000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll();});
