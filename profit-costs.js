// Cost calculations use the currently loaded inventory, not historical seed prices.
export function inventoryCost(stock, name) {
  const row = stock.find(item => item.name === name);
  if (row?.cost == null || row.cost === '' || !Number.isFinite(Number(row.cost))) {
    throw new Error(`ยังไม่มีต้นทุน: ${name}`);
  }
  return Number(row.cost);
}

export function currentMilkCosts(stock) {
  const fresh = inventoryCost(stock, 'MM Milk');
  const oat = inventoryCost(stock, 'Goodmate oat milk');
  return {fresh: fresh * 100, oat: oat * 100, mixed: fresh * 60 + oat * 40, none: 0};
}

export function inventoryCOGS(stock, powderCostG, grams, method, milkType, whip = false, pack = 'separate', syrupMl = 0) {
  const cost = name => inventoryCost(stock, name);
  const names = ['14oz PET cup (Basic Pac FP-14)', '98mm sipper lid with plug (ฝายกดื่มมีจุก)',
    'Spill-proof lid sheet (แผ่นรองฝาแก้ว)', 'Cup bag 6×11', '6mm straw'];
  if (pack === 'separate') names.push('Cold whisk pouch 200ml');
  if (pack === 'separate' && ['coconut', 'coconutfoam', 'biscoff'].includes(method)) names.push('Dipping cup 8oz');
  const packItems = names.map(name => ({name, qty: 1, unitCost: cost(name)}));
  const milkCosts = currentMilkCosts(stock);
  const resolvedMilk = method === 'biscoff' ? 'oat' : method === 'nutella' ? 'fresh' : milkType;
  const liquidCost = ['coconut', 'coconutfoam'].includes(method)
    ? cost('Coconut water') * 135 + cost('Goodmate oat milk') * 65
    : method === 'clear' ? 0 : milkCosts[resolvedMilk];
  const toppingItems = method === 'biscoff'
    ? [{name: 'Biscoff spread', qty: 16}, {name: 'Lotus Biscoff biscuit', qty: 12}]
    : method === 'nutella' ? [{name: 'Nutella spread', qty: 20}] : [];
  const extraCost = toppingItems.reduce((sum, item) => sum + cost(item.name) * item.qty, 0)
    + Number(syrupMl) * cost('Syrup');
  const powderCost = powderCostG * grams;
  const packCost = packItems.reduce((sum, item) => sum + item.unitCost * item.qty, 0);
  const whipCost = whip ? cost('Anchor whipping cream') * 15 : 0;
  return {powderCost, liquidCost, extraCost, packCost, whipCost, packItems, resolvedMilk,
    totalCOGS: powderCost + liquidCost + extraCost + packCost + whipCost};
}
