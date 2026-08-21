/* ═══════════════════════════════════════════════════════════════
   KIFUN MATCHA — main entry (ES module)
   Wires up:
   1. Supabase real-time sync layer (state + images)
   2. Comprehensive Profit, Packaging Breakdown & LINE MAN Campaign Simulator
   ═══════════════════════════════════════════════════════════════ */

import { supabase, fetchAppState, saveAppState, uploadMenuImage } from "./supabase.js";

/* Bridge to app.js globals (classic script) */
const K = () => window.__kifun;
const menus = () => K().menus;
const activeTab = () => K().activeTab;
const calc = (...a) => K().calc(...a);
const recipe = (...a) => K().recipe(...a);
const getStock = (...a) => K().getStock(...a);
const powders = () => K().powders;
const powderChoices = (...a) => K().powderChoices(...a);
const esc = (...a) => K().esc(...a);
const money = (...a) => K().money(...a);

/* ── Supabase sync status ─────────────────────────────────────── */
let supabaseReady = false;
let supabaseError = null;

async function initSupabase() {
  try {
    const { error } = await supabase
      .from("app_state")
      .select("id")
      .limit(1);

    if (error) throw error;

    supabaseReady = true;
    console.log("[KIFUN] Supabase connected");

    try {
      const saved = await fetchAppState();

      if (saved && typeof saved === "object") {
        K().setState(saved);
        console.log("[KIFUN] App state loaded from Supabase");
      } else {
        await saveAppState(K().state);
        console.log("[KIFUN] Default state pushed to Supabase");
      }
    } catch (stateErr) {
      console.warn(
        "[KIFUN] Could not load app state:",
        stateErr.message || stateErr
      );
    }
  } catch (err) {
    supabaseError = err.message || String(err);
    console.warn("[KIFUN] Supabase not ready:", supabaseError);
  }
}

/* ── Persist every state mutation to Supabase ─────────────────── */
window.addEventListener("kifun:state-changed", (event) => {
  const state = event.detail;

  if (!supabaseReady) return;

  saveAppState(state)
    .then(() => console.log("[KIFUN] State saved to Supabase"))
    .catch((err) =>
      console.warn("[KIFUN] Save failed:", err.message || err)
    );
});

/* ── Menu photo upload (resized ≤640×640 → Supabase Storage) ──── */
window.addEventListener("kifun:menu-image-selected", async (event) => {
  const { menuId, file } = event.detail || {};

  const toast = (msg) => {
    const t = document.querySelector("#toast");
    if (!t) return;

    t.textContent = msg;
    t.classList.add("show");

    clearTimeout(toast.timer);

    toast.timer = setTimeout(() => {
      t.classList.remove("show");
    }, 2600);
  };

  if (!menuId || !file) return;

  toast("กำลังอัปโหลดรูป… (ปรับไม่เกิน 640×640)");

  try {
    if (!supabaseReady) {
      throw new Error("Supabase ยังไม่เชื่อมต่อ");
    }

    const publicUrl = await uploadMenuImage(menuId, file);

    K().setMenuImage(menuId, publicUrl);

    toast("อัปโหลดรูปลง Supabase แล้ว");
  } catch (err) {
    console.warn("[KIFUN] Upload failed:", err);

    const message = err?.message || String(err);

    toast(`อัปโหลดรูปไม่สำเร็จ — ${message}`);
  }
});

/* ═══════════════════════════════════════════════════════════════
   PROFIT, PACKAGING & CAMPAIGN SIMULATOR ENGINE
   ═══════════════════════════════════════════════════════════════ */

const WHIP_COST_15ML = 3.29;

const profitState = {
  menuId: "latte",
  powderKey: "noko",
  milk: "M Milk",
  size: "12",
  sweetness: 5,
  brew: "clear",
  storePrice: 99,
  linemanPrice: 149,
  gpRate: 0.321, // 32.1% default
  discountPercent: 10, // 10% Hermes 6.0 default
  whip: false
};

