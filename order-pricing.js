export const cents = value => Math.round(Number(value) * 100);
export const baht = value => (value / 100).toLocaleString('th-TH', {minimumFractionDigits: value % 100 ? 2 : 0, maximumFractionDigits: 2});

export function priceLine(catalog, input) {
  const menu = catalog.menus.find(m => m.id === input.menuId);
  if (!menu || !menu.available) throw new Error('เมนูนี้งดขาย');
  const quantity = Number(input.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) throw new Error('จำนวนต้องอยู่ระหว่าง 1–20');
  const selections = {};
  let unitCents = cents(menu.storePrice);
  for (const groupId of menu.groups) {
    const group = catalog.groups[groupId];
    const option = group.options.find(o => o.id === input.options?.[groupId]);
    if (!option || !option.available) throw new Error(`กรุณาเลือก ${group.label}`);
    selections[groupId] = {id: option.id, label: option.label};
    if (menu.blockedOptions?.[groupId]?.includes(option.id)) throw new Error('ตัวเลือกนี้งดขายสำหรับเมนูนี้');
    const units = group.perCup ? (menu.cups ?? 1) : 1;
    unitCents += cents(menu.optionPrices?.[groupId]?.[option.id] ?? option.storeAdd) * units;
  }
  return {menuId:menu.id, name:menu.name, quantity, selections, unitCents, totalCents:unitCents * quantity, cups:(menu.cups ?? 1) * quantity};
}

export function priceOrder(catalog, cart) {
  if (!Array.isArray(cart) || !cart.length || cart.length > 20) throw new Error('กรุณาเลือกสินค้า 1–20 รายการ');
  const lines = cart.map(row => priceLine(catalog,row));
  if (lines.reduce((sum,row)=>sum+row.quantity,0)>30) throw new Error('สั่งได้สูงสุด 30 รายการต่อครั้ง');
  return {lines,totalCents:lines.reduce((sum,row)=>sum+row.totalCents,0)};
}
