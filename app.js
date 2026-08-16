/* KIFUN MATCHA — Supabase-backed control panel.
   State lives in memory here; main.js (ES module) persists it to Supabase. */
const COMMISSION = 0.321;
const money = n => `฿${Math.round(n).toLocaleString("th-TH")}`;
const today = () => new Date().toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
}[char]));

const powders = {
  noko: { label: "NOKO", stock: "NOKO Premium Grade Nishio", priceAdd: 0, cost: 3.71, note: "House base · นุ่ม ดื่มง่าย" },
  sukito: { label: "Sukito Kagoshima 03", stock: "Sukito Kagoshima 03", priceAdd: 15, cost: 15, note: "Floral–nutty · ลงนมดี" },
  mie: { label: "Mie Matcha", stock: "Mie Matcha", priceAdd: 0, cost: 10.433, note: "Umami–nutty · smooth" },
  horii: { label: "Horii Uji Mukashi", stock: "Horii Uji Mukashi", priceAdd: 0, cost: 27, note: "Uji · กลิ่นชาสด, umami นุ่ม, savory ปลายเล็กน้อย" },
  marukyu: { label: "Marukyu Yugen", stock: "Marukyu Yugen", priceAdd: 0, cost: 34, note: "Uji · balanced umami, grassy เบา, mild bitterness" },
  hojicha: { label: "Hoho Hojicha", stock: "Hoho Hojicha", priceAdd: 0, cost: 15.3, note: "Roasted · cocoa-like" }
};
const menus = [
  { id:"nutella", name:"Nutella Matcha", thai:"มัทฉะนูเทลล่า", icon:"🍫", base:149, baseCost:0, powderG:5, type:"base", milk:true, sweetness:false, art:"Nutella 30g · นม 100ml", description:"นูเทลล่าเข้มกับมัทฉะนุ่ม ๆ", tag:"Signature", ingredient:"Nutella spread", ingredientQty:30, ingredientKnown:true },
  { id:"latte", name:"Matcha Latte", thai:"มัทฉะลาเต้", icon:"🥛", base:99, baseCost:25.48, powderG:5, type:"base", milk:true, sweetness:true, art:"Everyday favourite", description:"นมโอ๊ตเนียน ๆ กับมัทฉะที่เลือกเอง", tag:"Daily" },
  { id:"coconut", name:"Coconut Matcha", thai:"มัทฉะมะพร้าว", icon:"🥥", base:109, baseCost:0.222, powderG:4, type:"base", milk:true, sweetness:true, art:"Coconut water ฿115/L", description:"น้ำมะพร้าวใส หวานธรรมชาติ", tag:"Fresh", coconut:136, oat:65 },
  { id:"coconutfoam", name:"Coconut Foam Matcha", thai:"มัทฉะโฟมมะพร้าว", icon:"☁️", base:129, baseCost:10.22, powderG:4, type:"base", milk:true, sweetness:true, art:"Foam special", description:"มะพร้าวละมุนพร้อมโฟมเนื้อเบา", tag:"Special", coconut:136, oat:65, foam:1 },
  { id:"clear", name:"Clear Matcha", thai:"เคลียร์มัทฉะ", icon:"🫧", base:65, baseCost:2.772, powderG:3, type:"base", milk:false, sweetness:true, art:"NOKO starts at ฿65", description:"ชาใสเย็น ดื่มง่ายและเห็นคาแรกเตอร์ผง", tag:"Clear" },
  { id:"coldwhisk", name:"Cold Whisk Matcha", thai:"โคลด์วิสก์มัทฉะ", icon:"🌿", base:119, baseCost:20.491, powderG:5, type:"base", milk:true, sweetness:true, art:"Whisked fresh", description:"ตีมัทฉะกับนมโอ๊ตให้เนื้อนุ่มฟู", tag:"Hand whisk" },
  { id:"hojicha", name:"Hojicha Latte", thai:"โฮจิฉะลาเต้", icon:"🔥", base:179, baseCost:25.48, powderG:4, type:"hojicha", milk:true, sweetness:true, art:"Roasted & cosy", description:"กลิ่นคั่วนุ่ม โกโก้บาง ๆ", tag:"Roasted" },
  { id:"premium", name:"Premium Matcha", thai:"พรีเมียมมัทฉะ", icon:"✨", base:179, baseCost:2.772, powderG:3, type:"premium", milk:true, sweetness:true, art:"Horii / Marukyu · เลือกวิธีชง", description:"ชา Special แยกจาก base · จำนวนจำกัด", tag:"Limited" }
];
const snacks = [
  { id:"cream-matcha", name:"Matcha Cream Roll", thai:"ครีมโรลมัทฉะ", icon:"🍰", base:39, lineman:59, stock:"Cream roll — Matcha", cost:10.4545, art:"คงเหลือ 21 ชิ้น", description:"ครีมโรลรสมัทฉะ" },
  { id:"cream-hojicha", name:"Hojicha Cream Roll", thai:"ครีมโรลโฮจิฉะ", icon:"🥮", base:39, lineman:59, stock:"Cream roll — Hojicha", cost:10.4545, art:"คงเหลือ 20 ชิ้น", description:"ครีมโรลรสโฮจิฉะ" }
];
const defaultState = () => ({
  menuStatus: Object.fromEntries(menus.map(m => [m.id, true])),
  stock: [
    { name:"NOKO Premium Grade Nishio", unit:"g", qty:100, cost:3.71, min:20, source:"ชีท · ฿371 / 100g" },
    { name:"Sukito Kagoshima 03", unit:"g", qty:24, cost:15, min:10, source:"ชีท · ฿450 / 30g" },
    { name:"Mie Matcha", unit:"g", qty:15, cost:10.433, min:8, source:"ชีท · ฿313 / 30g" },
    { name:"Horii Uji Mukashi", unit:"g", qty:20, cost:27, min:6, source:"ชีท · ฿540 / 20g" },
    { name:"Marukyu Yugen", unit:"g", qty:13, cost:34, min:6, source:"ชีท · ฿680 / 20g" },
    { name:"Hoho Hojicha", unit:"g", qty:30, cost:15.3, min:8, source:"ชีท · ฿459 / 30g" },
    { name:"Goodmate oat milk", unit:"ml", qty:1000, cost:.095, min:300, source:"ซื้อแล้ว · ฿95 / 1,000ml" },
    { name:"MM Milk", unit:"ml", qty:0, cost:.0535, min:600, source:"หมดแล้ว · ราคาอ้างอิงชีท ฿107 / 2,000ml" },
    { name:"Fresh milk (กินเอง)", unit:"ml", qty:0, cost:.05874, min:0, source:"฿48.75 / 830ml · ไม่ใช้เป็นสต็อกร้าน" },
    { name:"Coconut water", unit:"ml", qty:1000, cost:.115, min:300, source:"อัปเดตผู้ใช้ · ฿115 / L" },
    { name:"Syrup", unit:"ml", qty:800, cost:.06018, min:150, source:"ชีท · ฿48.15 / 800ml" },
    { name:"Nutella spread", unit:"g", qty:200, cost:.47, min:80, source:"ซื้อแล้ว · ฿94 / 200g" },
    { name:"Biscoff spread", unit:"g", qty:400, cost:.465, min:60, source:"ชีท · ฿186 / 400g · 15ml ใช้ 15g ชั่วคราวจนกว่าจะชั่งจริง" },
    { name:"Lotus Biscoff biscuit", unit:"g", qty:250, cost:.2762, min:40, source:"บิลสุทธิ ฿69.05 / 250g" },
    { name:"12oz cup + lid set", unit:"set", qty:48, cost:2.772, min:12, source:"บิลสุทธิ · แก้วใช้แล้ว 2 ใบ" },
    { name:"22oz cup (free)", unit:"pc", qty:50, cost:0, min:12, source:"ของที่บ้าน · รอฝา 22oz" },
    { name:"Cold whisk pouch 200ml", unit:"pc", qty:49, cost:.99, min:12, source:"บิลสุทธิ · ใช้แล้ว 1 ใบ" },
    { name:"Cold whisk pouch 250ml", unit:"pc", qty:50, cost:.99, min:12, source:"บิลสุทธิ" },
    { name:"3oz topping cup", unit:"pc", qty:50, cost:.8, min:10, source:"บิลสุทธิ ฿147 (จัดสรรส่วนลด)" },
    { name:"Topping tray 98mm", unit:"pc", qty:100, cost:1.07, min:20, source:"บิลสุทธิ ฿147 (จัดสรรส่วนลด)" },
    { name:"Cream roll — Hojicha", unit:"pc", qty:22, cost:10.4545, min:4, source:"บิลสุทธิ ฿460 (จัดสรรส่วนลด)" },
    { name:"Cream roll — Matcha", unit:"pc", qty:22, cost:10.4545, min:4, source:"บิลสุทธิ ฿460 (จัดสรรส่วนลด)" },
    { name:"Cup bag 12×11+1", unit:"pc", qty:125, cost:.76, min:25, source:"ซื้อแล้ว · ฿95 / 125 ใบ" },
    { name:"Cup bag 6×11", unit:"pc", qty:125, cost:.4, min:25, source:"ซื้อแล้ว · ฿50 / 125 ใบ" },
    { name:"Earl Grey jelly powder", unit:"g", qty:14, cost:.6429, min:3, source:"บิลสุทธิ · ฿9 / 14g (เมนูยังไม่เปิด)" },
    { name:"6mm straw", unit:"pc", qty:50, cost:.15, min:10, source:"บิลสุทธิ · ฿7.50 / 50 ชิ้น" },
    { name:"Coconut foam mix", unit:"serve", qty:20, cost:null, min:5, source:"Mock stock · รอกรอกทุนจริง" }
  ],
  sales: [],
  history: [{ at: today(), type:"adjust", title:"ตั้งต้นข้อมูลในเครื่อง", detail:"นำค่าผง/ต้นทุนจากชีท + น้ำมะพร้าว ฿115/L", delta:"—" }]
});
let state = defaultState();
let activeMode = "customer", activeTab = "menu";
let selection = { kind:"drink", menuId:null, powder:"noko", milk:"M Milk", sweetness:5, brew:"clear", size:"12", channel:"store", qty:1 };

/* Persistence bridge: app.js never touches localStorage.  Every mutation
   calls save(), which re-renders and notifies main.js to write to Supabase. */
function save(){
  render();
  window.dispatchEvent(new CustomEvent("kifun:state-changed", { detail: state }));
}
/** Replace the whole in-memory state (used by main.js after Supabase load). */
function setState(next){
  state = next || defaultState();
  state.hiddenMenuIds ??= [];
  state.customMenus ??= [];
  state.menuStatus ??= {};
  seedHomeEditor();
  applyHomeEditor();
  render();
}
function getMenu(id){ return menus.find(m => m.id === id); }
function getStock(name){ return state.stock.find(s => s.name === name); }
function stockAvailable(name, amount){ const row=getStock(name); return row && row.qty >= amount; }
function legacyPowderChoices(menu){
  if(menu.type === "premium") return ["horii","marukyu"];
  if(menu.type === "hojicha") return ["hojicha"];
  return ["noko","sukito","mie"];
}
function legacyMilkRecipe(milk, ml){
  if(milk === "Mixed!") return [{name:"MM Milk",qty:ml*.6},{name:"Goodmate oat milk",qty:ml*.4}];
  if(milk === "Fresh milk") return [{name:"MM Milk",qty:ml}];
  return [{name:"Goodmate oat milk",qty:ml}];
}
function legacyMilkCost(milk, ml){
  if(milk === "Mixed!") return ml*(.6*.0283+.4*.095);
  return ml*(milk === "Fresh milk" ? .0283 : .095);
}
function legacyRecipe(menu, powderKey, milk, sweetness, brew="clear"){
  const p=powders[powderKey], sweet = menu.sweetness ? sweetness : 0;
  const powderG=menu.id==="premium"&&brew!=="clear"?5:menu.powderG;
  let items=[{name:p.stock, qty:powderG}];
  let known=menu.ingredientKnown !== false, other=menu.baseCost;
  if(menu.id === "latte") { items.push(...milkRecipe(milk,195),{name:"Syrup",qty:sweet},{name:"12oz cup + lid set",qty:1}); other=milkCost(milk,195)+sweet*.06018+2.772; }
  if(menu.id === "nutella") { items.push(...milkRecipe(milk,100),{name:"Nutella spread",qty:30},{name:"12oz cup + lid set",qty:1}); other=milkCost(milk,100)+30*.47+2.772; }
  if(menu.id === "coconut" || menu.id === "coconutfoam") { items.push(...milkRecipe(milk,menu.oat),{name:"Coconut water",qty:menu.coconut},{name:"Syrup",qty:sweet},{name:"12oz cup + lid set",qty:1}); other=milkCost(milk,menu.oat)+menu.coconut*.115+sweet*.06018+2.772; if(menu.foam){items.push({name:"Coconut foam mix",qty:1});known=false;} }
  if(menu.id === "clear") { items.push({name:"Syrup",qty:sweet},{name:"12oz cup + lid set",qty:1}); other=2.772+sweet*.06018; }
  if(menu.id === "coldwhisk") { items.push(...milkRecipe(milk,150),{name:"Syrup",qty:sweet},{name:"Cold whisk pouch 200ml",qty:1}); other=milkCost(milk,150)+sweet*.06018+.99; }
  if(menu.id === "hojicha") { items.push(...milkRecipe(milk,195),{name:"Syrup",qty:sweet},{name:"12oz cup + lid set",qty:1}); other=milkCost(milk,195)+sweet*.06018+2.772; }
  if(menu.id === "premium") {
    if(brew === "clear") { items.push({name:"Syrup",qty:sweet},{name:"12oz cup + lid set",qty:1}); other=2.772+sweet*.06018; }
    if(brew === "latte") { items.push(...milkRecipe(milk,195),{name:"Syrup",qty:sweet},{name:"12oz cup + lid set",qty:1}); other=milkCost(milk,195)+sweet*.06018+2.772; }
    if(brew === "coldwhisk") { items.push(...milkRecipe(milk,150),{name:"Syrup",qty:sweet},{name:"Cold whisk pouch 200ml",qty:1}); other=milkCost(milk,150)+sweet*.06018+.99; }
  }
  return { items, powderG, cost:p.cost*powderG+other, known };
}
function legacyCalc(menu, powderKey=selection.powder, milk=selection.milk, sweetness=selection.sweetness, brew=selection.brew){
  const p=powders[powderKey]; let price=menu.base+(p.priceAdd||0);
  if(menu.id === "premium") price = powderKey === "marukyu" ? ({clear:299,latte:349,coldwhisk:369}[brew]) : ({clear:259,latte:319,coldwhisk:339}[brew]);
  if(milk === "Mixed!" && menu.milk && !(menu.id === "premium" && brew === "clear")) price+=10;
  const r=recipe(menu,powderKey,milk,sweetness,brew); const net=price*(1-COMMISSION);
  return { price, ...r, profit: net-r.cost, net };
}
function isMenuAvailable(menu){
  // Customer-facing availability is an explicit business decision.  Stock rows
  // can be incomplete while a menu is still sellable, so only the menu switch
  // is allowed to close it here.
  return state.menuStatus[menu.id] !== false;
}
function drinkVisual(menu){
  const style = menu.id === "nutella" ? "nutella" : menu.id === "clear" ? "clear" : menu.id === "coconut" ? "coconut" : menu.id === "coconutfoam" ? "foam" : menu.id === "hojicha" ? "hojicha" : menu.id === "premium" ? "premium" : "milk";
  return `<span class="drink-visual" aria-hidden="true"><span class="cup-lid"></span><span class="cup ${style}"></span></span>`;
}

