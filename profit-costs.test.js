import test from 'node:test';
import assert from 'node:assert/strict';
import {inventoryCOGS} from './profit-costs.js';
const stock = Object.entries({
  'MM Milk': .0675, 'Goodmate oat milk': .095, 'Syrup': .0871863799283154,
  '14oz PET cup (Basic Pac FP-14)': 1.78,
  '98mm sipper lid with plug (ฝายกดื่มมีจุก)': 1.1,
  'Spill-proof lid sheet (แผ่นรองฝาแก้ว)': .096,
  'Cup bag 6×11': .4, '6mm straw': .15, 'Cold whisk pouch 200ml': .99,
  'Dipping cup 8oz': 1.5, 'Coconut water': .16,
  'Biscoff spread': .465, 'Lotus Biscoff biscuit': .17736200716845876,
  'Nutella spread': .47, 'Anchor whipping cream': .55
}).map(([name,cost]) => ({name,cost}));
const close = (actual, expected) => assert.ok(Math.abs(actual-expected) < .000001, `${actual} != ${expected}`);
test('MAME storefront margins agree with latest invoice inputs and ready packaging', () => {
  close(65-inventoryCOGS(stock,4.6,3,'clear','none',false,'ready').totalCOGS,47.674);
  close(85-inventoryCOGS(stock,4.6,5,'latte','fresh',false,'ready').totalCOGS,51.724);
  close(75-inventoryCOGS(stock,4.6,5,'latte','fresh',false,'ready').totalCOGS,41.724);
  close(inventoryCOGS(stock,4.6,5,'latte','fresh').totalCOGS,34.266);
});
test('new purchase costs flow through immediately and unknown costs are rejected', () => {
  const updated=stock.map(row => row.name === 'MM Milk' ? {...row,cost:.08} : row);
  close(inventoryCOGS(updated,4.6,5,'latte','fresh').totalCOGS,35.516);
  assert.throws(() => inventoryCOGS(stock.map(row => row.name.includes('sipper') ? {...row,cost:null} : row),4.6,5,'latte','fresh'), /ยังไม่มีต้นทุน/);
});
test('syrup, milk options and current specialty recipes do not use historical constants', () => {
  close(inventoryCOGS(stock,4.6,5,'latte','mixed',false,'ready',5).totalCOGS,34.81193189964158);
  const biscoff=inventoryCOGS(stock,4.6,5,'biscoff','fresh');
  close(biscoff.liquidCost,9.5);
  close(biscoff.extraCost,16*.465+12*.17736200716845876);
  close(biscoff.packCost,6.016);
  close(inventoryCOGS(stock,4.6,4,'coconut','none').liquidCost,27.775);
});