const PACK_NAMES = new Set([
  "14oz PET cup (Basic Pac FP-14)",
  "98mm sipper lid with plug (ฝายกดื่มมีจุก)",
  "Spill-proof lid sheet (แผ่นรองฝาแก้ว)",
  "Cold whisk pouch 200ml",
  "Cold whisk pouch 250ml",
  "Cup bag 6×11",
  "Cup bag 12×11+1",
  "Brown craft bag 12×11",
  "6mm straw",
  "Topping tray 98mm",
  "3oz topping cup",
  "12oz cup + lid set",
  "22oz cup (free)"
]);

function getItemizedBOM(menuId, powderKey, milk, sweetness, brew, size) {
  const m = menus().find((item) => item.id === menuId) || menus()[0];
  const pChoices = powderChoices(m);
  const safePowderKey = pChoices.includes(powderKey) ? powderKey : pChoices[0];

  const r = recipe(m, safePowderKey, milk, sweetness, brew, size);

  const ingredients = [];
  const packaging = [];
  let totalIngredientsCost = 0;
  let totalPackagingCost = 0;

  (r.items || []).forEach((item) => {
    const stockRow = getStock(item.name);
    const unitCost = stockRow?.cost ?? 0;
    const itemCost = item.qty * unitCost;
    const isPack = PACK_NAMES.has(item.name);

    const entry = {
      name: item.name,
      qty: item.qty,
      unit: stockRow?.unit || "ชิ้น",
      unitCost,
      totalCost: itemCost
    };

    if (isPack) {
      packaging.push(entry);
      totalPackagingCost += itemCost;
    } else {
      ingredients.push(entry);
      totalIngredientsCost += itemCost;
    }
  });

  return {
    menu: m,
    powderKey: safePowderKey,
    powder: powders()[safePowderKey] || { label: safePowderKey },
    ingredients,
    packaging,
    totalIngredientsCost,
    totalPackagingCost,
    totalCOGS: r.cost,
    sizeFactor: r.sizeFactor || 1
  };
}

function calculateProfitMetrics({
  price,
  discountPercent = 0,
  gpRate = 0.321,
  cogs = 0,
  whip = false
}) {
  const discountAmount = Math.min(price * (discountPercent / 100), 50); // max 50 THB under Hermes 6.0
  const customerPrice = Math.max(0, price - discountAmount);

  // On LINE MAN, GP is taken from customer selling price
  const gpAmount = customerPrice * gpRate;
  const payout = customerPrice - gpAmount;

  const totalCost = cogs + (whip ? WHIP_COST_15ML : 0);
  const profit = payout - totalCost;
  const marginPercent = customerPrice > 0 ? (profit / customerPrice) * 100 : 0;

  return {
    originalPrice: price,
    discountPercent,
    discountAmount,
    customerPrice,
    gpRate,
    gpAmount,
    payout,
    cogs,
    whipCost: whip ? WHIP_COST_15ML : 0,
    totalCost,
    profit,
    marginPercent
  };
}

function getProfitHealthClass(margin) {
  if (margin >= 32) return "good";
  if (margin >= 18) return "medium";
  return "bad";
}

function getProfitHealthLabel(margin) {
  if (margin >= 32) return "🟢 กำไรดีมาก (แนะนำ)";
  if (margin >= 18) return "🟡 กำไรปานกลาง (ปั๊มยอดได้)";
  return "🔴 กำไรบางมาก (เสี่ยงขาดทุน)";
}