function render(){
  document.querySelectorAll(".mode-btn").forEach(b=>b.classList.toggle("active",b.dataset.mode===activeMode));
  document.querySelector("#customer-view").classList.toggle("active",activeMode==="customer");
  document.querySelector("#admin-view").classList.toggle("active",activeMode==="admin");
  renderCustomer(); renderAdmin();
}
function legacyRenderCustomer(){
  const available=menus.filter(m=>state.menuStatus[m.id]).length;
  document.querySelector("#available-count").textContent=`พร้อมแสดง ${available} / ${menus.length} เมนู`;
  document.querySelector("#menu-grid").innerHTML=menus.map(m=>{
    const available=isMenuAvailable(m), c=calc(m,powderChoices(m)[0],"Oat milk",5,"clear");
    return `<button class="menu-card ${available?"":"sold-out"}" data-menu="${m.id}" ${available?"":"disabled"}>
      ${drinkVisual(m)}<div class="menu-art">${m.icon}</div><h3>${m.name}</h3><p>${m.description}</p>
      <div class="card-foot"><span class="from-price">เริ่ม ${money(c.price)}</span><span class="tag ${m.type==='premium'?'premium':''} ${available?'':'off'}">${available?m.tag:"ปิดขาย"}</span></div></button>`;
  }).join("");
  const empty=document.querySelector("#selection-empty"), custom=document.querySelector("#customizer");
  if(!selection.menuId){ empty.hidden=false; custom.hidden=true; return; }
  empty.hidden=true; custom.hidden=false; const m=getMenu(selection.menuId); const c=calc(m);
  const pChoices=powderChoices(m).map(key=>{const p=powders[key], ok=stockAvailable(p.stock,m.powderG); return `<button class="choice ${selection.powder===key?"active":""} ${ok?"":"unavailable-choice"}" data-choice="powder" data-value="${key}" ${ok?"":"disabled"}>${p.label}<small>${p.note}${p.priceAdd?` · +${money(p.priceAdd)}`:""}</small></button>`}).join("");
  const sweetness=m.sweetness?[0,5,7].map(v=>`<button class="choice ${selection.sweetness===v?"active":""}" data-choice="sweetness" data-value="${v}">${v===0?"ไม่หวาน":v===5?"หวานน้อย":"หวานปกติ"}<small>${v?` ${v}g`:""}</small></button>`).join(""):"<span class=\"muted\">เมนูนี้หวานจากส่วนผสมอยู่แล้ว</span>";
  const brew=m.type==="premium"?["clear","latte","coldwhisk"].map(v=>`<button class="choice ${selection.brew===v?"active":""}" data-choice="brew" data-value="${v}">${v==="clear"?"Clear":v==="latte"?"Latte":"Cold Whisk"}</button>`).join(""):"";
  const clearPremium=m.type==="premium"&&selection.brew==="clear";
  const milk=m.milk&&!clearPremium? ["Oat milk","Mixed!","Fresh milk"].map(v=>{const needs=v==="Mixed!"?["MM Milk","Goodmate oat milk"]:v==="Fresh milk"?["MM Milk"]:["Goodmate oat milk"]; const ok=needs.every(n=>getStock(n)?.qty>0);return `<button class="choice ${selection.milk===v?"active":""} ${ok?"":"unavailable-choice"}" data-choice="milk" data-value="${v}" ${ok?"":"disabled"}>${v}${v==="Mixed!"?" +฿10":""}<small>${v==="Mixed!"?"นมวัว 60% + โอ๊ต 40%":v==="Fresh milk"?"MM Milk หมด · ซื้อเข้าได้ที่สต็อก":""}</small></button>`}).join(""):"<span class=\"muted\">เสิร์ฟแบบ Clear ไม่ใส่นม</span>";
  custom.innerHTML=`<div class="customizer-title"><div><h2>${m.name}</h2><p>${m.thai} · ${m.art}</p></div><span class="tag ${m.type==='premium'?'premium':''}">${m.tag}</span></div>
    ${brew?`<div class="option-group"><label>1 · วิธีชง</label><div class="choice-list">${brew}</div></div>`:""}
    <div class="option-group"><label>${brew?2:1} · รสชาติของชา</label><div class="choice-list">${pChoices}</div></div>
    <div class="option-group"><label>${brew?3:2} · Sweetness</label><div class="choice-list">${sweetness}</div></div>
    <div class="option-group"><label>${brew?4:3} · Milk</label><div class="choice-list">${milk}</div></div>
    <div class="price-box"><div><small>ราคารวม ${selection.qty>1?`× ${selection.qty}`:""}</small><div class="price">${money(c.price*selection.qty)}</div></div><div class="qty-row"><button class="qty-btn" data-qty="-1">−</button><b>${selection.qty}</b><button class="qty-btn" data-qty="1">+</button></div></div>
    <button class="primary-btn" id="preview-price">ดูสรุปราคา (ไม่สั่งจริง)</button>
    <p class="customizer-note">ต้นทุนขั้นต่ำ ${money(c.cost)} / แก้ว${c.known?` · กำไรหลัง GP โดยประมาณ ${money(c.profit)}`:" · มีต้นทุนบางรายการรอยืนยัน"}</p>`;
}
function legacyRenderAdmin(){
  const revenue=state.sales.reduce((a,s)=>a+s.price*s.qty,0), profit=state.sales.reduce((a,s)=>a+s.profit*s.qty,0), low=state.stock.filter(s=>s.qty<=s.min).length;
  document.querySelector("#kpi-row").innerHTML=`<div class="kpi emphasis"><small>ยอดขายที่บันทึก</small><b>${money(revenue)}</b></div><div class="kpi"><small>กำไรหลัง GP (ประมาณ)</small><b>${money(profit)}</b></div><div class="kpi"><small>จำนวนแก้ว</small><b>${state.sales.reduce((a,s)=>a+s.qty,0)}</b></div><div class="kpi"><small>สต็อกต้องดู</small><b>${low} รายการ</b></div>`;
  document.querySelectorAll(".tab-btn").forEach(b=>b.classList.toggle("active",b.dataset.tab===activeTab));
  const out=document.querySelector("#admin-content");
  if(activeTab==="menu") out.innerHTML=menuTab();
  if(activeTab==="sales") out.innerHTML=salesTab();
  if(activeTab==="stock") out.innerHTML=stockTab();
  if(activeTab==="equipment") out.innerHTML=equipmentTab();
}
function legacyMenuTab(){return `<div class="panel"><div class="panel-head"><div><h2>เมนูที่แสดงฝั่งลูกค้า</h2><p>ปิดเมนูแล้วลูกค้าจะเห็นสถานะปิดขายทันที</p></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>เมนู</th><th>ราคาเริ่ม</th><th>ต้นทุนฐาน</th><th>กำไรหลัง GP</th><th>สถานะ</th></tr></thead><tbody>${menus.map(m=>{const c=calc(m,powderChoices(m)[0],"Oat milk",5,"clear"),on=state.menuStatus[m.id];return `<tr><td><b>${m.name}</b><small class="muted">${m.art}</small></td><td>${money(c.price)}</td><td>${money(c.cost)}${c.known?"":"*"}</td><td class="${c.known?"profit-good":"profit-wait"}">${c.known?money(c.profit):"รอยืนยันบางต้นทุน"}</td><td><button class="switch ${on?"on":""}" data-toggle-menu="${m.id}" aria-label="${on?"ปิด":"เปิด"} ${m.name}"><span></span></button> ${on?"เปิดขาย":"ปิดขาย"}</td></tr>`}).join("")}</tbody></table></div><p class="muted" style="font-size:11px;margin:15px 0 0">* Coconut foam ยังมีวัตถุดิบบางส่วนรอยืนยันทุนจริง</p></div>`;}
function legacySalesTab(){
  const rows=state.sales.length?state.sales.slice().reverse().map(s=>`<tr><td>${s.at}</td><td><b>${s.menu}</b><br><small>${s.powder} · ${s.sweetness}g</small></td><td>${s.qty}</td><td>${money(s.price*s.qty)}</td><td class="${s.known?"profit-good":"profit-wait"}">${s.known?money(s.profit*s.qty):"รอต้นทุน"}</td></tr>`).join(""):`<tr><td colspan="5" class="muted">ยังไม่มีรายการ — บันทึกขายตัวอย่างได้จากแถบด้านบน</td></tr>`;
  return `<div class="split-grid"><div class="panel"><div class="panel-head"><div><h2>บันทึกขายจริง</h2><p>กดบันทึกแล้วตัดผง นม และแพ็กตามสูตรทันที</p></div></div><form id="sale-form" class="sale-form"><select name="menu">${menus.map(m=>`<option value="${m.id}">${m.name}</option>`).join("")}</select><select name="powder"><option value="noko">NOKO</option><option value="sukito">Sukito +15</option><option value="mie">Mie</option><option value="horii">Horii</option><option value="marukyu">Marukyu</option><option value="hojicha">Hoho Hojicha</option></select><select name="brew"><option value="clear">Clear</option><option value="latte">Latte</option><option value="coldwhisk">Cold Whisk</option></select><input name="qty" type="number" min="1" value="1" aria-label="จำนวน"/><button class="primary-btn">บันทึกขาย</button></form><p class="muted" style="font-size:12px">ใช้หวานน้อย 5g เป็นค่าเริ่มต้น; Premium เลือก Clear / Latte / Cold Whisk ได้</p></div><div class="panel"><div class="panel-head"><div><h2>หลักคำนวณ</h2><p>อ้างอิงค่าซื้อจริงล่าสุด</p></div></div><p class="muted">ค่าหักแพลตฟอร์ม <b>32.1%</b> · Goodmate oat <b>฿0.095/ml</b> · Mixed! <b>+฿10</b> · น้ำมะพร้าว <b>฿0.115/ml</b></p><p class="muted">MM Milk หมดแล้ว จึงเลือก Mixed!/นมวัวไม่ได้จนกว่าจะบันทึกซื้อเข้า</p></div></div><div class="panel" style="margin-top:20px"><div class="panel-head"><div><h2>ประวัติการขาย</h2><p>${state.sales.length} รายการบันทึกแล้ว</p></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>เวลา</th><th>รายการ</th><th>แก้ว</th><th>ยอดขาย</th><th>กำไรหลัง GP</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}
function stockTab(){
 const options=state.stock.map(s=>`<option value="${s.name}">${s.name} (${s.unit})</option>`).join("");
 return `<div class="split-grid"><div class="panel"${""}"><div class="panel-head"><div><h2>เพิ่มสต็อก / ซื้อเข้า</h2><p>ใช้สำหรับบันทึกของมาถึงหรือปรับยอดนับจริง</p></div></div><form id="purchase-form" class="stock-form"><select name="name">${options}</select><input name="qty" type="number" min="0.1" step="0.1" value="1" aria-label="จำนวน"/><input name="note" placeholder="เช่น ซื้อเข้า / นับใหม่"/><button class="primary-btn">เพิ่ม</button></form></div><div class="panel"><div class="panel-head"><div><h2>ตัดสต็อก / ใช้ไป</h2><p>สำหรับของใช้ไปโดยไม่ใช่ขาย เช่น ชงเทสต์ แตกหัก หรือของเสีย</p></div></div><form id="deduct-form" class="stock-form"><select name="name">${options}</select><input name="qty" type="number" min="0.1" step="0.1" value="1" aria-label="จำนวน"/><input name="note" placeholder="เช่น ชงเทสต์ / แตกหัก / ใช้ไป"/><button class="primary-btn danger-btn">ตัดสต็อก</button></form></div></div><div class="panel" style="margin-top:20px"><div class="panel-head"><div><h2>เพิ่มรายการใหม่ / ผง / อุปกรณ์</h2><p>เพิ่มชื่อวัตถุดิบ อุปกรณ์ หรือแพ็กเกจจิ้งใหม่เข้าสต็อก</p></div></div><form id="new-item-form" class="stock-form new-item-form"><input name="name" required placeholder="ชื่อรายการใหม่ (เช่น Hojicha 30g)"><input name="unit" required placeholder="หน่วย (เช่น g / ml / pc)" value="g"><input name="qty" type="number" min="0" step="0.1" value="0" aria-label="จำนวนเริ่มต้น"><input name="cost" type="number" min="0" step="0.001" placeholder="ต้นทุน ฿/หน่วย"><input name="min" type="number" min="0" step="0.1" value="0" aria-label="ขั้นต่ำ"><button class="primary-btn">เพิ่มรายการ</button></form></div><div class="panel" style="margin-top:20px"><div class="panel-head"><div><h2>สถานะสต็อก</h2><p>ปุ่ม − / + ปรับทีละ 1 หน่วย</p></div></div>${state.stock.map(s=>`<div class="stock-row"><div><b>${s.name}</b><small>${s.source}</small></div><div class="stock-unit">${s.unit}</div><div class="${s.qty<=s.min?"ล<":""}"><b>${Number(s.qty.toFixed(1))}</b> ${s.qty<=s.min?"ต่ำ":""}</div><div class="stock-cost">${s.cost==null?"รอทุนจริง":money(s.cost)+"/"+s.unit}</div><div class="stock-actions"><button class="mini-btn" data-stock="${s.name}" data-delta="-1">−</button><button class="mini-btn" data-stock="${s.name}" data-delta="1">+</button></div></div>`).join("")}</div></div><div class="panel" style="margin-top:20px"><div class="panel-head"><div><h2>ประวัติการเคลื่อนไหว</h2><p>5 รายการล่าสุดจากการขาย ซื้อเข้า หรือปรับยอด</p></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>เวลา</th><th>ประเภท</th><th>รายละเอียด</th><th>เปลี่ยนแปลง</th></tr></thead><tbody>${state.history.slice().reverse().slice(0,12).map(h=>`<tr><td>${h.at}</td><td><span class="history-type ${h.type}">${h.type==="sale"?"ขาย":h.type==="purchase"?"ซื้อเข้า":"ปรับ"}</span></td><td><b>${h.title}</b><br><small>${h.detail}</small></td><td>${h.delta}</td></tr>`).join("")}</tbody></table></div></div>`;
}
function equipmentTab(){const items=[
 ["แก้ว 12oz + ฝา + หลอด", "ต้นทุนสุทธิ ฿2.772 / ชุด · ใช้ถ่ายรูปแล้ว 2 ชุด", "มี 48 ชุด"],
 ["แก้ว 22oz ฟรี 50 ใบ", "ไม่คิดต้นทุนแก้ว แต่ยังต้องซื้อ/ยืนยันฝา 22oz", "รอฝา 22oz"],
 ["ถุง Cold Whisk 200/250ml", "ต้นทุนสุทธิ ฿0.99 / ใบ · ถุง 200ml ใช้แล้ว 1", "มี 99 ใบ"],
 ["ถาดท็อปปิ้ง + ถ้วย 3oz", "ถาด ฿1.07 / ใบ · ถ้วย ฿0.80 / ใบ หลังจัดสรรจากบิลสุทธิ ฿147", "พร้อมใช้"],
 ["Bar mat กันลื่น", "เงินลงทุนความสวยงาม ฿281 ไม่เฉลี่ยลงต่อแก้ว", "พร้อมใช้"],
 ["Cream roll Hojicha / Matcha", "ต้นทุนสุทธิ ฿10.45 / ชิ้น หลังส่วนลด · 22 ชิ้น/รส", "พร้อมขายเป็นขนม"],
 ["Coconut foam setup", "เพิ่มต้นทุนจริงเมื่อเลือกวัตถุดิบและชั่งต่อเสิร์ฟ", "ต้องเทสต์"],
 ];return `<div class="panel"><div class="panel-head"><div><h2>อุปกรณ์ & แพ็ก</h2><p>เช็กลิสต์ก่อนเปิดขายจริง — ไม่ตัดสต็อกจากการบันทึกขาย</p></div></div>${items.map(([a,b,c])=>`<div class="equipment-card"><div><h3>${a}</h3><p>${b}</p></div><span class="badge ${c.includes("รอ")||c.includes("ต้อง")?"wait":""}">${c}</span></div>`).join("")}<div class="panel" style="margin-top:16px;background:var(--pale)"><h2 style="font-size:16px">ก่อนเปิดขายจริง</h2><p class="muted">เทสต์ Cold Whisk หลังพัก 10–15 นาที, ตรวจฝา/แพ็ก, และกรอกต้นทุน Nutella กับ Coconut foam ที่ชั่งจริง เพื่อให้กำไรในระบบยืนยันได้ครบ</p></div></div>`;}

