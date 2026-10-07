import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {priceOrder,priceLine} from './order-pricing.js';
const c=JSON.parse(readFileSync(new URL('./storefront-catalog.json',import.meta.url),'utf8').replace(/^\uFEFF/,''));
const row=(id,options,quantity=1)=>({menuId:id,options,quantity});
const latte={taste:'mame',milk:'fresh',brew:'latte',sweetness:'less',pack:'ready'};
test('regular MAME has no two-cup promotion; separate materials priced per cup',()=>{
 assert(!c.menus.some(m=>m.cups===2));
 assert.equal(priceLine(c,row('latte',latte,2)).totalCents,17000);
 assert.equal(priceLine(c,row('latte',{...latte,pack:'separate'},2)).totalCents,17198);
});
test('Yaki extra is dose-specific, not outdated platform surcharge',()=>{
 assert.equal(priceLine(c,row('latte',{...latte,taste:'yaki'})).totalCents,16500);
 assert.equal(priceLine(c,row('clear',{taste:'yaki',sweetness:'zero',pack:'ready'})).totalCents,11500);
 assert.equal(priceLine(c,row('coconut',{taste:'yaki',sweetness:'zero',pack:'ready'})).totalCents,16400);
});
test('cream roll uses latest matcha lot plus five baht without treating it as a cup',()=>{
 const p=priceLine(c,row('roll-matcha',{},3));assert.equal(p.totalCents,3999);assert.equal(p.cups,0);
 assert(priceLine(c,row('roll-matcha',{})).unitCents/100-649/78>=5);
});
test('reject unavailable options, menus, missing selection and manipulated quantities',()=>{
 for(const r of [row('latte',{...latte,taste:'kome'}),row('london-fog',{}),row('latte',{}),row('latte',latte,-1),row('latte',latte,1.5)])assert.throws(()=>priceLine(c,r));
 assert.throws(()=>priceOrder(c,[]));assert.throws(()=>priceOrder(c,[row('latte',latte,20),row('latte',latte,20)]));
 assert.equal(priceOrder(c,[row('latte',latte),row('roll-matcha',{})]).totalCents,9833);
});