/* ── Render Main Profit Tab ── */
function profitTab() {
  const allMenuList = menus();
  const currentMenu = allMenuList.find((m) => m.id === profitState.menuId) || allMenuList[0];
  profitState.menuId = currentMenu.id;

  const pChoices = powderChoices(currentMenu);
  if (!pChoices.includes(profitState.powderKey)) {
    profitState.powderKey = pChoices[0];
  }

  // Initialize prices if switching
  const storeCalc = calc(
    currentMenu,
    profitState.powderKey,
    profitState.milk,
    profitState.sweetness,
    profitState.brew,
    "store",
    profitState.size
  );
  const linemanCalc = calc(
    currentMenu,
    profitState.powderKey,
    profitState.milk,
    profitState.sweetness,
    profitState.brew,
    "lineman",
    profitState.size
  );

  return `
    <div class="profit-calculator-root">
      
      <!-- Top Card: Interactive Controls & Preset Selector -->
      <div class="profit-top-card">
        <div class="profit-top-header">
          <div>
            <h2>📊 คำนวณกำไร & วิเคราะห์แคมเปญ LINE MAN</h2>
            <p>แจกแจงต้นทุนแพ็กเกจจิ้ง วัตถุดิบละเอียดต่อแก้ว และจำลองกำไรสุทธิทุกเงื่อนไข GP / แคมเปญดีลเดือด</p>
          </div>
          <div class="campaign-badge-pill">
            <i></i> LINE MAN Hermes 6.0 Ready
          </div>
        </div>

        <div class="profit-controls-grid">
          
          <div class="profit-field">
            <label>เลือกเมนูเครื่องดื่ม</label>
            <select id="sim-menu-select">
              ${allMenuList.map((m) => `<option value="${m.id}" ${m.id === currentMenu.id ? "selected" : ""}>${esc(m.name)}</option>`).join("")}
            </select>
          </div>

          <div class="profit-field">
            <label>เกรดผงชา (Matcha Powder)</label>
            <select id="sim-powder-select">
              ${pChoices.map((key) => {
                const p = powders()[key] || { label: key };
                return `<option value="${key}" ${key === profitState.powderKey ? "selected" : ""}>${esc(p.label)}</option>`;
              }).join("")}
            </select>
          </div>

          ${currentMenu.milk ? `
            <div class="profit-field">
              <label>ชนิดนม (Milk Option)</label>
              <select id="sim-milk-select">
                <option value="M Milk" ${profitState.milk === "M Milk" ? "selected" : ""}>M Milk (นมวัวมาตรฐาน)</option>
                <option value="Oat milk" ${profitState.milk === "Oat milk" ? "selected" : ""}>Goodmate Oat milk (+฿15/฿20)</option>
                <option value="Mixed!" ${profitState.milk === "Mixed!" ? "selected" : ""}>Mixed! 60:40 (+฿10/฿15)</option>
              </select>
            </div>
          ` : ""}

          ${currentMenu.sizes ? `
            <div class="profit-field">
              <label>ขนาดแก้ว</label>
              <select id="sim-size-select">
                <option value="12" ${profitState.size === "12" ? "selected" : ""}>12oz (มาตรฐาน 5g)</option>
                <option value="22" ${profitState.size === "22" ? "selected" : ""}>22oz (สเกล 9.2g)</option>
              </select>
            </div>
          ` : ""}

          <div class="profit-field">
            <label>ราคาหน้าร้าน (฿)</label>
            <input id="sim-store-price" type="number" step="1" min="0" value="${profitState.storePrice || storeCalc.price}">
          </div>

          <div class="profit-field">
            <label>ราคาตั้งบน LINE MAN (฿)</label>
            <input id="sim-lineman-price" type="number" step="1" min="0" value="${profitState.linemanPrice || linemanCalc.price}">
          </div>

        </div>

        <div style="margin-top:16px;padding-top:16px;border-top:1px solid #edf2eb;display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px;align-items:center;">
          
          <div class="profit-field">
            <label>เลือกระดับ GP ของ LINE MAN</label>
            <div class="gp-preset-group">
              <button class="gp-preset-btn ${profitState.gpRate === 0.321 ? "active" : ""}" data-gp="0.321">32.1% (30%+VAT)</button>
              <button class="gp-preset-btn ${profitState.gpRate === 0.33 ? "active" : ""}" data-gp="0.33">33.0% (All-in)</button>
              <button class="gp-preset-btn ${profitState.gpRate === 0.30 ? "active" : ""}" data-gp="0.30">30.0% (Flat)</button>
              <button class="gp-preset-btn ${profitState.gpRate === 0.35 ? "active" : ""}" data-gp="0.35">35.0%</button>
            </div>
          </div>

          <div class="profit-field">
            <label>🔥 ส่วนลดแคมเปญดีลเดือด (Hermes 6.0 ที่ร้านออก)</label>
            <div class="discount-pills">
              <button class="discount-pill-btn ${profitState.discountPercent === 0 ? "active" : ""}" data-disc="0">ไม่ลด 0%</button>
              <button class="discount-pill-btn ${profitState.discountPercent === 5 ? "active" : ""}" data-disc="5">ลด 5%</button>
              <button class="discount-pill-btn ${profitState.discountPercent === 10 ? "active" : ""}" data-disc="10">ลด 10% ⭐</button>
              <button class="discount-pill-btn ${profitState.discountPercent === 15 ? "active" : ""}" data-disc="15">ลด 15%</button>
              <button class="discount-pill-btn ${profitState.discountPercent === 20 ? "active" : ""}" data-disc="20">ลด 20% 🔥</button>
              <button class="discount-pill-btn ${profitState.discountPercent === 25 ? "active" : ""}" data-disc="25">ลด 25% (Max)</button>
            </div>
          </div>

          <label class="profit-toggle" style="margin-top:6px;">
            <input type="checkbox" id="sim-whip" ${profitState.whip ? "checked" : ""}>
            แถมวิปครีม 15ml (ต้นทุน ฿3.29)
          </label>

        </div>

      </div>

      <!-- Dynamic Section: BOM Breakdown & Scenario Cards -->
      <div id="sim-dynamic-section"></div>

    </div>
  `;
}