function changeStock(name, delta, type="adjust", note="ปรับยอดด้วยปุ่ม"){
 const row=getStock(name); if(!row) return false; if(row.qty+delta<0){toast("สต็อกไม่พอสำหรับการตัดลด");return false;} row.qty=+(row.qty+delta).toFixed(2); state.history.push({at:today(),type,title:name,detail:note,delta:`${delta>0?"+":""}${delta} ${row.unit}`}); return true;
}
function legacyRecordSale(menuId,powderKey,qty=1,sweetness=5,brew="clear",milk="Oat milk"){
 const m=getMenu(menuId); if(!m || !powderChoices(m).includes(powderKey)){toast("ผงชานี้ใช้กับเมนูนี้ไม่ได้");return;}
 const c=calc(m,powderKey,milk,sweetness,brew); const r=recipe(m,powderKey,milk,sweetness,brew);
 const needs=r.items.map(x=>({ ...x, qty:x.qty*qty })); const unavailable=needs.find(x=>!stockAvailable(x.name,x.qty));
 if(unavailable){toast(`สต็อก ${unavailable.name} ไม่พอ`);return;}
 needs.forEach(x=>changeStock(x.name,-x.qty,"sale",`${m.name} × ${qty}`));
 state.sales.push({at:today(),menu:m.name,powder:powders[powderKey].label,qty,price:c.price,profit:c.profit,known:c.known,sweetness});
 state.history.push({at:today(),type:"sale",title:`บันทึกขาย ${m.name}`,detail:`${powders[powderKey].label} · ${brew} · ${qty} แก้ว`,delta:`-${r.powderG*qty}g ผง`}); save(); toast("บันทึกขายและตัดสต็อกแล้ว");
}
function toast(message){const t=document.querySelector("#toast");t.textContent=message;t.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove("show"),2600)}
function preview(){const m=getMenu(selection.menuId),c=calc(m),alias=homeAlias(selection.powder); const d=document.querySelector("#action-dialog");d.innerHTML=`<div class="dialog-inner"><h2>${m.name}</h2><p>${esc(alias.name)} · ${selection.milk} · หวาน ${m.sweetness?selection.sweetness+"ml":"ตามสูตร"}</p><div class="price-box"><div><small>ราคา mockup เท่านั้น</small><div class="price">${money(c.price*selection.qty)}</div></div><b>× ${selection.qty}</b></div><p>${c.known?`ต้นทุนตามข้อมูลที่ยืนยันได้ ${money(c.cost)} / แก้ว และกำไรหลัง GP โดยประมาณ ${money(c.profit)} / แก้ว`:`ต้นทุนขั้นต่ำนับจากข้อมูลในชีท ${money(c.cost)} / แก้ว แต่ยังมีวัตถุดิบบางตัวรอยืนยันทุนจริง`}</p><div class="dialog-actions"><button class="secondary-btn" id="close-dialog">ปิด</button></div></div>`;d.showModal();}

/* -------------------------------------------------------------------------
   Opening update — 10 Aug 2026.  The workbook is the price/stock source;
   the user-confirmed coconut recipe below overrides its older coconut row.
---------------------------------------------------------------------------*/
Object.assign(powders.noko, { note:"Nishio · ถั่วนุ่ม · ครีมมี่ · umami เบา ๆ", taste:"ดื่มแล้วออกถั่วนุ่ม ครีมมี่ และ umami เบา ๆ — กลมเมื่อใส่นม" });
Object.assign(powders.sukito, { note:"Floral · ครีมมี่ · ถั่วทองในนม", taste:"กลิ่น floral; มีฝาดคล้ายเปลือกฝรั่ง แต่ในนมจะครีมมี่และมีโน้ตถั่วทอง" });
Object.assign(powders.mie, { note:"Umami · nutty · smooth", taste:"umami, nutty, balanced, หวานเบา ๆ และ smooth — คล้าย Clear Matcha ของ Kamu" });
Object.assign(powders.horii, { note:"Uji · สด · savory นุ่ม", taste:"หอมชาโม่สด, umami, savory นุ่ม และขมปลายเล็กน้อย" });
Object.assign(powders.marukyu, { note:"Uji · grassy · umami", taste:"grassy, balanced umami และ mild bitterness" });
Object.assign(powders.hojicha, { note:"Roasted · nutty · cocoa", taste:"กลิ่นคั่วนุ่ม, nutty และ cocoa-like" });
Object.assign(powders, {
  lumi:{label:"Tokocha Shizuoka Okumidori",stock:"Tokocha Shizuoka Okumidori",priceAdd:0,cost:35.9,note:"Pistachio · white chocolate",taste:"pistachio, white chocolate, umami, creamy และ refreshing"},
  silk:{label:"Tokocha Yame Dania",stock:"Tokocha Yame Dania",priceAdd:0,cost:34.5,note:"Ricotta-like · creamy",taste:"ricotta-like, rich, smooth, creamy; เข้ากับมะพร้าว และไม่ใช่โทนคั่ว/ถั่ว"}
});
Object.assign(powders, {
  mori:{label:"Harusaki Oku no Mori",stock:"Harusaki Oku no Mori",priceAdd:0,cost:20.7666666667,note:"Clean · bright · gentle umami",taste:"สดใส สะอาด มี umami นุ่ม และหวานธรรมชาติ"},
  yameReserve:{label:"Yame no Shiro",stock:"Yame no Shiro",priceAdd:0,cost:19.75,note:"Roasted nut · buttery · creamy",taste:"กลิ่นถั่วอบ เนื้อครีมมี่คล้ายเนย และ umami สมดุล"}
});
Object.assign(powders.horii,{priceAdd:0});
Object.assign(powders.marukyu,{priceAdd:0});
Object.assign(powders.lumi,{priceAdd:0});
Object.assign(powders.silk,{priceAdd:0});
menus.splice(0, menus.length,
  {id:"latte",name:"Matcha Latte",thai:"มัทฉะลาเต้",icon:"🥛",base:99,lineman:149,powderG:5,type:"base",milk:true,sweetness:true,sizes:["12","22"],art:"12oz: 5g · น้ำ 50ml · นม 100ml",description:"นมวัวเป็น base; เปลี่ยนเป็นนมโอ๊ตได้",tag:"Daily"},
  {id:"biscoff",name:"Biscoff Matcha Latte",thai:"มัทฉะลาเต้บิสคอฟ",icon:"🍪",base:89,lineman:129,powderG:5,type:"base",milk:false,fixedMilk:true,sweetness:false,art:"12oz · Matcha 5g · น้ำ 50ml · oat milk 135ml · Biscoff spread 15ml",description:"Biscoff เข้ม นมโอ๊ตนุ่ม พร้อมขาย",tag:"Ready",biscoff:true},
  {id:"nutella",name:"Nutella Matcha Latte",thai:"มัทฉะลาเต้นูเทลล่า",icon:"🍫",base:149,lineman:199,powderG:5,type:"base",milk:false,fixedMilk:true,sweetness:false,art:"12oz · Matcha 5g · น้ำร้อน 50ml · นม 100ml · Nutella 20g",description:"นูเทลล่าเข้มข้นกับมัทฉะนุ่ม ๆ",tag:"Ready",nutella:true},
  {id:"coconut",name:"Cloudy Coconut Matcha",thai:"มัทฉะมะพร้าวคลาวดี้",icon:"🥥",base:95,lineman:125,powderG:4,type:"base",milk:false,sweetness:true,art:"Matcha 4g · น้ำมะพร้าว 135ml · oat milk 65ml · Sweetness 4 levels",description:"มะพร้าวสดและ oat milk เย็นจัด — พร้อมขาย",tag:"Ready",coconut:true},
  {id:"coconutfoam",name:"Coconut Foam Matcha",thai:"มัทฉะโฟมมะพร้าว",icon:"☁️",base:95,lineman:125,powderG:4,type:"base",milk:false,sweetness:true,art:"Matcha 4g · น้ำมะพร้าว 135ml · oat milk 65ml · Sweetness 4 levels",description:"สูตร coconut ของร้าน เนื้อนุ่มและเย็นจัด",tag:"Ready",coconut:true,foam:true},
  {id:"clear",name:"Clear Matcha",thai:"เคลียร์มัทฉะ",icon:"🫧",base:65,lineman:99,powderG:3,type:"base",milk:false,sweetness:true,art:"3g · น้ำ 150ml",description:"ชาใสเย็นสำหรับอ่านรสของผง",tag:"Clear"},
  {id:"coldwhisk",name:"Cold Whisk Matcha",thai:"โคลด์วิสก์มัทฉะ",icon:"🌿",base:119,lineman:179,powderG:5,type:"base",milk:true,sweetness:true,art:"5g · oat 150ml · whisk 30+60+60",description:"ตีสดให้เนื้อนุ่มฟู",tag:"Hand whisk"},
  {id:"hojicha",name:"Hojicha Latte",thai:"โฮจิฉะลาเต้",icon:"🔥",base:179,lineman:269,powderG:4,type:"hojicha",milk:true,sweetness:true,art:"4g · milk 100ml",description:"กลิ่นคั่วนุ่ม คล้ายโกโก้และถั่ว",tag:"Roasted"},
  {id:"mori",name:"Harusaki Oku no Mori",thai:"ฮารุซากิ โอคุ โนะ โมริ",icon:"🌲",base:{clear:139,latte:219,coldwhisk:239},lineman:{clear:199,latte:319,coldwhisk:349},powderG:3,type:"premium",powderKey:"mori",milk:true,sweetness:true,art:"Clear 3g · Latte / Cold Whisk 5g",description:"สดใส สะอาด · umami นุ่ม · หวานธรรมชาติ",tag:"Limited"},
  {id:"yame-reserve",name:"Yame no Shiro",thai:"ยาเมะ โนะ ชิโระ",icon:"🌾",base:{clear:129,latte:149,coldwhisk:169},lineman:{clear:189,latte:219,coldwhisk:239},powderG:3,type:"premium",powderKey:"yameReserve",milk:true,sweetness:true,art:"Clear 3g · Latte / Cold Whisk 5g",description:"ถั่วอบ · buttery · เนื้อครีมมี่ · umami สมดุล",tag:"Limited"},
  {id:"uromi",name:"Horii Uji Mukashi",thai:"โฮริอิ อุจิ มุคาชิ",icon:"🍃",base:{clear:179,latte:219,coldwhisk:239},lineman:{clear:259,latte:319,coldwhisk:339},powderG:3,type:"premium",powderKey:"horii",milk:true,sweetness:true,art:"Clear 3g · Latte / Cold Whisk 5g",description:"ชาเขียวสด · umami · savory นุ่ม · ขมปลายเบา",tag:"Limited"},
  {id:"maromi",name:"Marukyu Yugen",thai:"มารุคิว ยูเก็น",icon:"✨",base:{clear:199,latte:259,coldwhisk:279},lineman:{clear:279,latte:379,coldwhisk:399},powderG:3,type:"premium",powderKey:"marukyu",milk:true,sweetness:true,art:"Clear 3g · Latte / Cold Whisk 5g",description:"เนียนนุ่ม · umami กลม · เขียวสดและขมบาง",tag:"Limited"},
  {id:"lumi",name:"Tokocha Shizuoka Okumidori",thai:"โทโคฉะ ชิซูโอกะ โอคุมิโดริ",icon:"💫",base:{clear:179,latte:229,coldwhisk:269},lineman:{clear:259,latte:329,coldwhisk:389},powderG:3,type:"premium",powderKey:"lumi",milk:true,sweetness:true,art:"Clear 3g · Latte / Cold Whisk 5g",description:"pistachio · white chocolate · creamy · สดชื่น",tag:"Limited"},
  {id:"silk",name:"Tokocha Yame Dania",thai:"โทโคฉะ ยาเมะ ดาเนีย",icon:"☁️",base:{clear:169,latte:219,coldwhisk:259},lineman:{clear:249,latte:319,coldwhisk:379},powderG:3,type:"premium",powderKey:"silk",milk:true,sweetness:true,art:"Clear 3g · Latte / Cold Whisk 5g",description:"นุ่มเข้ม · creamy · ricotta-like · เหมาะกับมะพร้าว",tag:"Limited"}
);
snacks.splice(0, snacks.length,
  {id:"cream-matcha",name:"Matcha Cream Roll",thai:"ครีมโรลมัทฉะ",icon:"🍰",base:39,lineman:59,stock:"Cream roll — Matcha",cost:10.4545,art:"คงเหลือ 21 ชิ้น",description:"ครีมโรลรสมัทฉะ"},
  {id:"cream-hojicha",name:"Hojicha Cream Roll",thai:"ครีมโรลโฮจิฉะ",icon:"🥮",base:39,lineman:59,stock:"Cream roll — Hojicha",cost:10.4545,art:"คงเหลือ 20 ชิ้น",description:"ครีมโรลรสโฮจิฉะ"}
);
function upsertStock(name, unit, qty, cost, min, source){ const found=getStock(name); if(found) Object.assign(found,{unit,qty,cost,min,source}); else state.stock.push({name,unit,qty,cost,min,source}); }
upsertStock("Cream roll — Matcha","pc",21,10.4545,4,"ยอดคงเหลือที่ปรับแล้ว");
upsertStock("Cream roll — Hojicha","pc",20,10.4545,4,"ยอดคงเหลือที่ปรับแล้ว");
upsertStock("MM Milk","ml",0,.0535,600,"หมดแล้ว · ราคาอ้างอิงชีท ฿107 / 2,000ml");
upsertStock("Fresh milk (กินเอง)","ml",830,.05874,0,"฿48.75 / 830ml · ไม่ใช่สต็อกร้าน");
upsertStock("Tokocha Shizuoka Okumidori","g",20,35.9,5,"Excel 9 Aug · ฿718 / 20g");
upsertStock("Tokocha Yame Dania","g",11,34.5,5,"20g minus logged 9g · ฿690 / 20g");
Object.assign(state.menuStatus, Object.fromEntries(menus.map(menu=>[menu.id, state.menuStatus[menu.id] ?? true])));
let menuChannel="store";

