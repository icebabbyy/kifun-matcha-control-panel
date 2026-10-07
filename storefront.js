import {supabase,uploadMenuImage} from './supabase.js';
import {priceLine,priceOrder,baht} from './order-pricing.js';
import {renderStoreChat} from './store-chat.js?v=20261007-7';
import {trackOrder,renderOrderTracking} from './order-tracking.js?v=20261007-9';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let catalog, selected, cart=[], submitting=false, requestId, receipt, reviewedCustomer,receiptKey;
try {cart=JSON.parse(sessionStorage.getItem('happihaus-cart')||'[]');requestId=sessionStorage.getItem('happihaus-order-request')||undefined;receiptKey=sessionStorage.getItem('happihaus-order-key')||undefined;} catch {}
function persist(){sessionStorage.setItem('happihaus-cart',JSON.stringify(cart));requestId=undefined;receiptKey=undefined;sessionStorage.removeItem('happihaus-order-request');sessionStorage.removeItem('happihaus-order-key');receipt=undefined;}
function defaults(menu){return Object.fromEntries(menu.groups.map(k=>[k,catalog.groups[k].options.find(o=>o.available&&!menu.blockedOptions?.[k]?.includes(o.id))?.id]));}
function draw(){
 if(!catalog)return;
 const root=document.querySelector('#customer-view');
 const categories=[...new Set(catalog.menus.map(m=>m.category))];
 let total;if(cart.length){try {total=priceOrder(catalog,cart);}catch {cart=[];persist();}}
 root.innerHTML=`<div class="customer-head"><div><p class="eyebrow">HAPPIHAUS MATCHA</p><p class="muted">ราคาหน้าร้าน · สั่งรับที่ร้าน</p></div><span class="status-pill">พร้อมดื่ม หรือแพ็กแยก</span></div><div class="store-layout"><div>${categories.map(category=>`<section class="store-category"><h2>${esc(category)}</h2><div class="store-grid">${catalog.menus.filter(m=>m.category===category).map(m=>`<button class="store-card" data-store-menu="${m.id}" ${m.available?'':'disabled'}>${m.image?`<img src="${esc(m.image)}" alt="${esc(m.name)}" loading="lazy">`:'<div class="store-placeholder">🍵</div>'}<div><h3>${esc(m.name)}</h3><p>${esc(m.description)}</p><b>฿${baht(Math.round(m.storePrice*100))}</b><span>${m.available?'เลือกเมนู':'งดขายชั่วคราว'}</span></div></button>`).join('')}</div></section>`).join('')}</div><aside class="store-cart"><h2>รายการของคุณ</h2>${cart.length?cart.map((r,i)=>{const l=priceLine(catalog,r);return `<div class="cart-row"><b>${esc(l.name)} × ${l.quantity}</b><small>${Object.values(l.selections).map(o=>esc(o.label)).join(' · ')}</small><span>฿${baht(l.totalCents)} <button data-store-remove="${i}" aria-label="ลบ ${esc(l.name)}">ลบ</button></span></div>`;}).join(''):'<p class="muted">เลือกเมนู แล้วเพิ่มลงรายการ</p>'}${total?`<p class="store-total">รวม <b>฿${baht(total.totalCents)}</b></p><form id="store-checkout"><label>ชื่อผู้รับ<input name="name" required maxlength="80" autocomplete="given-name"></label><label>เบอร์โทร (ถ้าต้องการให้ติดต่อกลับ)<input name="phone" type="tel" maxlength="20" autocomplete="tel"></label><label>หมายเหตุ / เวลารับ<textarea name="note" maxlength="500"></textarea></label><button class="primary-btn" ${submitting?'disabled':''}>${submitting?'กำลังส่ง…':'ทวนรายการก่อนสั่ง'}</button><p class="muted">ชำระเงินตอนรับเครื่องดื่ม · รอร้านรับออเดอร์ก่อน</p></form>`:''}<p id="store-result" role="status">${receipt?esc(receipt):''}</p></aside></div><dialog id="store-dialog"><form id="store-config"><button type="button" class="dialog-close" data-store-close aria-label="ปิด">×</button><div id="store-fields"></div></form></dialog>`;
 renderStoreChat();
 renderOrderTracking();
}
function customize(id){
 const menu=catalog.menus.find(m=>m.id===id&&m.available);if(!menu)return;
 selected={menuId:id,quantity:1,options:defaults(menu)};
 const dialog=document.querySelector('#store-dialog');
 dialog.innerHTML='<form id="store-config"><button type="button" class="dialog-close" data-store-close aria-label="ปิด">×</button><div id="store-fields"></div></form>';
 document.querySelector('#store-fields').innerHTML=`<h2>${esc(menu.name)}</h2><p>${esc(menu.description)}</p>${menu.groups.map(k=>{const g=catalog.groups[k];return `<fieldset><legend>${esc(g.label)}${g.perCup&&menu.cups===2?' (ทั้งสองแก้ว)':''}</legend>${g.options.filter(o=>o.available&&!menu.blockedOptions?.[k]?.includes(o.id)).map(o=>`<label class="store-option"><input type="radio" name="${k}" value="${o.id}" ${selected.options[k]===o.id?'checked':''} required><span><b>${esc(o.label)}</b>${o.note&&k!=='serving'?`<small>${esc(o.note)}</small>`:''}</span><b>${k==='serving'?'':(menu.optionPrices?.[k]?.[o.id]??o.storeAdd)?'+฿'+baht(Math.round((menu.optionPrices?.[k]?.[o.id]??o.storeAdd)*100)*(g.perCup?menu.cups:1)):'รวมแล้ว'}</b></label>`).join('')}</fieldset>`;}).join('')}<label>จำนวน<input name="quantity" type="number" value="1" min="1" max="20" required></label><p class="store-total" id="store-line-price"></p><button class="primary-btn">เพิ่มลงรายการ</button>`;
 preview();dialog.showModal();
}
function preview(){const fd=new FormData(document.querySelector('#store-config'));selected.quantity=Number(fd.get('quantity'));for(const k of catalog.menus.find(m=>m.id===selected.menuId).groups)selected.options[k]=fd.get(k);try{document.querySelector('#store-line-price').textContent='฿'+baht(priceLine(catalog,selected).totalCents);}catch(e){document.querySelector('#store-line-price').textContent=e.message;}}
document.addEventListener('click',e=>{const b=e.target.closest('[data-store-menu],[data-store-remove],[data-store-close]');if(!b||submitting)return;if(b.dataset.storeMenu)customize(b.dataset.storeMenu);else if(b.hasAttribute('data-store-close'))document.querySelector('#store-dialog').close();else{cart.splice(Number(b.dataset.storeRemove),1);persist();draw();}});
document.addEventListener('cancel',e=>{if(e.target.id==='store-dialog'&&submitting)e.preventDefault();},true);
document.addEventListener('input',e=>{if(e.target.closest('#store-checkout')){requestId=undefined;sessionStorage.removeItem('happihaus-order-request');}});
document.addEventListener('change',e=>{if(e.target.closest('#store-config'))preview();});
document.addEventListener('submit',async e=>{
 if(e.target.id==='store-config'){e.preventDefault();try{preview();priceOrder(catalog,[...cart,selected]);cart.push(structuredClone(selected));persist();draw();}catch(err){alert(err.message);}return;}
 if(!['store-checkout','store-final-confirm'].includes(e.target.id))return;e.preventDefault();if(submitting)return;
 if(e.target.id==='store-checkout'){
 const fd=new FormData(e.target);reviewedCustomer={name:String(fd.get('name')).trim(),phone:String(fd.get('phone')||'').trim(),note:String(fd.get('note')||'').trim()};
 const order=priceOrder(catalog,cart);const dialog=document.querySelector('#store-dialog');
 dialog.innerHTML=`<form id="store-final-confirm"><button type="button" data-store-close class="dialog-close" aria-label="กลับไปแก้ไข">×</button><h2>ทวนออเดอร์ก่อนยืนยัน</h2>${order.lines.map(l=>`<div class="cart-row"><b>${esc(l.name)} × ${l.quantity}</b><small>${Object.values(l.selections).map(o=>esc(o.label)).join(' · ')}</small><span>฿${baht(l.totalCents)}</span></div>`).join('')}<p>ผู้รับ: ${esc(reviewedCustomer.name)}<br>โทร: ${esc(reviewedCustomer.phone||'ไม่ได้ระบุ')}<br>หมายเหตุ: ${esc(reviewedCustomer.note||'—')}</p><p class="store-total">รวม <b>฿${baht(order.totalCents)}</b></p><p>ส่งรายการและข้อมูลผู้รับให้ร้าน · ชำระเงินตอนรับเครื่องดื่ม</p><button class="primary-btn">ยืนยันและส่งออเดอร์</button><button type="button" data-store-close class="secondary-btn">กลับไปแก้ไข</button></form>`;dialog.showModal();return;
 }
 const customer=reviewedCustomer;
 submitting=true;const btn=e.target.querySelector('.primary-btn');btn.disabled=true;btn.textContent='กำลังส่ง…';
 try{requestId??=crypto.randomUUID();sessionStorage.setItem('happihaus-order-request',requestId);receiptKey??=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(n=>n.toString(16).padStart(2,'0')).join('');sessionStorage.setItem('happihaus-order-key',receiptKey);const priced=priceOrder(catalog,cart);const {data,error}=await supabase.functions.invoke('store-order',{body:{requestId,version:catalog.version,cart,customer,receiptKey,expectedTotal:priced.totalCents}});if(error||!data?.ok)throw new Error(data?.error||'ส่งออเดอร์ยังไม่สำเร็จ กรุณาลองอีกครั้ง หรือติดต่อหน้าร้าน');const tracking={requestId,receiptKey,orderNumber:data.orderNumber,totalCents:data.totalCents};cart=[];persist();trackOrder(tracking);receipt=`ส่งออเดอร์ ${data.orderNumber} ให้ร้านแล้ว ยอด ฿${baht(data.totalCents)} · รอร้านยืนยัน`;draw();}catch(err){document.querySelector('#store-result').textContent=err.message;document.querySelector('#store-dialog')?.close();}finally{submitting=false;btn.disabled=false;btn.textContent='ยืนยันและส่งออเดอร์';}
});
export async function initStorefront(){
 const response=await fetch('./storefront-catalog.json',{cache:'no-store'});if(!response.ok)throw new Error('โหลดเมนูไม่สำเร็จ');catalog=await response.json();
 const {data:live}=await supabase.from('store_catalog').select('payload').eq('id',1).maybeSingle();if(live?.payload)catalog=live.payload;
 window.__renderStoreCatalogAdmin=()=>`<div class="panel"><h2>เมนูหน้าร้านที่ลูกค้าสั่งได้จริง</h2><p>แก้ราคาและสถานะที่นี่ · หน้าเมนูลูกค้าใช้ข้อมูลชุดนี้ · ราคาสินค้าไม่รวมค่าคอมมิชชัน</p><form id="store-catalog-admin"><div class="table-wrap"><table class="data-table"><thead><tr><th>เมนู / รูป</th><th>ราคา ฿</th><th>เปิดขาย</th><th>Yaki เพิ่ม ฿</th></tr></thead><tbody>${catalog.menus.map(m=>`<tr><td>${esc(m.name)}<div class="catalog-photo">${m.image?`<img src="${esc(m.image)}" alt="${esc(m.name)}" width="72" height="72">`:""}<label>เปลี่ยนรูปเมนู<input type="file" accept="image/jpeg,image/png,image/webp" data-catalog-photo="${m.id}" aria-label="เปลี่ยนรูป ${esc(m.name)}"></label><input type="hidden" name="image-${m.id}" value="${esc(m.image||'')}"><small data-photo-status="${m.id}" role="status"></small></div></td><td><input type="number" min="0.01" max="10000" step="0.01" required name="price-${m.id}" value="${m.storePrice}"></td><td><input type="checkbox" name="available-${m.id}" ${m.available?'checked':''}></td><td>${m.optionPrices?.taste?`<input type="number" min="0" max="10000" step="0.01" required name="yaki-${m.id}" value="${m.optionPrices.taste.yaki}">`:'—'}</td></tr>`).join('')}</tbody></table></div>${Object.entries(catalog.groups).map(([k,g])=>`<h3>${esc(g.label)}</h3><div class="table-wrap"><table class="data-table"><thead><tr><th>ตัวเลือก</th><th>เพิ่ม ฿/แก้ว</th><th>เปิดขาย</th></tr></thead><tbody>${g.options.map(o=>`<tr><td>${esc(o.label)}</td><td><input type="number" min="0" max="10000" step="0.01" required name="extra-${k}-${o.id}" value="${o.storeAdd}"></td><td><input type="checkbox" name="option-${k}-${o.id}" ${o.available?'checked':''}></td></tr>`).join('')}</tbody></table></div>`).join('')}<button class="primary-btn">บันทึกเมนูหน้าร้าน</button><p id="catalog-admin-status" role="status"></p></form></div>`;
 window.__renderStorefront=draw;document.body.classList.add('storefront-enabled');
 if(new URLSearchParams(location.search).get('order')==='1')document.body.classList.add('qr-order');
 document.querySelector('#brand-name').textContent='HAPPIHAUS';document.querySelector('#brand-subline').textContent='MATCHA';draw();
}
document.addEventListener('submit',async e=>{
 if(e.target.id!=='store-catalog-admin')return;e.preventDefault();if(!window.__verifiedAdminSession)return;
 const form=e.target,fd=new FormData(form),next=structuredClone(catalog),status=form.querySelector('#catalog-admin-status'),btn=form.querySelector('.primary-btn');btn.disabled=true;
 try{
 for(const m of next.menus){m.image=String(fd.get(`image-${m.id}`)||'');m.storePrice=Number(fd.get(`price-${m.id}`));m.available=fd.has(`available-${m.id}`);if(m.optionPrices?.taste)m.optionPrices.taste.yaki=Number(fd.get(`yaki-${m.id}`));}
 for(const [k,g] of Object.entries(next.groups))for(const o of g.options){o.storeAdd=Number(fd.get(`extra-${k}-${o.id}`));o.available=fd.has(`option-${k}-${o.id}`);}
 if(next.menus.some(m=>!Number.isFinite(m.storePrice)||m.storePrice<=0)||Object.values(next.groups).some(g=>!g.options.some(o=>o.available)))throw new Error('กรุณาตรวจราคาและเปิดตัวเลือกอย่างน้อยหนึ่งรายการในแต่ละกลุ่ม');
 next.version=new Date().toISOString()+'-'+crypto.randomUUID().slice(0,8);
 const {data,error}=await supabase.from('store_catalog').update({payload:next,updated_at:new Date().toISOString()}).eq('id',1).eq('payload->>version',catalog.version).select('payload');
 if(error||!data?.length)throw new Error('บันทึกไม่สำเร็จ หรือข้อมูลถูกแก้จากอีกหน้าต่าง กรุณารีเฟรช');
 catalog=data[0].payload;status.textContent='บันทึกและตรวจข้อมูลจากเซิร์ฟเวอร์แล้ว';draw();
 }catch(err){status.textContent=err.message;}finally{btn.disabled=false;}
});