function renderSimulatorDynamicContent() {
  const target = document.querySelector("#sim-dynamic-section");
  if (!target) return;

  const currentMenu = menus().find((m) => m.id === profitState.menuId) || menus()[0];
  const bom = getItemizedBOM(
    profitState.menuId,
    profitState.powderKey,
    profitState.milk,
    profitState.sweetness,
    profitState.brew,
    profitState.size
  );

  const storePrice = Number(profitState.storePrice) || 0;
  const linemanPrice = Number(profitState.linemanPrice) || 0;

  // Scenario 1: หน้าร้าน
  const scStore = calculateProfitMetrics({
    price: storePrice,
    discountPercent: 0,
    gpRate: 0,
    cogs: bom.totalCOGS,
    whip: profitState.whip
  });

  // Scenario 2: LINE MAN ปกติ (ไม่เข้าแคมเปญ)
  const scNormal = calculateProfitMetrics({
    price: linemanPrice,
    discountPercent: 0,
    gpRate: profitState.gpRate,
    cogs: bom.totalCOGS,
    whip: profitState.whip
  });

  // Scenario 3: LINE MAN แคมเปญดีลเดือด (Hermes 6.0)
  const scCampaign = calculateProfitMetrics({
    price: linemanPrice,
    discountPercent: profitState.discountPercent,
    gpRate: profitState.gpRate,
    cogs: bom.totalCOGS,
    whip: profitState.whip
  });

  // Special packaging note
  let packagingNote = "";
  if (currentMenu.id === "biscoff") {
    packagingNote = "💡 <b>สูตร & แพ็กเกจจิ้ง Biscoff</b>: ทาสเปรดข้างแก้วโดยตรง 15g + วางบิสกิตบนถาดรองโฟม 98mm (ยกเลิกถ้วย 3oz ฿0.80 ช่วยประหยัดต้นทุนแพ็กเกจจิ้งเหลือ ฿5.98 / ชุด)";
  } else if (currentMenu.id === "coconut" || currentMenu.id === "coconutfoam") {
    packagingNote = "💡 <b>สูตร & แพ็กเกจจิ้ง Coconut</b>: น้ำมะพร้าวสด 135ml + oat milk เย็นจัด 65ml + ถาดรองโฟม 98mm (ต้นทุนแพ็กเกจจิ้ง ฿5.98 / ชุด)";
  } else {
    packagingNote = "💡 <b>แพ็กเกจจิ้งเดลิเวอรี่มาตรฐาน</b>: แก้ว PET 14oz (฿2.80) + ฝายกดื่ม 98mm (฿0.47) + แผ่นรองฝา (฿0.096) + ถุง Pouch แยกน้ำแข็ง (฿0.99) + ถุงหิ้ว (฿0.40) + หลอด 6mm (฿0.15) = ฿4.91 / ชุด";
  }

  // Multi-tier Hermes table data (0%, 5%, 10%, 15%, 20%, 25%)
  const discountTiers = [0, 5, 10, 15, 20, 25];
  const tierRows = discountTiers.map((d) => {
    const res = calculateProfitMetrics({
      price: linemanPrice,
      discountPercent: d,
      gpRate: profitState.gpRate,
      cogs: bom.totalCOGS,
      whip: profitState.whip
    });
    const health = getProfitHealthClass(res.marginPercent);
    const label = getProfitHealthLabel(res.marginPercent);
    const isActive = profitState.discountPercent === d;

    return `
      <tr class="${isActive ? "active-tier" : ""}">
        <td>
          <span class="tier-tag ${d === 0 ? "none" : `promo${d}`}">
            ${d === 0 ? "ไม่เข้าโปร (0%)" : `ดีลเดือด ลด ${d}%`}
          </span>
          ${isActive ? " 👈 (กำลังดู)" : ""}
        </td>
        <td><b>${money(res.customerPrice)}</b></td>
        <td>${d > 0 ? `<span style="color:#e11d48">−${money(res.discountAmount)}</span>` : "—"}</td>
        <td>−${money(res.gpAmount)} <small class="muted">(${(profitState.gpRate * 100).toFixed(1)}%)</small></td>
        <td><b>${money(res.payout)}</b></td>
        <td>${money(res.totalCost)}</td>
        <td><b class="profit-badge ${health}" style="font-size:15px;">${money(res.profit)}</b></td>
        <td><span class="margin-chip ${health}">${res.marginPercent.toFixed(1)}%</span></td>
        <td><small>${label}</small></td>
      </tr>
    `;
  }).join("");

  // All store menus overview table
  const allMenuOverview = menus().map((m) => {
    const p = powderChoices(m)[0];
    const itemBom = getItemizedBOM(m.id, p, "Oat milk", 5, "clear", "12");
    const mStoreCalc = calc(m, p, "Oat milk", 5, "clear", "store");
    const mAppCalc = calc(m, p, "Oat milk", 5, "clear", "lineman");

    const mNormal = calculateProfitMetrics({
      price: mAppCalc.price,
      discountPercent: 0,
      gpRate: profitState.gpRate,
      cogs: itemBom.totalCOGS,
      whip: false
    });

    const mPromo10 = calculateProfitMetrics({
      price: mAppCalc.price,
      discountPercent: 10,
      gpRate: profitState.gpRate,
      cogs: itemBom.totalCOGS,
      whip: false
    });

    const mPromo20 = calculateProfitMetrics({
      price: mAppCalc.price,
      discountPercent: 20,
      gpRate: profitState.gpRate,
      cogs: itemBom.totalCOGS,
      whip: false
    });

    return `
      <tr>
        <td><b>${esc(m.name)}</b></td>
        <td>${money(itemBom.totalCOGS)}</td>
        <td><b>${money(mStoreCalc.price - itemBom.totalCOGS)}</b> <small class="muted">(${money(mStoreCalc.price)})</small></td>
        <td>
          <b class="${getProfitHealthClass(mNormal.marginPercent)}">${money(mNormal.profit)}</b>
          <small class="muted">(${mNormal.marginPercent.toFixed(0)}%)</small>
        </td>
        <td>
          <b class="${getProfitHealthClass(mPromo10.marginPercent)}">${money(mPromo10.profit)}</b>
          <small class="muted">(${mPromo10.marginPercent.toFixed(0)}%)</small>
        </td>
        <td>
          <b class="${getProfitHealthClass(mPromo20.marginPercent)}">${money(mPromo20.profit)}</b>
          <small class="muted">(${mPromo20.marginPercent.toFixed(0)}%)</small>
        </td>
        <td><span class="margin-chip ${getProfitHealthClass(mPromo10.marginPercent)}">${getProfitHealthLabel(mPromo10.marginPercent).split(" ")[1]}</span></td>
      </tr>
    `;
  }).join("");

  target.innerHTML = `
    <div class="profit-two-col">
      
      <!-- Left: Itemized Ingredients & Packaging BOM -->
      <div class="bom-card">
        
        <div class="bom-section-title">
          <span>🍵 วัตถุดิบเครื่องดื่ม (Ingredients BOM)</span>
          <span>รวม ${money(bom.totalIngredientsCost)}</span>
        </div>
        <table class="bom-table">
          <thead>
            <tr>
              <th>รายการวัตถุดิบ</th>
              <th>ปริมาณ</th>
              <th>ต้นทุน/หน่วย</th>
              <th style="text-align:right;">รวม (฿)</th>
            </tr>
          </thead>
          <tbody>
            ${bom.ingredients.map((item) => `
              <tr>
                <td><b>${esc(item.name)}</b></td>
                <td>${item.qty} ${item.unit}</td>
                <td>${money(item.unitCost)}/${item.unit}</td>
                <td style="text-align:right;"><b>${money(item.totalCost)}</b></td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <div class="bom-section-title">
          <span>📦 แพ็กเกจจิ้ง & อุปกรณ์ส่งเดลิเวอรี่ (Packaging BOM)</span>
          <span>รวม ${money(bom.totalPackagingCost)}</span>
        </div>
        <table class="bom-table">
          <thead>
            <tr>
              <th>รายการอุปกรณ์</th>
              <th>จำนวน</th>
              <th>ต้นทุน/ชิ้น</th>
              <th style="text-align:right;">รวม (฿)</th>
            </tr>
          </thead>
          <tbody>
            ${bom.packaging.map((item) => `
              <tr>
                <td>${esc(item.name)}</td>
                <td>${item.qty} ${item.unit}</td>
                <td>${money(item.unitCost)}</td>
                <td style="text-align:right;"><b>${money(item.totalCost)}</b></td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        ${packagingNote ? `<div class="bom-special-note">${packagingNote}</div>` : ""}

        <div class="bom-total-bar">
          <div>
            <small>ต้นทุนรวมสุทธิ (COGS)</small>
            <div style="font-size:11px;color:#c0e0c8;">วัตถุดิบ + แพ็กเกจจิ้งครบเซ็ต</div>
          </div>
          <b>${money(bom.totalCOGS)} / แก้ว</b>
        </div>

      </div>

      <!-- Right: Side-by-Side Financial Comparison Cards -->
      <div class="scenarios-container">
        
        <!-- Card A: หน้าร้าน -->
        <div class="scenario-card store">
          <div class="scenario-card-header">
            <div class="scenario-title">🏪 ขายหน้าร้าน (Store)</div>
            <span class="margin-chip ${getProfitHealthClass(scStore.marginPercent)}">GP 0% (รับเต็ม)</span>
          </div>
          <div class="scenario-grid">
            <div class="scenario-row"><span>ราคาขาย:</span> <b>${money(scStore.originalPrice)}</b></div>
            <div class="scenario-row"><span>เงินเข้าร้าน:</span> <b>${money(scStore.payout)}</b></div>
            <div class="scenario-row"><span>ต้นทุน COGS:</span> <b>−${money(scStore.totalCost)}</b></div>
            <div class="scenario-row"><span>หัก GP:</span> <b>฿0.00</b></div>
          </div>
          <div class="scenario-footer">
            <div>
              <small style="color:#556b5c;display:block;">กำไรสุทธิต่อแก้ว</small>
              <b class="profit-badge ${getProfitHealthClass(scStore.marginPercent)}">${money(scStore.profit)}</b>
            </div>
            <span class="margin-chip ${getProfitHealthClass(scStore.marginPercent)}">Margin ${scStore.marginPercent.toFixed(1)}%</span>
          </div>
        </div>

        <!-- Card B: LINE MAN ปกติ -->
        <div class="scenario-card lineman-standard">
          <div class="scenario-card-header">
            <div class="scenario-title">🛵 LINE MAN ปกติ (ไม่เข้าแคมเปญ)</div>
            <span class="margin-chip ${getProfitHealthClass(scNormal.marginPercent)}">หัก GP ${(scNormal.gpRate * 100).toFixed(1)}%</span>
          </div>
          <div class="scenario-grid">
            <div class="scenario-row"><span>ราคาตั้งขาย:</span> <b>${money(scNormal.originalPrice)}</b></div>
            <div class="scenario-row"><span>หัก GP:</span> <b style="color:#b91c1c;">−${money(scNormal.gpAmount)}</b></div>
            <div class="scenario-row"><span>เงินโอนเข้าร้าน:</span> <b>${money(scNormal.payout)}</b></div>
            <div class="scenario-row"><span>ต้นทุน COGS:</span> <b>−${money(scNormal.totalCost)}</b></div>
          </div>
          <div class="scenario-footer">
            <div>
              <small style="color:#556b5c;display:block;">กำไรสุทธิต่อแก้ว</small>
              <b class="profit-badge ${getProfitHealthClass(scNormal.marginPercent)}">${money(scNormal.profit)}</b>
            </div>
            <span class="margin-chip ${getProfitHealthClass(scNormal.marginPercent)}">Margin ${scNormal.marginPercent.toFixed(1)}%</span>
          </div>
        </div>

        <!-- Card C: LINE MAN แคมเปญดีลเดือด Hermes 6.0 -->
        <div class="scenario-card lineman-campaign">
          <div class="scenario-card-header">
            <div class="scenario-title">🔥 แคมเปญดีลเดือด (Hermes 6.0)</div>
            <span class="margin-chip ${getProfitHealthClass(scCampaign.marginPercent)}">
              ${scCampaign.discountPercent > 0 ? `ลด ${scCampaign.discountPercent}%` : "ไม่ใส่โปร"}
            </span>
          </div>
          <div class="scenario-grid">
            <div class="scenario-row"><span>ราคาตั้ง:</span> <b>${money(scCampaign.originalPrice)}</b></div>
            <div class="scenario-row"><span>ส่วนลดร้านออก:</span> <b style="color:#e11d48;">−${money(scCampaign.discountAmount)}</b></div>
            <div class="scenario-row"><span>ลูกค้าจ่ายจริง:</span> <b>${money(scCampaign.customerPrice)}</b></div>
            <div class="scenario-row"><span>หัก GP (${(scCampaign.gpRate * 100).toFixed(1)}%):</span> <b style="color:#b91c1c;">−${money(scCampaign.gpAmount)}</b></div>
            <div class="scenario-row"><span>เงินโอนเข้าร้าน:</span> <b>${money(scCampaign.payout)}</b></div>
            <div class="scenario-row"><span>ต้นทุน COGS:</span> <b>−${money(scCampaign.totalCost)}</b></div>
          </div>
          <div class="scenario-footer">
            <div>
              <small style="color:#556b5c;display:block;">กำไรสุทธิหลังร่วมโปร</small>
              <b class="profit-badge ${getProfitHealthClass(scCampaign.marginPercent)}">${money(scCampaign.profit)}</b>
            </div>
            <div style="text-align:right;">
              <span class="margin-chip ${getProfitHealthClass(scCampaign.marginPercent)}">Margin ${scCampaign.marginPercent.toFixed(1)}%</span>
              <div style="font-size:11px;margin-top:3px;">${getProfitHealthLabel(scCampaign.marginPercent)}</div>
            </div>
          </div>
        </div>

      </div>

    </div>

    <!-- Multi-tier Hermes 6.0 Simulation Table -->
    <div class="campaign-matrix-card" style="margin-top:20px;">
      <h3>🔥 จำลองกำไรแคมเปญดีลเดือด LINE MAN Hermes 6.0 ทุกระดับส่วนลด</h3>
      <p>เปรียบเทียบกำไรสุทธิของเมนู <b>${esc(currentMenu.name)}</b> เมื่อเลือกลด 0%, 5%, 10%, 15%, 20%, 25% (สูงสุด 50.- ตามเกณฑ์ Hermes 6.0)</p>
      
      <div class="table-wrap">
        <table class="matrix-table">
          <thead>
            <tr>
              <th>ระดับแคมเปญ</th>
              <th>ราคาขายลูกค้า</th>
              <th>ส่วนลดร้านออก</th>
              <th>หัก GP (${(profitState.gpRate * 100).toFixed(1)}%)</th>
              <th>เงินโอนเข้าร้าน</th>
              <th>ต้นทุน COGS</th>
              <th>กำไรสุทธิ / แก้ว</th>
              <th>Margin %</th>
              <th>คำแนะนำ</th>
            </tr>
          </thead>
          <tbody>
            ${tierRows}
          </tbody>
        </table>
      </div>
    </div>

    <!-- All Menus Comparison Table -->
    <div class="all-menus-matrix-card" style="margin-top:20px;">
      <h3>📋 สรุปเปรียบเทียบกำไรทุกเมนูในร้าน (Master Menu Matrix)</h3>
      <p>ภาพรวมกำไรทุกเมนูเมื่อขายหน้าร้าน vs LINE MAN ปกติ vs แคมเปญดีลเดือด (ลด 10% / 20%)</p>
      
      <div class="table-wrap">
        <table class="matrix-table">
          <thead>
            <tr>
              <th>เมนู</th>
              <th>ต้นทุน COGS</th>
              <th>กำไรหน้าร้าน</th>
              <th>กำไร LINE MAN ปกติ</th>
              <th>กำไร ดีลเดือด (ลด 10%)</th>
              <th>กำไร ดีลเดือด (ลด 20%)</th>
              <th>สถานะความคุ้มค่า</th>
            </tr>
          </thead>
          <tbody>
            ${allMenuOverview}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderProfitTabIfActive() {
  if (activeTab() !== "profit") return;

  const target = document.querySelector("#admin-content");
  if (!target) return;

  target.innerHTML = profitTab();
  renderSimulatorDynamicContent();
}

/* ── Event delegation for Profit Simulator ── */
document.addEventListener("click", (event) => {
  // Tab switch
  const tab = event.target.closest(".tab-btn");
  if (tab && tab.dataset.tab === "profit") {
    queueMicrotask(renderProfitTabIfActive);
    return;
  }

  // GP preset buttons
  const gpBtn = event.target.closest(".gp-preset-btn");
  if (gpBtn) {
    profitState.gpRate = Number(gpBtn.dataset.gp) || 0.321;
    document.querySelectorAll(".gp-preset-btn").forEach((b) => b.classList.toggle("active", b === gpBtn));
    renderSimulatorDynamicContent();
    return;
  }

  // Discount pill buttons
  const discBtn = event.target.closest(".discount-pill-btn");
  if (discBtn) {
    profitState.discountPercent = Number(discBtn.dataset.disc) || 0;
    document.querySelectorAll(".discount-pill-btn").forEach((b) => b.classList.toggle("active", b === discBtn));
    renderSimulatorDynamicContent();
    return;
  }
});

document.addEventListener("change", (event) => {
  const id = event.target.id;
  if (!id) return;

  if (id === "sim-menu-select") {
    profitState.menuId = event.target.value;
    const m = menus().find((item) => item.id === profitState.menuId) || menus()[0];
    const p = powderChoices(m)[0];
    profitState.powderKey = p;
    const sCalc = calc(m, p, profitState.milk, 5, "clear", "store", profitState.size);
    const aCalc = calc(m, p, profitState.milk, 5, "clear", "lineman", profitState.size);
    profitState.storePrice = sCalc.price;
    profitState.linemanPrice = aCalc.price;
    renderProfitTabIfActive();
    return;
  }

  if (id === "sim-powder-select") {
    profitState.powderKey = event.target.value;
    renderSimulatorDynamicContent();
    return;
  }

  if (id === "sim-milk-select") {
    profitState.milk = event.target.value;
    renderSimulatorDynamicContent();
    return;
  }

  if (id === "sim-size-select") {
    profitState.size = event.target.value;
    renderSimulatorDynamicContent();
    return;
  }

  if (id === "sim-whip") {
    profitState.whip = event.target.checked;
    renderSimulatorDynamicContent();
    return;
  }
});

document.addEventListener("input", (event) => {
  const id = event.target.id;
  if (!id) return;

  if (id === "sim-store-price") {
    profitState.storePrice = Number(event.target.value) || 0;
    renderSimulatorDynamicContent();
  }

  if (id === "sim-lineman-price") {
    profitState.linemanPrice = Number(event.target.value) || 0;
    renderSimulatorDynamicContent();
  }
});

/* Export for window bridge */
window.__kifunProfit = {
  render: renderProfitTabIfActive
};

/* ── Init ─────────────────────────────────────────────────────── */
initSupabase();