function validPowderKey(key){ return typeof key === "string" && Object.prototype.hasOwnProperty.call(powders,key); }
function powderChoices(menu){
  const choices = menu.powderKey ? [menu.powderKey] : menu.type==="hojicha" ? ["hojicha"] : ["noko","sukito","mie"];
  // Older saved custom menus can retain a deleted powder key.  One invalid
  // record must never prevent every card in the customer menu from rendering.
  const valid = choices.filter(validPowderKey);
  return valid.length ? valid : ["noko"];
}
function milkRecipe(milk,ml){ if(milk==="Mixed!") return [{name:"MM Milk",qty:ml*.6},{name:"Goodmate oat milk",qty:ml*.4}]; if(milk==="M Milk" || milk==="Fresh milk") return [{name:"MM Milk",qty:ml}]; return [{name:"Goodmate oat milk",qty:ml}]; }
function milkCost(milk,ml){ const mCost = getStock("MM Milk")?.cost ?? getStock("M Milk")?.cost ?? 0.0485; const oCost = getStock("Goodmate oat milk")?.cost ?? 0.095; if(milk==="Mixed!") return ml*(.6*mCost+.4*oCost); if(milk==="M Milk" || milk==="Fresh milk" || milk==="MM Milk") return ml*mCost; return ml*oCost; }
function recipe(menu,powderKey,milk,sweetness,brew="clear",size="12"){
 const safeSize = size || selection.size || "12";
 const powder=powders[validPowderKey(powderKey)?powderKey:"noko"], sizeFactor=menu.id==="latte"&&safeSize==="22"?22/12:1, powderG=(menu.type==="premium"&&brew!=="clear"?5:Number(menu.powderG)||3)*sizeFactor, syrup=menu.sweetness?(Number(sweetness)||0)*sizeFactor:0;
 const items=[{name:powder.stock,qty:powderG}]; let other=2.772+syrup*.06018, known=true, note="";
 if(menu.id==="latte"){const milkMl=100*sizeFactor,packaging=2.772;items.push(...milkRecipe(milk,milkMl),{name:"Syrup",qty:syrup},{name:sizeFactor===1?"12oz cup + lid set":"22oz cup (free)",qty:1});other=milkCost(milk,milkMl)+syrup*.06018+packaging;}
 if(menu.id==="biscoff"){const oCost=getStock("Goodmate oat milk")?.cost??.095;items.push({name:"Goodmate oat milk",qty:135},{name:"Biscoff spread",qty:15},{name:"12oz cup + lid set",qty:1});other=135*oCost+15*.465+2.772;}
 if(menu.id==="nutella"){const mCost=getStock("MM Milk")?.cost??getStock("M Milk")?.cost??.0485;items.push({name:"MM Milk",qty:100},{name:"Nutella spread",qty:20},{name:"12oz cup + lid set",qty:1});other=100*mCost+20*.47+2.772;}
 if(menu.coconut){const cCost=getStock("Coconut water")?.cost??.115, oCost=getStock("Goodmate oat milk")?.cost??.095;items.push({name:"Coconut water",qty:135},{name:"Goodmate oat milk",qty:65},{name:"Syrup",qty:syrup},{name:"12oz cup + lid set",qty:1});other=135*cCost+65*oCost+syrup*.06018+2.772+(menu.id==="coconutfoam"?1.0659:0);}
 if(menu.id==="clear"){items.push({name:"Syrup",qty:syrup},{name:"12oz cup + lid set",qty:1});other=syrup*.06018+2.772;}
 if(menu.id==="coldwhisk"){items.push(...milkRecipe(milk,150),{name:"Syrup",qty:syrup},{name:"Cold whisk pouch 200ml",qty:1});other=milkCost(milk,150)+syrup*.06018+.99;}
 if(menu.id==="hojicha"){items.push(...milkRecipe(milk,100),{name:"Syrup",qty:syrup},{name:"12oz cup + lid set",qty:1});other=milkCost(milk,100)+syrup*.06018+2.772;}
 if(menu.type==="premium"){ if(brew==="clear"){items.push({name:"Syrup",qty:syrup},{name:"12oz cup + lid set",qty:1});other=syrup*.06018+2.772;} if(brew==="latte"){items.push(...milkRecipe(milk,145),{name:"Syrup",qty:syrup},{name:"12oz cup + lid set",qty:1});other=milkCost(milk,145)+syrup*.06018+2.772;} if(brew==="coldwhisk"){items.push(...milkRecipe(milk,150),{name:"Syrup",qty:syrup},{name:"Cold whisk pouch 200ml",qty:1});other=milkCost(milk,150)+syrup*.06018+.99;} }
 return {items,powderG,cost:powder.cost*powderG+other,known,note,sizeFactor};
}
function legacyMenuPrice(menu, brew = "clear", channel = "store") {
  const configured = channel === "lineman" ? menu.lineman : menu.base;

  if (typeof configured === "number") {
    return configured;
  }

  if (configured && typeof configured === "object") {
    return Number(configured[brew] ?? configured.clear ?? 0);
  }

  return 0;
}
function legacyCalc2(menu,powderKey=selection.powder,milk=selection.milk,sweetness=selection.sweetness,brew=selection.brew,channel=selection.channel||menuChannel){ const p=powders[powderKey],price=menuPrice(menu,brew,channel)+(p.priceAdd||0),r=recipe(menu,powderKey,milk,sweetness,brew),net=channel==="lineman"?price*(1-COMMISSION):price;return {price,...r,net,profit:net-r.cost}; }
function renderCustomer(){
 document.querySelectorAll(".channel-btn").forEach(button=>button.classList.toggle("active",button.dataset.channel===menuChannel));
 const available=menus.filter(menu=>state.menuStatus[menu.id]).length;document.querySelector("#available-count").textContent=`พร้อมแสดง ${available}/${menus.length} เมนู · ${menuChannel==="store"?"หน้าร้าน":"LINE MAN"}`;
 document.querySelector("#menu-grid").innerHTML=menus.map(menu=>{const available=isMenuAvailable(menu),c=calc(menu,powderChoices(menu)[0],"M Milk",menu.coconut?5:5,"clear",menuChannel);return `<button class="menu-card ${available?"":"sold-out"}" data-menu="${menu.id}" ${available?"":"disabled"}>${drinkVisual(menu)}<div class="menu-art">${menu.icon}</div><h3>${esc(menu.name)}</h3><p>${esc(menu.description)}</p><div class="card-foot"><span class="from-price">เริ่ม ${money(c.price)}</span><span class="tag ${menu.type==='premium'?'premium':''}">${available?menu.tag:"ปิดขาย"}</span></div></button>`;}).join("");
 document.querySelector("#snack-grid").innerHTML=snacks.map(snack=>`<article class="menu-card"><div class="menu-art">${snack.icon}</div><h3>${esc(snack.name)}</h3><p>${esc(snack.description)}</p><div class="card-foot"><span class="from-price">${money(menuChannel==="lineman"?snack.lineman:snack.base)}</span><span class="tag">${esc(snack.art)}</span></div></article>`).join("");
 const empty=document.querySelector("#selection-empty"),custom=document.querySelector("#customizer");if(!selection.menuId){empty.hidden=false;custom.hidden=true;return;}empty.hidden=true;custom.hidden=false;const menu=getMenu(selection.menuId),c=calc(menu);
 const choices=powderChoices(menu).map(key=>{const powder=powders[key],alias=homeAlias(key),ok=stockAvailable(powder.stock,menu.id==="premium"&&selection.brew!=="clear"?5:menu.powderG);return `<button class="choice ${selection.powder===key?"active":""} ${ok?"":"unavailable-choice"}" data-choice="powder" data-value="${key}" ${ok?"":"disabled"}><b>${esc(alias.name)}</b><small>${esc(alias.note)}</small></button>`;}).join("");
 const sweet=menu.sweetness?(menu.coconut?[0,3,5,7]:[0,5,7]).map(value=>`<button class="choice ${selection.sweetness===value?"active":""}" data-choice="sweetness" data-value="${value}">${value===0?"ไม่หวาน":`หวาน ${value}ml`}</button>`).join(""):"<span class=\"muted\">สูตรนี้ล็อก sweetness</span>";
  const brew=menu.type==="premium"?["clear","latte","coldwhisk"].map(value=>`<button class="choice ${selection.brew===value?"active":""}" data-choice="brew" data-value="${value}">${value==="clear"?"Clear":value==="latte"?"Latte":"Cold Whisk"}</button>`).join(""):"";
  const sizes=menu.sizes?menu.sizes.map(value=>`<button class="choice ${selection.size===value?"active":""}" data-choice="size" data-value="${value}">${value}oz<small>${value==="12"?"5g · น้ำ 50ml · นม 100ml":"9.2g · น้ำ 92ml · นม 183ml"}</small></button>`).join(""):"";
  const noMilk=!menu.milk||(menu.type==="premium"&&selection.brew==="clear");const milk=noMilk?`<span class="muted">${menu.fixedMilk?"สูตรล็อกตามเมนู":menu.coconut?"oat milk เย็นจัด 65ml อยู่ในสูตรทุกแก้ว":"เสิร์ฟแบบไม่ใส่นม"}</span>`:["M Milk","Oat milk","Mixed!"].map(value=>{const needs=value==="Oat milk"?["Goodmate oat milk"]:value==="Mixed!"?["MM Milk","Goodmate oat milk"]:["MM Milk"],ok=needs.every(name=>getStock(name)?.qty>0);return `<button class="choice ${selection.milk===value?"active":""} ${ok?"":"unavailable-choice"}" data-choice="milk" data-value="${value}" ${ok?"":"disabled"}>${value}<small>${value==="Oat milk"?"+฿15 หน้าร้าน / +฿20 LINE MAN":value==="Mixed!"?"+฿10 หน้าร้าน / +฿15 LINE MAN":"นมวัวฐาน · ของหมดชั่วคราว"}</small></button>`;}).join("");
  const formula=menu.id==="latte"?(selection.size==="22"?"22oz · Matcha 9.2g · น้ำร้อน 92ml · นม 183ml · ความหวานสเกลตามขนาด":"12oz · Matcha 5g · น้ำร้อน 50ml · นม 100ml"):menu.coconut?"Matcha 4g · น้ำมะพร้าวสด 135ml · oat milk เย็นจัด 65ml · syrup 0 / 3 / 5 / 7ml":menu.art;
  custom.innerHTML=`<div class="customizer-title"><div><h2>${menu.name}</h2><p>${formula}</p></div><span class="tag">${menu.tag}</span></div>${sizes?`<div class="option-group"><label>1 · ขนาดแก้ว</label><div class="choice-list">${sizes}</div></div>`:""}${brew?`<div class="option-group"><label>${sizes?2:1} · วิธีชง</label><div class="choice-list">${brew}</div></div>`:""}<div class="option-group"><label>${sizes||brew?3:1} · Matcha Taste — ดื่มแล้วรู้สึกอะไร</label><div class="choice-list taste-choices">${choices}</div></div><div class="option-group"><label>Sweetness</label><div class="choice-list">${sweet}</div></div><div class="option-group"><label>Milk</label><div class="choice-list">${milk}</div></div><div class="price-box"><div><small>${menuChannel==="lineman"?"LINE MAN · รวมค่าคอมฯ แล้ว":"หน้าร้าน · ราคาปกติ"}</small><div class="price">${money(c.price*selection.qty)}</div></div><div class="qty-row"><button class="qty-btn" data-qty="-1">−</button><b>${selection.qty}</b><button class="qty-btn" data-qty="1">+</button></div></div><button class="primary-btn" id="preview-price">ดูสรุปสูตรและราคา</button><p class="customizer-note">ต้นทุนประมาณ ${money(c.cost)} / แก้ว · กำไร ${money(c.profit)}${c.note||""}</p>`;
}
function menuTab(){return `<div class="panel"><div class="panel-head"><div><h2>เมนูขาย — หน้าร้าน และ LINE MAN</h2><p>ราคา LINE MAN รวม GP + VAT ของ GP 32.1% แล้ว</p></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>เมนู + สูตร</th><th>หน้าร้าน</th><th>LINE MAN</th><th>ต้นทุน</th><th>สถานะ</th></tr></thead><tbody>${menus.map(menu=>{const p=powderChoices(menu)[0],store=calc(menu,p,"Oat milk",menu.coconut?5:5,"clear","store"),app=calc(menu,p,"Oat milk",menu.coconut?5:5,"clear","lineman"),on=state.menuStatus[menu.id];return `<tr><td><b>${menu.name}</b><small class="muted">${menu.art}</small></td><td><b>${money(store.price)}</b><small>กำไร ${money(store.profit)}</small></td><td><b>${money(app.price)}</b><small>หลัง GP ${money(app.profit)}</small></td><td>${money(store.cost)}</td><td><button class="switch ${on?"on":""}" data-toggle-menu="${menu.id}"><span></span></button> ${on?"เปิดขาย":"ปิดขาย"}</td></tr>`;}).join("")}</tbody></table></div><div class="recipe-callout"><b>สูตร Coconut ที่ล็อก</b><span>Matcha 4g · น้ำมะพร้าวสด 135ml · oat milk เย็นจัด 65ml · syrup 0 / 3 / 5 / 7ml · ราคาเริ่มต้นหน้าร้าน ฿95 และ LINE MAN ฿125 (อ้างอิง Daia แล้วปรับได้ใน Home editor)</span></div></div>`;}
function salesTab(){const rows=state.sales.length?state.sales.slice().reverse().map(sale=>`<tr><td>${sale.at}</td><td><b>${sale.menu}</b><br><small>${sale.powder} · ${sale.channel==="lineman"?"LINE MAN":"หน้าร้าน"}</small></td><td>${sale.qty}</td><td>${money(sale.price*sale.qty)}</td><td class="profit-good">${money(sale.profit*sale.qty)}</td><td class="sale-actions"><button class="edit-btn" data-edit-sale="${sale.id}">แก้ไข</button><button class="danger-btn" data-delete-sale="${sale.id}">ลบ</button></td></tr>`).join(""):`<tr><td colspan="6" class="muted">ยังไม่มีรายการ</td></tr>`;return `<div class="split-grid"><div class="panel"><div class="panel-head"><div><h2>บันทึกขายจริง</h2><p>แก้ไข/ลบจะคืนสต็อกสูตรเดิมก่อน</p></div></div>${saleForm()}</div><div class="panel"><h2>หลักคำนวณ</h2><p class="muted">MM Milk 2L ฿101.50 ยังไม่ซื้อ (ซื้อ 14/08). นมสด ฿48.75 / 830ml เป็นของกินเล่น จึงแยกจากสต็อกร้าน.</p></div></div><div class="panel" style="margin-top:20px"><div class="panel-head"><div><h2>ประวัติการขาย</h2><p>${state.sales.length} รายการ · แก้ไขหรือลบได้</p></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>เวลา</th><th>รายการ</th><th>จำนวน</th><th>ยอดขาย</th><th>กำไร</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></div>`;}
function saleForm(sale){return `<form id="${sale?"edit-sale-v4":"sale-form-v4"}" class="sale-form"><select name="menuId">${menus.map(menu=>`<option value="${menu.id}" ${sale?.menuId===menu.id?"selected":""}>${menu.name}</option>`).join("")}</select><select name="powderKey">${Object.entries(powders).map(([key,powder])=>`<option value="${key}" ${sale?.powderKey===key?"selected":""}>${powder.label}</option>`).join("")}</select><select name="channel"><option value="store" ${sale?.channel==="store"?"selected":""}>หน้าร้าน</option><option value="lineman" ${sale?.channel==="lineman"?"selected":""}>LINE MAN</option></select><select name="brew"><option value="clear" ${sale?.brew==="clear"?"selected":""}>Clear</option><option value="latte" ${sale?.brew==="latte"?"selected":""}>Latte</option><option value="coldwhisk" ${sale?.brew==="coldwhisk"?"selected":""}>Cold Whisk</option></select><input name="qty" type="number" min="1" value="${sale?.qty||1}"><label class="sale-test-toggle"><input type="checkbox" name="testOnly" ${sale?.testOnly?"checked":""}> ชงเทสต์/กินเอง (ไม่ตัดแพ็กเกจจิ้ง)</label><button class="primary-btn">${sale?"บันทึกการแก้ไข":"บันทึกขาย"}</button></form>`;}
function legacySupplierTab(){const cards=[
 ["Midori Shinsei MI02","Tester 30g · ฿260","nutty–sweet · ฝาดต่ำ","House Latte / Clear / Cold Whisk","แนะนำซื้อเป็น BASE TESTER อันดับ 1 — blind test กับนมและเดลิเวอรี 20–30 นาที"],
 ["Midori Shinsei SM03","Tester 30g · ฿380","nutty–sweet · creamy","Signature option","ตัวเทียบอันดับ 2: ทดสอบ Latte 4.5g/5g และ Cold Whisk"],
 ["Midori Shinsei MI01","Tester 30g · ฿410","creamy · umami · sweet","Profile 1","ตัวเทียบอันดับ 3: ชิม Clear, นม และ Cold Whisk"],
 ["NOKO Premium Grade Nishio","100g · ฿371 · ฿3.71/g","nutty · creamy · umami เบา","House fallback","มี stock 100g ใช้เป็น base ชั่วคราวได้ แต่ยังไม่ใช่ base ที่ blind test ผ่าน"],
 ["Sukito Kagoshima 03","30g · ฿450 · ฿15/g","floral · ครีมมี่ · ถั่วทองในนม","Character option","เก็บไว้เป็นทางเลือก floral สำหรับ Latte / Cold Whisk"],
 ["HAKU Daily Uji Mellow","30g · ฿590","umami · mellow · creamy","Premium candidate","อย่าเอาไปกดราคาเป็น house base"],
 ["Tokocha Yame Dania (SILK)","20g · ฿690","ricotta-like · rich · creamy","Coconut pairing","Rare pairing; ไม่ใช่โทนคั่วหรือ nutty"]
];return `<div class="panel"><div class="panel-head"><div><h2>Supplier + Base selection</h2><p>คัดจาก Excel 9 ส.ค.; สีเขียวคือคำแนะนำสำหรับ next purchase</p></div></div><div class="supplier-grid">${cards.map((card,index)=>`<article class="supplier-card ${index===0?"recommended":""}">${index===0?"<span class=\"base-pick\">BASE PICK · ซื้อ tester ก่อน</span>":""}<div class="supplier-top"><div><h3>${card[0]}</h3><p>${card[1]}</p></div></div><p class="taste-note"><b>รส:</b> ${card[2]}</p><p>${card[3]}</p><small>${card[4]}</small></article>`).join("")}</div><div class="recipe-callout"><b>สรุปที่เชียร์</b><span>ซื้อ Midori Shinsei MI02 เป็น tester base อันดับ 1 แล้วเทียบ SM03/MI01. เลือกเฉพาะตัวที่ยัง nutty–sweet ในนมและหลังเดลิเวอรี. ระหว่างนี้ NOKO เป็น fallback ที่ใช้งานได้จริง.</span></div></div>`;}
function renderAdmin(){const revenue=state.sales.reduce((sum,sale)=>sum+sale.price*sale.qty,0),profit=state.sales.reduce((sum,sale)=>sum+sale.profit*sale.qty,0),low=state.stock.filter(item=>item.qty<=item.min).length;document.querySelector("#kpi-row").innerHTML=`<div class="kpi emphasis"><small>ยอดขายที่บันทึก</small><b>${money(revenue)}</b></div><div class="kpi"><small>กำไรโดยประมาณ</small><b>${money(profit)}</b></div><div class="kpi"><small>จำนวนแก้ว/ชิ้น</small><b>${state.sales.reduce((sum,sale)=>sum+sale.qty,0)}</b></div><div class="kpi"><small>สต็อกต้องดู</small><b>${low} รายการ</b></div>`;document.querySelectorAll(".tab-btn").forEach(button=>button.classList.toggle("active",button.dataset.tab===activeTab));const out=document.querySelector("#admin-content");out.innerHTML=activeTab==="menu"?menuTab():activeTab==="sales"?salesTab():activeTab==="stock"?stockTab():activeTab==="suppliers"?supplierTab():equipmentTab();}
const PACKAGING_ITEMS = new Set(["12oz cup + lid set","22oz cup (free)","Cold whisk pouch 200ml","Cold whisk pouch 250ml","Cup bag 12×11+1","Cup bag 6×11","6mm straw","3oz topping cup","Topping tray 98mm"]);
function recordSale(menuId,powderKey,qty=1,sweetness=5,brew="clear",milk="Oat milk",channel="store",testOnly=false,size="12"){
 const menu=getMenu(menuId);
 if(!menu||!powderChoices(menu).includes(powderKey)){toast("ผงชานี้ใช้กับเมนูนี้ไม่ได้");return false;}
 const c=calc(menu,powderKey,milk,sweetness,brew,channel,size);
 const r=recipe(menu,powderKey,milk,sweetness,brew,size);
 const needs=r.items.map(item=>({...item,qty:item.qty*qty})).filter(item=>!testOnly||!PACKAGING_ITEMS.has(item.name));
 const missing=needs.find(item=>!stockAvailable(item.name,item.qty));
 if(missing){toast(`สต็อก ${missing.name} ไม่พอ`);return false;}
 needs.forEach(item=>changeStock(item.name,-item.qty,"sale",`${menu.name} × ${qty}`));
 state.sales.push({id:`sale-${Date.now()}-${Math.random().toString(16).slice(2)}`,at:today(),menuId,menu:menu.name,powderKey,powder:powders[powderKey].label,qty,price:c.price,profit:c.profit,known:true,sweetness,brew,milk,channel,testOnly,size,ingredients:needs});
 state.history.push({at:today(),type:"sale",title:`บันทึกขาย ${menu.name}`,detail:`${powders[powderKey].label} · ${channel==="lineman"?"LINE MAN":"หน้าร้าน"}${testOnly?" · เทสต์/กินเอง":""}`,delta:`-${r.powderG*qty}g ผง`});
 save();
 toast(testOnly?"บันทึกเทสต์/กินเอง (ตัดเฉพาะวัตถุดิบ)":"บันทึกขายและตัดสต็อกแล้ว");
 return true;
}
function restoreSale(id,action="ลบ"){const sale=state.sales.find(item=>item.id===id);if(!sale)return null;(sale.ingredients||[]).forEach(item=>changeStock(item.name,item.qty,"adjust",`${action}: ${sale.menu}`));state.sales=state.sales.filter(item=>item.id!==id);state.history.push({at:today(),type:"adjust",title:`${action} รายการขาย ${sale.menu}`,detail:"คืนสต็อกตามสูตรเดิม",delta:"คืนสต็อก"});return sale;}
function openSaleEditor(id){const sale=state.sales.find(item=>item.id===id);if(!sale)return;const dialog=document.querySelector("#action-dialog");dialog.dataset.editing=id;dialog.innerHTML=`<div class="dialog-inner"><h2>แก้ไขรายการขาย</h2><p>ระบบจะคืนสต็อกสูตรเดิม แล้วตัดตามข้อมูลใหม่เมื่อกดบันทึก</p>${saleForm(sale)}<div class="dialog-actions"><button class="secondary-btn" id="close-v4-dialog">ยกเลิก</button></div></div>`;dialog.showModal();}
/* Supplier intake — user update 10 Aug. Prices are THB/kg; 'incl. VAT' is
   stated where the supplier included it.  Package-only quotations stay blank. */
