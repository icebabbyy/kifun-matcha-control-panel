import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('./app.js',import.meta.url),'utf8');
const stockCode=source.slice(source.indexOf('function stockNumber('),source.indexOf('function openStockEditor('));
const equipmentCode=source.slice(source.indexOf('function equipmentTab('),source.indexOf('function changeStock('));
function screen(filter='all') {
 const context={state:{stock:[{name:'Unknown powder',qty:null,cost:null,unit:'g'},{name:'Imported powder',qty:'5.25',cost:'4.60',unit:'g',min:1},{name:'Empty cup',qty:0,cost:2,unit:'pc'},{name:'Cup bag',qty:7,cost:0.99,unit:'pc'}],history:[{at:'2026-10-07',type:'purchase',title:'รับเข้า',detail:'ล็อตใหม่',delta:'+110g'}]},currentStockFilter:filter,currentStockSearch:'',esc:v=>String(v??''),formatUnitCost:v=>v==null?'—':String(v)};
 vm.createContext(context);vm.runInContext(stockCode+equipmentCode,context);return context;
}
test('stock history renders null and imported numeric quantities without crashing',()=>{
 const context=screen();const html=context.stockTab();
 assert.match(html,/Unknown powder/);assert.match(html,/ยังไม่ระบุ/);assert.match(html,/5.25/);assert.match(html,/ล็อตใหม่/);
 assert.equal(context.stockNumber(null),null);assert.equal(context.stockNumber(''),null);assert.equal(context.stockNumber('invalid'),null);
 assert.equal(context.stockNumber('0'),0);
});
test('unknown quantities are not reported as empty or included in empty stock filter',()=>{
 const html=screen('out').stockTab();assert.match(html,/data-stock="Empty cup"/);assert.doesNotMatch(html,/data-stock="(?:Unknown powder|Imported powder|Cup bag)"/);
});
test('packaging panel uses current stock quantity and cost',()=>{
 const context=screen();assert.match(context.equipmentTab(),/Cup bag/);assert.match(context.equipmentTab(),/0.99/);
 context.state.stock[3].qty=3;context.state.stock[3].cost=1.25;
 const html=context.equipmentTab();assert.match(html,/>3 pc</);assert.match(html,/>1.25</);
});
