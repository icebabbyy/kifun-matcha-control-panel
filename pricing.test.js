import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {priceOrder,priceLine} from './order-pricing.js';
const c=JSON.parse(readFileSync(new URL('./storefront-catalog.json',import.meta.url),'utf8').replace(/^\uFEFF/,''));
const row=(id,options,quantity=1)=>({menuId:id,options,quantity});
const latte={preparation:'latte',milk:'fresh',sweetness:'less',pack:'ready'};
test('regular MAME has no two-cup promotion; separate materials priced per cup',()=>{
 assert(!c.menus.some(m=>m.cups===2));
 assert.equal(priceLine(c,row('mame-matcha',latte,2)).totalCents,17000);
 assert.equal(priceLine(c,row('mame-matcha',{...latte,pack:'separate'},2)).totalCents,17000);
});
test('Clear is visible separately and unrequested Yaki cards are replaced',()=>{
 assert(!c.menus.some(m=>m.name.startsWith('Yaki Nori')));
 const clear=c.menus.find(m=>m.id==='clear');assert.equal(clear.name,'Clear Matcha');assert.equal(clear.image,'assets/menu/clear-matcha.png');
 for(const [taste,price] of [['mame',65],['mochi',70],['kirari',99]]) {
  assert.equal(priceLine(c,row('clear',{'clear-taste':taste,sweetness:'zero',pack:'ready'})).totalCents,price*100);
 }
 assert.throws(()=>priceLine(c,row('clear',{'clear-taste':'yaki',sweetness:'zero',pack:'ready'})));
 assert.equal(priceLine(c,row('latte',{milk:'fresh',brew:'latte',sweetness:'less',pack:'ready'})).totalCents,11900);
 assert.equal(priceLine(c,row('latte',{milk:'fresh',brew:'coldwhisk',sweetness:'less',pack:'ready'})).totalCents,12400);
});
test('cream roll uses latest matcha lot plus five baht without treating it as a cup',()=>{
 const p=priceLine(c,row('roll-matcha',{},3));assert.equal(p.totalCents,4500);assert.equal(p.cups,0);
 assert(priceLine(c,row('roll-matcha',{})).unitCents/100-649/78>=5);
});
test('reject unavailable options, menus, missing selection and manipulated quantities',()=>{
 for(const r of [row('mame-matcha',{...latte,preparation:'unknown'}),row('london-fog',{}),row('mame-matcha',{}),row('mame-matcha',latte,-1),row('mame-matcha',latte,1.5)])assert.throws(()=>priceLine(c,r));
 assert.throws(()=>priceOrder(c,[]));assert.throws(()=>priceOrder(c,[row('mame-matcha',latte,20),row('mame-matcha',latte,20)]));
 assert.equal(priceOrder(c,[row('mame-matcha',latte),row('roll-matcha',{})]).totalCents,10000);
});

test('powder menus start at Clear and charge only applicable milk choices',()=>{
 for(const [id,expected] of [['mame-matcha',[65,90,85,99]],['mochi-matcha',[70,95,90,104]]]){
  for(const [i,preparation] of ['clear','coldwhisk','latte','coconut'].entries()){
   const p=priceLine(c,row(id,{...latte,preparation,milk:'oat'}));
   const milky=['latte','coldwhisk'].includes(preparation);
   assert.equal(p.unitCents,(expected[i]+(milky?15:0))*100);
   assert.equal(!!p.selections.milk,milky);
  }
 }
 const milky={...latte};delete milky.milk;assert.throws(()=>priceLine(c,row('mame-matcha',milky)));
 assert.equal(priceLine(c,row('mame-matcha',{...milky,preparation:'clear'})).unitCents,6500);
});