const supplierCatalog=[
 ["ONEDAY Matcha","YAME YP01",10500,"Yame · nutty, gentle, slight bitterness · latte / clear","Over cap"],
 ["Sukito","Cafe Latte",7900,"free tester · blend · slightly grassy / edamame / almond","Sweet spot"],
 ["Sukito","Tsuyuhikari Shiga",16585,"ceremonial · tester ฿247","Over cap"],["Sukito","Okumidori Shiga",14500,"ceremonial · tester ฿234","Over cap"],["Sukito","Uji for Latte",11770,"cafe grade · 1kg price incl. 7% VAT","Over cap"],["Sukito","Nama",11770,"cafe grade · 1kg price incl. 7% VAT","Over cap"],["Sukito","Kagoshima 03",11770,"cafe grade · 1kg price incl. 7% VAT","Over cap"],
 ["Shizuori","F01 Yame Nutty",15000,"nutty · slight floral · aromatic smoke","Over cap"],["Shizuori","K201 Yutakamidori",15000,"sold out · floral / seaweed / faint nutty / umami","Sold out"],["Shizuori","S01 Sayama Kaori",12000,"sold out · umami / floral / slight nutty / dense creamy body","Sold out"],["Shizuori","S02 Yabukita",12000,"sold out · denser creamy body · slight bitterness","Sold out"],["Shizuori","S05 Saeakari",15000,"sold out · bright / easy / faint floral","Sold out"],["Shizuori","S06 Tsuyuhikari",15000,"edamame · slight seaweed · medium body","Available"],
 ["Wazuka Cha","MC1 Kyoto Okumidori",11770,"ceremonial · incl. 7% VAT","Over cap"],["Wazuka Cha","MC2 Kyoto Kanayamidori",10700,"ceremonial · incl. 7% VAT","Over cap"],["Wazuka Cha","MC3 Kyoto Classic",4173,"all purpose · Okumidori + Kanayamidori · incl. VAT","Below target"],["Wazuka Cha","MC4 Kyoto Premium",5885,"premium · Okumidori + Kanayamidori · incl. VAT","Sweet spot"],["Wazuka Cha","MC5 Tokusen Okumidori",18725,"ceremonial · incl. VAT","Over cap"],["Wazuka Cha","MC13 Organic Yabukita",11770,"ceremonial · incl. VAT","Over cap"],["Wazuka Cha","MC14 Organic Zairai Blend",11770,"ceremonial · incl. VAT","Over cap"],["Wazuka Cha","MC46 Mountain Peak Okumidori",27820,"ceremonial · incl. VAT","Over cap"],
 ["Wazuka Cha","MC21 Yame Exclusive Saemidori",15515,"ceremonial · incl. VAT","Over cap"],["Wazuka Cha","MC22 Yame Excellent Saemidori + Yabukita",12840,"ceremonial · incl. VAT","Over cap"],["Wazuka Cha","MC23 Yame Premium Saemidori + Yabukita",7276,"premium · incl. 7% VAT","Sweet spot"],["Wazuka Cha","MC241 Yame Classic Special Blend",6206,"Yame blend · incl. 7% VAT","Sweet spot"],["Wazuka Cha","MC25 Yame Signature Saemidori + Okumidori",19795,"ceremonial · incl. VAT","Over cap"],["Wazuka Cha","MC27 Yame Medium Firing",9202,"premium · incl. VAT","Eligible"],["Wazuka Cha","MC28 Yame High Firing",10272,"premium · incl. VAT","Over cap"],["Wazuka Cha","MC283 Yame Nutty Roasted",6955,"premium · Okumidori + Yabukita · incl. VAT","Sweet spot"],["Wazuka Cha","MC29 Yame Rich",17655,"ceremonial · incl. VAT","Over cap"],["Wazuka Cha","MC30 Yame Intense Okumidori",16585,"ceremonial · incl. VAT","Over cap"],["Wazuka Cha","MC31 Hoshino Star",10486,"upper premium · incl. VAT","Over cap"],["Wazuka Cha","MC32 Hoshino Village",19795,"ceremonial · incl. VAT","Over cap"],["Wazuka Cha","MC33 Hoshino Signature",27820,"ceremonial · incl. VAT","Over cap"],["Wazuka Cha","MC34 Hoshino Special",34240,"ceremonial · incl. VAT","Over cap"],["Wazuka Cha","MC35 Hoshino Exclusive",18725,"ceremonial · incl. VAT","Over cap"],["Wazuka Cha","MC48 Kagoshima Chirancha",11770,"ceremonial · incl. VAT","Over cap"],["Wazuka Cha","MC482 Kagoshima Chirancha Premium",6634,"premium · incl. VAT","Sweet spot"],["Wazuka Cha","HC1 Hojicha Powder",5136,"hojicha · incl. VAT","Other"],["Wazuka Cha","D1 Daily Okumidori",10165,"daily · incl. VAT","Over cap"],["Wazuka Cha","D2 Daily Yame",8025,"daily · incl. VAT","Eligible"],
 ["SHIKA","Yame Ryouto",22000,"almond / malt / refreshing natural sweetness","Over cap"],["SHIKA","Yame Miku",17400,"nutty / almond / roasty","Over cap"],["SHIKA","Yame Toyoko",17200,"nutty / peanut / roasty","Over cap"],["SHIKA","Yame Ceremonial",26000,"pistachio / broad bean / light smoky","Over cap"],["SHIKA","Yame Yabukita",8500,"nutty · rich umami · naturally sweet · slight hot astringency","Eligible"],["SHIKA","Yame Gyokuro",8700,"nutty / peanut / green pea / creamy","Eligible"],["SHIKA","Yame Yumiko",7500,"nutty / green pea / mellow / roasted","Sweet spot"],["SHIKA","Yame Momoko",6500,"nutty / broad bean / mellow","Sweet spot"],["SHIKA","Yame Café",6250,"lightly nutty / seaweed / mellow / smooth","Sweet spot"],["SHIKA","Yame Houjicha",6350,"dark chocolate / caramel / roasted aroma","Other"],["SHIKA","Uji Gokou",19500,"white floral / broccoli / milky / creamy / slight seaweed","Over cap"],["SHIKA","Uji Okumidori",21000,"grassy / green pea / coconut / refreshing","Over cap"],["SHIKA","Uji Samidori",22000,"rosemary / avocado / chestnut / banana","Over cap"],["SHIKA","Uji Spring Blends",7800,"vegetal sweet / green peas / hazelnut / slight bitterness","Sweet spot"],["SHIKA","Kyoto Basic",5900,"seaweed / milky / bitterness","Sweet spot"],
 ["Midori Shinsei","FY04 Fukuoka Yabukita Blend",6500,"premium 4A","Sweet spot"],["Midori Shinsei","KU03 Kyoto Samidori + Okumidori Blend",7200,"premium 4A · tester ฿260","Sweet spot"],["Midori Shinsei","KU04 Kyoto Blend",6300,"premium 4A · tester ฿230","Sweet spot"],["Midori Shinsei","AN03 Aichi Yabukita Blend",5400,"premium 4A · tester ฿200","Sweet spot"],["Midori Shinsei","SA04 Shizuoka Okumidori",9800,"ceremonial 5A · tester ฿470","Eligible"],["Midori Shinsei","SA05 Ashikubo Blend",4900,"premium 4A · tester ฿190","Below target"],["Midori Shinsei","KC03 Kagoshima Haruto34 Blend",9900,"ceremonial 5A · tester ฿350","Eligible"],["Midori Shinsei","KS04 Kagoshima Seimei Blend",7200,"premium 4A · tester ฿260","Sweet spot"],["Midori Shinsei","KS05 Shibushi Blend",4200,"premium 4A · tester ฿155","Below target"],["Midori Shinsei","MI01 Mie Saemidori + Samidori + Okumidori",11700,"ceremonial 5A · tester ฿410","Over cap"],["Midori Shinsei","MI02 Mie Yabukita Blend",7200,"premium 4A · tester ฿260","Sweet spot"],["Midori Shinsei","MI03 Mie Blend",5400,"premium 4A · tester ฿200","Sweet spot"],["Midori Shinsei","SX01 China Blend",4700,"premium 4A · tester ฿110","Below target"],["Midori Shinsei","SX02 China Blend",2250,"premium 3A · tester ฿95","Below target"],
 ["Seasonal Matcha","Yameka",15500,"30g ฿480 / 100g ฿1,550","Over cap"],["Seasonal Matcha","Wakaba",15500,"30g ฿480 / 100g ฿1,550","Over cap"],["Seasonal Matcha","Kemuri",21000,"20g ฿440 / 100g ฿2,100","Over cap"],["Seasonal Matcha","Kobashi",21000,"20g ฿440 / 100g ฿2,100","Over cap"],["Seasonal Matcha","Kogashi",24500,"20g ฿510 / 100g ฿2,450","Over cap"],["Seasonal Matcha","Yamame",24500,"20g ฿510 / 100g ฿2,450","Over cap"],
 ["OSHA OCHA","Kagoshima P01",5270,"creamier rice milk / floral / nuts / avocado / mango sticky rice","Sweet spot"],["OSHA OCHA","Kagoshima C02",9000,"avocado / floral / roasted nut-rice","Eligible"],["OSHA OCHA","Kagoshima Gyokuro",11090,"creamy / steamed white fish / fruity","Over cap"],["OSHA OCHA","Yame Sancho",8500,"smooth roasted nut / green pea / savory","Eligible"],["OSHA OCHA","Yame Okumidori",15800,"smooth roast nut / fruity pear / buttery","Over cap"],["OSHA OCHA","Yame Saemidori",6990,"choco cream / nutty / avocado","Sweet spot"],["OSHA OCHA","Yame Yabukita",8500,"black roasted nut","Eligible"],["OSHA OCHA","Yame Sanji",6550,"roasted nut / ocean tone","Sweet spot"],["OSHA OCHA","Shizuoka Yabukita Organic",8815,"good balance / seaweed / fruity floral","Eligible"],["OSHA OCHA","Shizuoka Yabukita Culinary",4800,"seaweed / slight astringency","Below target"],["OSHA OCHA","Fuyu no Kaze",6990,"nori / avocado / fruity / creamy","Sweet spot"],["OSHA OCHA","Hajime Culinary",6990,"big grassy / slight bitter","Other"],["OSHA OCHA","Yame C01",11490,"roasted nut-rice / pistachio / fruity","Over cap"],["OSHA OCHA","Yame C02",15000,"macadamia / almond / vanilla / choco","Over cap"],["OSHA OCHA","Yame C03",10500,"nori / floral nutty / strong coconut","Over cap"],["OSHA OCHA","Yame C04",12700,"smooth roasted nuts / peanut / guava / fruity","Over cap"],["OSHA OCHA","Yame No.1",13900,"smoked wood / choco / nutty / floral","Over cap"],["OSHA OCHA","Yame Yabukita 1st",9950,"rich roasted nuts / cacao / vanilla / fruity","Eligible"],["OSHA OCHA","Saga Yabukita",10500,"coconut milk / avocado / almond","Over cap"],["OSHA OCHA","Saga Seimei",8590,"steamed rice / floral / fruity / avocado","Eligible"],
 ["Trial Matcha","Uji Heritage",29000,"100g ฿2,900","Over cap"],["Trial Matcha","Uji Ceremonial",15500,"100g ฿1,550","Over cap"],["Trial Matcha","Uji Premium",10200,"100g ฿1,020","Over cap"],["Trial Matcha","Uji Café",7200,"100g ฿720","Sweet spot"],["Trial Matcha","Yame Heritage Upper",28300,"100g ฿2,830","Over cap"],["Trial Matcha","Yame Premium",16200,"100g ฿1,620","Over cap"],["Trial Matcha","Yame Standard",14800,"100g ฿1,480","Over cap"],["Trial Matcha","Yame Café",13500,"100g ฿1,350","Over cap"],["Trial Matcha","Hoshinomura All Purpose",7200,"100g ฿720","Sweet spot"],["Trial Matcha","Nishio All Purpose",8900,"100g ฿890","Eligible"],["Trial Matcha","Organic Nishio Café",7200,"100g ฿720","Sweet spot"],["Trial Matcha","Ise Café",8500,"100g ฿850","Eligible"],["Trial Matcha","Kagoshima Ceremonial",14500,"100g ฿1,450","Over cap"],["Trial Matcha","Shizuoka Premium",12000,"100g ฿1,200","Over cap"],["Trial Matcha","Everyday Nutty Premium",16900,"100g ฿1,690","Over cap"],
 ["CHASEKI TEAHOUSE","Shunju Culinary",12515,"thin mouthfeel · fresh-cut grass · cacao / coconut","Over cap"],["CHASEKI TEAHOUSE","Kotobuki Culinary",13130,"fresh-cut grass · butter / dry green asparagus","Over cap"],["CHASEKI TEAHOUSE","Meian Culinary",13955,"dark chocolate · cacao nibs · vanilla","Over cap"],["CHASEKI TEAHOUSE","Masaru Culinary",5000,"slightly astringent · artichoke / green beans / pear","Sweet spot"],["CHASEKI TEAHOUSE","Yame no Takumi Ceremonial",16010,"slight astringency · fresh green notes / mild smoke","Over cap"],["CHASEKI TEAHOUSE","Yame no Wakaba Ceremonial",17445,"thin mouthfeel · grassy / edamame / peas","Over cap"],["CHASEKI TEAHOUSE","Yame no Nagomi Ceremonial",21760,"medium-thick · slightly smoky / hazelnut","Over cap"],["CHASEKI TEAHOUSE","Yame no Megumi Ceremonial",26480,"medium-heavy · milky / umami","Over cap"],["CHASEKI TEAHOUSE","Gyokuro Powder",7079,"floral / creamy sweet matcha","Eligible"],["CHASEKI TEAHOUSE","Minori Culinary",4000,"medium-light · green peas / slightly smoky","Below target"],["CHASEKI TEAHOUSE","Kakunin Culinary",2750,"autumn harvest · light green tea / nutty / cinnamon","Below target"],
 ["Kokoro Tea House","Sato Yame",null,"20g ฿590; edamame nutty / full body / very creamy in milk","Package price"],
 ["Okucha Matcha","Nishio / Aichi",null,"seaweed / roastnut / umami salty","Reference profile"],["Okucha Matcha","Honyama / Shizuoka",null,"seaweed / nutty / umami salty","Reference profile"],["Okucha Matcha","Uji / Kyoto",null,"seaweed / mellow / smooth-silky","Reference profile"],["Okucha Matcha","Shibushi / Kagoshima",null,"umami salty / bitter / smoky roast","Reference profile"],["Okucha Matcha","Yame / Fukuoka",null,"roastnut / malty / umami salty / mellow","Reference profile"]
];
function moneyKg(value){return value==null?"—":`฿${value.toLocaleString("th-TH")}/kg`;}
function supplierTab(){
 const picks=[
  ["OSHA OCHA · Kagoshima P01",5270,"Closest to your creamy avocado / mango-sticky-rice brief","Creamier rice milk · floral · nuts · avocado · mango sticky rice. This is the clearest flavour match and lives well inside budget; test its body in milk before calling it Home Base."],
  ["Wazuka Cha · MC283 Yame Nutty Roasted",6955,"Best Yame nutty-roasted value","Yame Okumidori + Yabukita, premium grade, about ฿6.96/g including VAT. This is the best direct lane toward nutty / roasted cacao / lightly smoky latte body."],
  ["Sukito · Cafe Latte",7900,"Best operational test","Free tester, 1kg ฿7,900 incl. VAT; grassy / edamame / almond. It is not the exact avocado profile, but makes a very practical comparison for milk."],
  ["SHIKA · Yame Momoko",6500,"Nutty-mellow comparison","Nutty / broad bean / mellow at ฿6.5/g. Good low-risk reference against P01 and MC283."],
  ["OSHA OCHA · Yame Saemidori",6990,"Creamy avocado alternative","Choco cream / nutty / avocado at ฿6.99/g. A strong alternative if P01 is too rice-forward."],
  ["Midori Shinsei · MI02",7200,"Tester-friendly comparator","Mie Yabukita blend, ฿7.2/g with ฿260 tester. Sensory note needs testing, so it is a comparator—not a claimed winner."]
 ];
 const vendors=[...new Set(supplierCatalog.map(row=>row[0]))];
 return `<div class="panel supplier-panel"><div class="panel-head"><div><h2>Supplier library + Home Base shortlist</h2><p>ครบ ${vendors.length} suppliers · ${supplierCatalog.length} รายการที่ส่งมา · คัดตาม Sweet Spot ฿5–8k/kg และเพดาน ฿10k/kg</p></div></div><div class="profile-callout"><b>Profile ที่กำลังหา</b><span>1) creamy avocado + nutty sweet + floral เบา ๆ เมื่อลงนมให้นึกถึงข้าวเหนียวมะม่วง  2) Yame-style macadamia / avocado + roasted cacao + lightly smoky butter สำหรับลาเต้</span></div><div class="supplier-grid">${picks.map((pick,index)=>`<article class="supplier-card recommended"><span class="base-pick">${index===0?"TOP FLAVOUR MATCH":index===1?"TOP YAME VALUE":"SHORTLIST"}</span><div class="supplier-top"><div><h3>${pick[0]}</h3><p>${moneyKg(pick[1])} · ${pick[2]}</p></div></div><small>${pick[3]}</small></article>`).join("")}</div><div class="recipe-callout"><b>ข้อสรุปการซื้อ</b><span>อย่าตัดสินจาก note อย่างเดียว: ซื้อ/ขอ tester ของ <strong>P01 + MC283 + Sukito Cafe Latte</strong> ก่อน แล้ว blind test Latte 4g/5g, Cold Whisk 5g และพักเดลิเวอรี 20–30 นาที. Home Base ต้องเลือกจากรสที่ยังแน่นและนุ่มหลังลงนม ไม่ใช่แค่ราคาต่อกิโล.</span></div><div class="supplier-filters"><button class="choice active" data-supplier-filter="shortlist">Shortlist</button><button class="choice" data-supplier-filter="eligible">≤ ฿10k/kg</button><button class="choice" data-supplier-filter="all">ทั้งหมด</button></div><div id="supplier-catalog-table"></div></div>`;
}
function renderSupplierCatalog(filter="shortlist"){
 const out=document.querySelector("#supplier-catalog-table");if(!out)return;
 const shortlistNames=new Set(["Kagoshima P01","MC283 Yame Nutty Roasted","Cafe Latte","Yame Momoko","Yame Saemidori","MI02 Mie Yabukita Blend"]);
 const rows=supplierCatalog.filter(row=>{
   if(filter==="all") return true;
   if(filter==="eligible") return row[2]!=null && row[2]<=10000;
   return shortlistNames.has(row[1]);
 });
 out.innerHTML=`<div class="table-wrap supplier-table"><table class="data-table"><thead><tr><th>Supplier</th><th>ชา / SKU</th><th>ราคา</th><th>โน้ต / สถานะ</th></tr></thead><tbody>${rows.map(row=>`<tr><td><b>${row[0]}</b></td><td>${row[1]}</td><td>${moneyKg(row[2])}</td><td>${row[3]} <span class="supplier-status ${row[4].includes("Sweet")||row[4]==="Eligible"?"fit":""}">${row[4]}</span></td></tr>`).join("")}</tbody></table></div><p class="muted" style="font-size:11px">ราคาเป็น snapshot จากข้อมูลที่ส่งวันนี้; รายการ Sold out/Over cap อยู่ใน “ทั้งหมด” เพื่อเก็บ reference แต่ไม่ถูกเสนอเป็น Home Base.</p>`;
}
const renderAdminV5=renderAdmin;renderAdmin=function(){renderAdminV5();if(activeTab==="suppliers")renderSupplierCatalog();};
/* Home is private-facing too: names, copy and prices are intentionally editable
   from the panel and the customer view only receives the house codenames. */