document.addEventListener('change',async e=>{
 const input=e.target;if(!input.matches('[data-catalog-photo]')||!window.__verifiedAdminSession)return;
 const file=input.files?.[0],form=input.closest('form');if(!file||!form)return;
 const status=form.querySelector(`[data-photo-status="${input.dataset.catalogPhoto}"]`),save=form.querySelector('.primary-btn');
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024){status.textContent='เลือกรูป JPG, PNG หรือ WebP ไม่เกิน 10 MB';input.value='';return;}
 input.disabled=true;save.disabled=true;status.textContent='กำลังอัปโหลดรูป…';
 try{const url=await uploadMenuImage(input.dataset.catalogPhoto,file);form.elements.namedItem(`image-${input.dataset.catalogPhoto}`).value=url;
 const box=input.closest('.catalog-photo');let img=box.querySelector('img');if(!img){img=document.createElement('img');img.width=72;img.height=72;box.prepend(img);}img.src=url;img.alt=input.getAttribute('aria-label');status.textContent='อัปโหลดแล้ว · กดบันทึกเมนูหน้าร้านเพื่อใช้รูป';
 }catch(err){status.textContent='อัปโหลดไม่สำเร็จ: '+err.message;}finally{input.disabled=false;save.disabled=!!form.querySelector('[data-catalog-photo]:disabled');}
});