const defaultHomeAliases={
 noko:{name:"KOME",note:"เนียนนุ่ม · ถั่วอ่อน · umami เบา"},
 sukito:{name:"YAME",note:"floral บาง · ครีมมี่ · ถั่วทอง"},
 mie:{name:"SORA",note:"smooth · umami ชัด · nutty · หวานเบา"},
 mori:{name:"Harusaki Oku no Mori",note:"สดใส · umami นุ่ม · หวานธรรมชาติ"},
 yameReserve:{name:"Yame no Shiro",note:"ถั่วอบ · buttery · creamy"},
 horii:{name:"Horii Uji Mukashi",note:"ชาเขียวสด · umami · savory นุ่ม"},
 marukyu:{name:"Marukyu Yugen",note:"เนียนนุ่ม · umami กลม · ขมบาง"},
 lumi:{name:"Tokocha Shizuoka Okumidori",note:"pistachio · white chocolate · creamy"},
 silk:{name:"Tokocha Yame Dania",note:"ricotta-like · rich · creamy"},
 hojicha:{name:"KOGASHI",note:"roasted · nutty · cocoa-like"}
};
function seedHomeEditor(){
 state.home??={};state.home.brand??={mark:"🍃",name:"KIFUN",subline:"MATCHA"};state.home.hero??={eyebrow:"KIFUN MATCHA · PRIVATE MENU",title:"เลือกชาในแบบของคุณ",subtitle:"เมนูส่วนตัวของร้าน · ปรับแก้ได้จาก Control panel",status:"เปิดรับชมเมนู"};
  state.home.aliases??=structuredClone(defaultHomeAliases);state.home.menus??={};
  menus.forEach(menu=>{
    if (state.home.menus[menu.id]) return;
    const common={name:menu.name,thai:menu.thai,description:menu.description,tag:menu.tag,recipe:menu.art,emoji:menu.icon,image:menu.image||""};
    state.home.menus[menu.id]=typeof menu.base === "object"
      ? {...common,storeClear:menu.base.clear,storeLatte:menu.base.latte,storeColdWhisk:menu.base.coldwhisk,appClear:menu.lineman?.clear,appLatte:menu.lineman?.latte,appColdWhisk:menu.lineman?.coldwhisk}
      : {...common,store:menu.base,lineman:menu.lineman};
  });
}
function applyHomeEditor() {
  seedHomeEditor();

  menus.forEach((menu) => {
    const edit = state.home.menus[menu.id];
    if (!edit) return;

    Object.assign(menu, {
      name: edit.name || menu.name,
      thai: edit.thai || menu.thai,
      description: edit.description || menu.description,
      tag: edit.tag || menu.tag,
      art: edit.recipe || menu.art,
      icon: edit.emoji || menu.icon,
      image: edit.image || ""
    });

    if (typeof menu.base === "object") {
      menu.base = {
        ...menu.base,
        clear: Number(edit.storeClear ?? menu.base.clear),
        latte: Number(edit.storeLatte ?? menu.base.latte),
        coldwhisk: Number(edit.storeColdWhisk ?? menu.base.coldwhisk)
      };

      menu.lineman = {
        ...menu.lineman,
        clear: Number(edit.appClear ?? menu.lineman.clear),
        latte: Number(edit.appLatte ?? menu.lineman.latte),
        coldwhisk: Number(edit.appColdWhisk ?? menu.lineman.coldwhisk)
      };
    } else {
      menu.base = Number(edit.store ?? menu.base);
      menu.lineman = Number(edit.lineman ?? menu.lineman);
    }
  });
}
function homeAlias(key){return state.home.aliases[key]||defaultHomeAliases[key]||{name:"MATCHA TEST",note:"house matcha"};}
if (state.schemaVersion !== 2) {
  // The earlier v6 draft stored placeholder premium names in Home overrides.
  // Remove only those generated overrides once, then seed the real product copy.
  if (state.home) {
    state.home.menus = {};
    state.home.aliases = structuredClone(defaultHomeAliases);
  }
  state.schemaVersion = 2;
}
applyHomeEditor();
function legacyHomeEditorTab(){
 const h=state.home.hero,b=state.home.brand;
 return `<div class="panel home-editor"><div class="panel-head"><div><h2>แก้หน้า Home</h2><p>ทุกช่องนี้เปลี่ยนหน้าเมนูทันทีในเบราว์เซอร์เครื่องนี้; ชื่อ supplier จะไม่ปรากฏฝั่ง Home</p></div></div><form id="home-editor-form"><section class="edit-section"><h3>ชื่อร้านและหัวหน้า Home</h3><div class="editor-grid"><label>สัญลักษณ์ร้าน<input name="brand-mark" value="${esc(b.mark)}"></label><label>ชื่อร้าน<input name="brand-name" value="${esc(b.name)}"></label><label>คำใต้ชื่อร้าน<input name="brand-subline" value="${esc(b.subline)}"></label><label>Eyebrow<input name="hero-eyebrow" value="${esc(h.eyebrow)}"></label><label>หัวเรื่อง<input name="hero-title" value="${esc(h.title)}"></label><label>คำอธิบาย<input name="hero-subtitle" value="${esc(h.subtitle)}"></label><label>สถานะ<input name="hero-status" value="${esc(h.status)}"></label></div></section><section class="edit-section"><h3>เมนู ราคา และสูตร</h3><div class="table-wrap"><table class="data-table editor-table"><thead><tr><th>เมนู</th><th>ชื่อไทย / คำอธิบาย</th><th>หน้าร้าน</th><th>LINE MAN</th><th>สูตรที่แสดง</th><th>Tag</th></tr></thead><tbody>${menus.map(menu=>{const edit=state.home.menus[menu.id];return `<tr><td><input name="menu-${menu.id}-name" value="${esc(edit.name)}"><small>${menu.id}</small></td><td><input name="menu-${menu.id}-thai" value="${esc(edit.thai)}"><input name="menu-${menu.id}-description" value="${esc(edit.description)}"></td><td><input name="menu-${menu.id}-store" type="number" min="0" value="${edit.store}"></td><td><input name="menu-${menu.id}-lineman" type="number" min="0" value="${edit.lineman}"></td><td><input name="menu-${menu.id}-recipe" value="${esc(edit.recipe)}"></td><td><input name="menu-${menu.id}-tag" value="${esc(edit.tag)}"></td></tr>`;}).join("")}</tbody></table></div></section><section class="edit-section"><h3>รหัส Matcha Test ที่ลูกค้าเห็น</h3><p class="muted">แก้รหัสและ taste note ได้ แต่ชื่อผงจริง/ชื่อ supplier จะไม่ขึ้นหน้า Home</p><div class="alias-editor">${Object.entries(defaultHomeAliases).map(([key,fallback])=>{const alias=homeAlias(key);return `<label><small>${key}</small><input name="alias-${key}-name" value="${esc(alias.name)}"><input name="alias-${key}-note" value="${esc(alias.note)}"></label>`;}).join("")}</div></section><button class="primary-btn">บันทึกหน้า Home</button></form></div>`;
}
const renderAdminV6=renderAdmin;renderAdmin=function(){renderAdminV6();if(activeTab==="homeedit")document.querySelector("#admin-content").innerHTML=homeEditorTab();};
function maskHomeSupplierNames(){
 const customer=document.querySelector("#customer-view");if(!customer)return;const h=state.home.hero;
 const heading=customer.querySelector(".customer-head h1"),sub=customer.querySelector(".customer-head .muted"),eyebrow=customer.querySelector(".customer-head .eyebrow"),status=customer.querySelector(".status-pill"),brandName=document.querySelector("#brand-name"),brandSubline=document.querySelector("#brand-subline"),brandMark=document.querySelector("#brand-mark");if(heading)heading.textContent=h.title;if(sub)sub.textContent=h.subtitle;if(eyebrow)eyebrow.textContent=h.eyebrow;if(status)status.innerHTML=`<i></i> ${esc(h.status)}`;if(brandName)brandName.textContent=state.home.brand.name;if(brandSubline)brandSubline.textContent=state.home.brand.subline;if(brandMark)brandMark.textContent=state.home.brand.mark;document.title=`${state.home.brand.name} — Menu & Control Panel`;
 customer.querySelectorAll(".taste-choices .choice").forEach(button=>{const key=button.dataset.value,alias=homeAlias(key),title=button.querySelector("b"),note=button.querySelector("small");if(title)title.textContent=alias.name;if(note)note.textContent=alias.note;});
}
const renderCustomerV7=renderCustomer;renderCustomer=function(){renderCustomerV7();maskHomeSupplierNames();};
supplierCatalog.push(
 ["Santipanich","Mie Matcha Ceremonial Grade",9800,"50g ฿520 · 100g ฿1,010 · 200g ฿1,990 · 500g ฿4,900 · 1kg ฿9,800; smooth body · clear umami · nutty · lightly sweet · long clean finish","Eligible"],
 ["Sukito","Cafe Latte — factory update",7900,"free tester · body denser than the small 100g pack (฿1,100–1,200); bulk price becomes lower","Sweet spot"]
);
/* -------------------------------------------------------------------------
   Single current UI layer — menu lifecycle, backup and editable Home prices.
---------------------------------------------------------------------------*/
state.hiddenMenuIds ??= [];
state.customMenus ??= [];
state.customMenus.forEach((menu) => {
  if (!menus.some((item) => item.id === menu.id)) menus.push(menu);
});
Object.assign(state.menuStatus, Object.fromEntries(menus.map((menu) => [menu.id, state.menuStatus[menu.id] ?? true])));
seedHomeEditor();
applyHomeEditor();

const isHiddenMenu = (menu) => state.hiddenMenuIds.includes(menu.id);
/** Update just one menu's image URL in state (called by main.js after
    the photo has been uploaded to Supabase Storage). */
function setMenuImage(menuId, url) {
  state.home.menus[menuId] ??= {};
  state.home.menus[menuId].image = url;
  applyHomeEditor();
  render();
  window.dispatchEvent(new CustomEvent("kifun:state-changed", { detail: state }));
}
const menuArt = (menu) => menu.image
  ? `<img class="menu-image" src="${esc(menu.image)}" alt="${esc(menu.name)}">`
  : esc(menu.icon || "🍵");

const renderCustomerV8 = renderCustomer;
renderCustomer = function () {
  renderCustomerV8();
  document.querySelectorAll("[data-menu]").forEach((card) => {
    const menu = getMenu(card.dataset.menu);
    if (!menu) return;
    card.hidden = isHiddenMenu(menu);
    const art = card.querySelector(".menu-art");
    if (art) art.innerHTML = menuArt(menu);
  });
  const visibleCount = menus.filter((menu) => !isHiddenMenu(menu) && state.menuStatus[menu.id]).length;
  const count = document.querySelector("#available-count");
  if (count) count.textContent = `พร้อมแสดง ${visibleCount}/${menus.filter((menu) => !isHiddenMenu(menu)).length} เมนู · ${menuChannel === "store" ? "หน้าร้าน" : "LINE MAN"}`;
};

menuTab = function () {
  const rows = menus.map((menu) => {
    const powder = powderChoices(menu)[0];
    const price = calc(menu, powder, "M Milk", menu.coconut ? 5 : 5, "clear", "store");
    const profits = [0.679, 0.55, 0.4].map((rate) => money(price.price * rate - price.cost)).join(" / ");
    const hidden = isHiddenMenu(menu);
    return `<tr class="${hidden ? "menu-hidden-row" : ""}">
      <td><div class="menu-art table-menu-art">${menuArt(menu)}</div></td>
      <td><b>${esc(menu.name)}</b><small class="muted">${esc(menu.art)}</small></td>
      <td>${money(price.price)}</td><td>${money(price.cost)}</td>
      <td class="profit-good">${profits}<br><small>67.9% / 55% / 40%</small></td>
      <td><button class="switch ${state.menuStatus[menu.id] ? "on" : ""}" data-toggle-menu="${esc(menu.id)}"><span></span></button></td>
      <td><button class="${hidden ? "edit-btn" : "danger-btn"}" data-menu-visibility="${esc(menu.id)}">${hidden ? "กู้คืน" : "ซ่อนเมนู"}</button></td>
    </tr>`;
  }).join("");
  return `<div class="panel"><div class="panel-head"><div><h2>จัดการเมนู</h2><p>ซ่อนเมนูจะไม่ลบข้อมูล และกู้คืนได้ทุกเมื่อ</p></div><div class="menu-tools"><button class="secondary-btn" id="export-data">Export JSON</button><label class="secondary-btn">Import JSON<input id="data-import" type="file" accept="application/json" hidden></label></div></div>
    <div class="table-wrap"><table class="data-table"><thead><tr><th></th><th>เมนู + สูตร</th><th>ราคาเริ่ม</th><th>ต้นทุน</th><th>กำไรสุทธิ</th><th>เปิดขาย</th><th>การแสดงผล</th></tr></thead><tbody>${rows}</tbody></table></div>
    <form id="add-menu-form" class="add-menu-form"><h3>เพิ่มเมนูใหม่</h3><input name="name" required placeholder="ชื่ออังกฤษ"><input name="thai" placeholder="ชื่อไทย"><input name="emoji" value="🍵" aria-label="Emoji"><input name="store" type="number" min="0" required placeholder="ราคาหน้าร้าน"><input name="lineman" type="number" min="0" required placeholder="ราคา LINE MAN"><input name="description" placeholder="คำอธิบาย"><input name="tag" placeholder="Tag"><button class="primary-btn">เพิ่มเมนู</button></form>
  </div>`;
};

function homeEditorTab() {
  const h = state.home.hero, b = state.home.brand;
  const priceCells = (menu, edit) => typeof menu.base === "object"
    ? `<td><input name="menu-${menu.id}-store-clear" type="number" min="0" value="${edit.storeClear ?? menu.base.clear}"></td><td><input name="menu-${menu.id}-store-latte" type="number" min="0" value="${edit.storeLatte ?? menu.base.latte}"></td><td><input name="menu-${menu.id}-store-coldwhisk" type="number" min="0" value="${edit.storeColdWhisk ?? menu.base.coldwhisk}"></td><td><input name="menu-${menu.id}-app-clear" type="number" min="0" value="${edit.appClear ?? menu.lineman.clear}"></td><td><input name="menu-${menu.id}-app-latte" type="number" min="0" value="${edit.appLatte ?? menu.lineman.latte}"></td><td><input name="menu-${menu.id}-app-coldwhisk" type="number" min="0" value="${edit.appColdWhisk ?? menu.lineman.coldwhisk}"></td>`
    : `<td colspan="3"><label>หน้าร้าน<input name="menu-${menu.id}-store" type="number" min="0" value="${edit.store ?? menu.base}"></label></td><td colspan="3"><label>LINE MAN<input name="menu-${menu.id}-lineman" type="number" min="0" value="${edit.lineman ?? menu.lineman}"></label></td>`;
  const rows = menus.map((menu) => {
    const edit = state.home.menus[menu.id];
    return `<tr><td><input name="menu-${menu.id}-name" value="${esc(edit.name)}"><small>${esc(menu.id)}</small></td><td><input name="menu-${menu.id}-thai" value="${esc(edit.thai)}"><input name="menu-${menu.id}-description" value="${esc(edit.description)}"></td><td><input name="menu-${menu.id}-emoji" value="${esc(edit.emoji ?? menu.icon)}"></td><td><input name="menu-${menu.id}-recipe" value="${esc(edit.recipe)}"></td><td><input name="menu-${menu.id}-tag" value="${esc(edit.tag)}"></td>${priceCells(menu, edit)}<tr class="image-row"><td colspan="5"><label>รูปเมนู URL<input name="menu-${menu.id}-image" value="${esc(edit.image ?? "")}" placeholder="https://…"></label><label>หรือไฟล์ในเครื่อง (ปรับไม่เกิน 640×640 อัตโนมัติ)<input data-image-file="${esc(menu.id)}" type="file" accept="image/*"></label></td><td colspan="6">${edit.image ? `<img class="editor-preview" src="${esc(edit.image)}" alt="">` : ""}</td></tr>`;
  }).join("");
  return `<div class="panel home-editor"><div class="panel-head"><div><h2>แก้หน้า Home</h2><p>Premium แก้ราคา Clear / Latte / Cold Whisk แยกตามช่องทางได้</p></div></div><form id="home-editor-form"><section class="edit-section"><h3>ชื่อร้านและหัวหน้า Home</h3><div class="editor-grid"><label>สัญลักษณ์ร้าน<input name="brand-mark" value="${esc(b.mark)}"></label><label>ชื่อร้าน<input name="brand-name" value="${esc(b.name)}"></label><label>คำใต้ชื่อร้าน<input name="brand-subline" value="${esc(b.subline)}"></label><label>Eyebrow<input name="hero-eyebrow" value="${esc(h.eyebrow)}"></label><label>หัวเรื่อง<input name="hero-title" value="${esc(h.title)}"></label><label>คำอธิบาย<input name="hero-subtitle" value="${esc(h.subtitle)}"></label><label>สถานะ<input name="hero-status" value="${esc(h.status)}"></label></div></section><section class="edit-section"><h3>เมนู ราคา และสูตร</h3><div class="table-wrap"><table class="data-table editor-table"><thead><tr><th>เมนู</th><th>ชื่อไทย / คำอธิบาย</th><th>Emoji</th><th>สูตร</th><th>Tag</th><th>หน้าร้าน Clear</th><th>หน้าร้าน Latte</th><th>หน้าร้าน Cold Whisk</th><th>LINE MAN Clear</th><th>LINE MAN Latte</th><th>LINE MAN Cold Whisk</th></tr></thead><tbody>${rows}</tbody></table></div></section><button class="primary-btn">บันทึกหน้า Home</button></form></div>`;
}

function saveHomeEditor(form) {
  const fd = new FormData(form);
  state.home.brand = {mark:fd.get("brand-mark"),name:fd.get("brand-name"),subline:fd.get("brand-subline")};
  state.home.hero = {eyebrow:fd.get("hero-eyebrow"),title:fd.get("hero-title"),subtitle:fd.get("hero-subtitle"),status:fd.get("hero-status")};
  menus.forEach((menu) => {
    const prefix = `menu-${menu.id}-`;
    const previous = state.home.menus[menu.id] || {};
    state.home.menus[menu.id] = {
      ...previous, name:fd.get(prefix+"name"), thai:fd.get(prefix+"thai"), description:fd.get(prefix+"description"), tag:fd.get(prefix+"tag"), recipe:fd.get(prefix+"recipe"), emoji:fd.get(prefix+"emoji"), image:fd.get(prefix+"image")
    };
    if (typeof menu.base === "object") Object.assign(state.home.menus[menu.id], {storeClear:Number(fd.get(prefix+"store-clear")),storeLatte:Number(fd.get(prefix+"store-latte")),storeColdWhisk:Number(fd.get(prefix+"store-coldwhisk")),appClear:Number(fd.get(prefix+"app-clear")),appLatte:Number(fd.get(prefix+"app-latte")),appColdWhisk:Number(fd.get(prefix+"app-coldwhisk"))});
    else Object.assign(state.home.menus[menu.id], {store:Number(fd.get(prefix+"store")),lineman:Number(fd.get(prefix+"lineman"))});
  });
  applyHomeEditor(); save(); toast("บันทึกหน้า Home แล้ว");
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:"application/json"});
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "kifun-matcha-backup.json"; link.click(); URL.revokeObjectURL(link.href);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => { try { const imported = JSON.parse(reader.result); if (!imported || typeof imported !== "object") throw new Error(); state = imported; state.hiddenMenuIds ??= []; state.customMenus ??= []; state.customMenus.forEach((menu) => { if (!menus.some((item) => item.id === menu.id)) menus.push(menu); }); state.menuStatus ??= {}; seedHomeEditor(); applyHomeEditor(); save(); toast("นำเข้าข้อมูลสำรองแล้ว"); } catch { toast("ไฟล์ JSON นี้ใช้ไม่ได้"); } };
  reader.readAsText(file);
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("button"); if (!button) return;
  if (button.classList.contains("mode-btn")) { activeMode = button.dataset.mode; render(); }
  else if (button.classList.contains("tab-btn")) { activeTab = button.dataset.tab; render(); }
  else if (button.classList.contains("channel-btn")) { menuChannel = button.dataset.channel; selection.channel = menuChannel; renderCustomer(); }
  else if (button.dataset.menu) { selection = {menuId:button.dataset.menu,powder:powderChoices(getMenu(button.dataset.menu))[0],milk:"M Milk",sweetness:5,brew:"clear",size:"12",channel:menuChannel,qty:1}; renderCustomer(); }
  else if (button.dataset.choice) { selection[button.dataset.choice] = button.dataset.choice === "sweetness" ? Number(button.dataset.value) : button.dataset.value; renderCustomer(); }
  else if (button.dataset.qty) { selection.qty = Math.max(1, selection.qty + Number(button.dataset.qty)); renderCustomer(); }
  else if (button.id === "preview-price") preview();
  else if (button.id === "close-dialog" || button.id === "close-v4-dialog") document.querySelector("#action-dialog").close();
  else if (button.dataset.toggleMenu) { state.menuStatus[button.dataset.toggleMenu] = !state.menuStatus[button.dataset.toggleMenu]; save(); }
  else if (button.dataset.menuVisibility) { const id = button.dataset.menuVisibility; state.hiddenMenuIds = isHiddenMenu({id}) ? state.hiddenMenuIds.filter((item) => item !== id) : [...state.hiddenMenuIds, id]; save(); toast(isHiddenMenu({id}) ? "ซ่อนเมนูแล้ว" : "กู้คืนเมนูแล้ว"); }
  else if (button.dataset.stock) { if (changeStock(button.dataset.stock, Number(button.dataset.delta))) save(); }
  else if (button.dataset.editSale) openSaleEditor(button.dataset.editSale);
  else if (button.dataset.deleteSale && confirm("ลบรายการขายนี้และคืนสต็อกตามสูตรเดิมใช่ไหม?")) { restoreSale(button.dataset.deleteSale); save(); }
  else if (button.dataset.supplierFilter) { document.querySelectorAll("[data-supplier-filter]").forEach((item) => item.classList.toggle("active", item === button)); renderSupplierCatalog(button.dataset.supplierFilter); }
  else if (button.id === "export-data") exportData();
  else if (button.id === "reset-demo" && confirm("คืนค่าข้อมูลตัวอย่างทั้งหมด?")) {
  state = defaultState();
  state.hiddenMenuIds = [];
  state.customMenus = [];
  menus.splice(0, menus.length, ...menus.filter(m => !m.id.startsWith("custom-")));
  seedHomeEditor();
  applyHomeEditor();
  save();
}
});

document.addEventListener("submit", (event) => {
  const form = event.target;
  if (!["home-editor-form", "add-menu-form", "sale-form-v4", "edit-sale-v4", "purchase-form", "deduct-form", "new-item-form"].includes(form.id)) return;
  event.preventDefault();
  if (form.id === "home-editor-form") saveHomeEditor(form);
  if (form.id === "add-menu-form") { const fd = new FormData(form), id = `custom-${Date.now()}`; const menu = {id,name:fd.get("name"),thai:fd.get("thai") || fd.get("name"),icon:fd.get("emoji") || "🍵",base:Number(fd.get("store")),lineman:Number(fd.get("lineman")),powderG:4,type:"base",milk:true,sweetness:true,art:"Custom menu",description:fd.get("description") || "เมนูใหม่",tag:fd.get("tag") || "New"}; menus.push(menu); state.customMenus.push(menu); state.menuStatus[id] = true; seedHomeEditor(); save(); toast("เพิ่มเมนูใหม่แล้ว"); }
  if (form.id === "sale-form-v4") recordSale(form.menuId.value,form.powderKey.value,Math.max(1,Number(form.qty.value)||1),5,form.brew.value,"Oat milk",form.channel.value,!!form.testOnly?.checked);
  if (form.id === "edit-sale-v4") {
  const dialog = document.querySelector("#action-dialog");
  const saleId = dialog.dataset.editing;
  const oldSale = state.sales.find(s => s.id === saleId);
  if (oldSale) {
    (oldSale.ingredients || []).forEach(item => changeStock(item.name, item.qty, "adjust", "แก้ไข: คืนสต็อกชั่วคราว"));
    const success = recordSale(form.menuId.value, form.powderKey.value, Math.max(1, Number(form.qty.value) || 1), oldSale.sweetness || 5, form.brew.value, oldSale.milk || "Oat milk", form.channel.value, !!form.testOnly?.checked, oldSale.size || "12");
    if (success) {
      state.sales = state.sales.filter(s => s.id !== saleId);
      save();
      dialog.close();
    } else {
      (oldSale.ingredients || []).forEach(item => changeStock(item.name, -item.qty, "adjust", "ยกเลิกการแก้ไข: หักสต็อกเดิมกลับ"));
      save();
    }
  }
}
  if (form.id === "purchase-form") { const qty=Number(form.qty.value); if (qty>0 && changeStock(form.name.value,qty,"purchase",form.note.value||"ซื้อเข้า")) save(); }
  if (form.id === "deduct-form") { const qty=Number(form.qty.value); if (qty>0 && changeStock(form.name.value,-qty,"adjust",form.note.value||"ตัดสต็อก")) save(); }
  if (form.id === "new-item-form") {
    const fd = new FormData(form), name = String(fd.get("name") || "").trim();
    if (!name) { toast("กรอกชื่อรายการก่อน"); return; }
    if (getStock(name)) { toast("รายการนี้มีอยู่แล้ว"); return; }
    const unit = String(fd.get("unit") || "pc").trim();
    const qty = Number(fd.get("qty")) || 0;
    const costInput = fd.get("cost");
    const cost = costInput === "" || costInput === null ? null : Number(costInput) || null;
    const min = Number(fd.get("min")) || 0;
    state.stock.push({ name, unit, qty, cost, min, source: "เพิ่มด้วยตนเอง" });
    state.history.push({ at: today(), type: "purchase", title: name, detail: "สร้างรายการใหม่", delta: `${qty} ${unit}` });
    save(); toast(`เพิ่มรายการ "${name}" แล้ว`);
  }
});

document.addEventListener("change", (event) => {
  if (event.target.id === "data-import" && event.target.files[0]) importData(event.target.files[0]);
  if (!event.target.dataset.imageFile || !event.target.files[0]) return;
  const menuId = event.target.dataset.imageFile, file = event.target.files[0];
  // main.js uploads the photo to Supabase Storage (resized to ≤640×640)
  // and writes the returned public URL back via setMenuImage().
  window.dispatchEvent(new CustomEvent("kifun:menu-image-selected", { detail: { menuId, file } }));
});

// Rendering starts after the sheet pricing constants below are initialized.
/* ═══════════════════════════════════════════════════════════════
   KIFUN PRICING SYNC v3 — ตรงกับแท็บ "Menu & Pricing" ในไฟล์ Excel
   วางบล็อกนี้ต่อท้าย app.js (ต่อจากบรรทัด render();)
   ═══════════════════════════════════════════════════════════════ */

/* ① ราคาฐาน = ราคาตอนใช้ NOKO (ตรงกับบล็อก ② ในชีท) */
const SHEET_ANCHORS = {
  latte:       { store: 99,  app: 149 },
  biscoff:     { store: 89,  app: 129 },
  nutella:     { store: 149, app: 199 },
  coldwhisk:   { store: 119, app: 169 },
  clear:       { store: 69,  app: 99  },
  hojicha:     { store: 139, app: 209 },
  coconut:     { store: 95,  app: 125 },
  coconutfoam: { store: 95,  app: 125 }
};

/* ② ส่วนต่างตามผง — สูตรเดียวกับชีทเป๊ะ ๆ
      store = MROUND((฿/g ของผง − ฿/g NOKO) × โดส, 5)
      app   = MROUND(store / (1 − GP), 5)   ·   GP = 32.1%  */
const UPLIFT_BASES = ["noko", "mie", "sukito"];
const round5 = (n) => Math.round(n / 5) * 5;

function upliftFor(powderKey, doseG, channel) {
  if (!UPLIFT_BASES.includes(powderKey)) return 0;   // hojicha + premium ตั้งราคาเอง
  const delta = (powders[powderKey]?.cost || 0) - powders.noko.cost;
  if (delta <= 0) return 0;
  const store = round5(delta * doseG);
  return channel === "lineman" ? round5(store / (1 - COMMISSION)) : store;
}

/* เมนูร้าน!A29:D32 — anchor เป็นราคานมวัว; ส่วนต่างนมต้องบวกทีหลัง */
function milkUplift(milk, channel) {
  if (milk === "Oat milk") return channel === "lineman" ? 20 : 15;
  if (milk === "Mixed!") return channel === "lineman" ? 15 : 10;
  return 0; // M Milk / Fresh milk
}

/* ③ ราคาสุดท้าย = anchor + ส่วนต่าง (ทับ menuPrice/calc ตัวเดิม) */
function menuPrice(menu, brew = "clear", channel = "store") {
  const configured = channel === "lineman" ? menu.lineman : menu.base;
  if (typeof configured === "number") return configured;
  if (configured && typeof configured === "object") return Number(configured[brew] ?? configured.clear ?? 0);
  return 0;
}

function calc(menu, powderKey = selection.powder, milk = selection.milk, sweetness = selection.sweetness, brew = selection.brew, channel = selection.channel || menuChannel, size = selection.size) {
  const safePowder = validPowderKey(powderKey) ? powderKey : powderChoices(menu)[0];
  const r = recipe(menu, safePowder, milk, sweetness, brew, size);
  const milkAdd = menu.milk && !(menu.type === "premium" && brew === "clear") ? milkUplift(milk, channel) * r.sizeFactor : 0;
  const price = menuPrice(menu, brew, channel) * r.sizeFactor + upliftFor(safePowder, r.powderG, channel) + milkAdd;
  const net = channel === "lineman" ? price * (1 - COMMISSION) : price;
  return { price, ...r, net, profit: net - r.cost };
}

/* ④ เขียน anchor ลงเมนูและลง Home editor ด้วย
      (ไม่งั้นค่าที่เคยเซฟใน localStorage จะทับราคาใหม่ตอนรีเฟรช) */
function syncPricesWithSheet() {
  Object.values(powders).forEach((powder) => { powder.priceAdd = 0; });
  seedHomeEditor();
  applyHomeEditor();
}
syncPricesWithSheet();

/* Bridge for the ES-module entry (main.js): expose mutable globals
   that are declared with const/let and therefore not on window. */
window.__kifun = {
  get menus() { return menus; },
  get activeTab() { return activeTab; },
  get menuChannel() { return menuChannel; },
  get state() { return state; },
  calc,
  powderChoices,
  esc,
  money,
  renderAdmin,
  setState,
  setMenuImage
};