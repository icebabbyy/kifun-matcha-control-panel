/* ═══════════════════════════════════════════════════════════════
   KIFUN MATCHA — main entry (ES module)
   Wires up:
   1. Supabase real-time sync layer (powders table + app_state + images)
   2. Comprehensive Dynamic Profit, Recipe, Packaging & Campaign Simulator
   ═══════════════════════════════════════════════════════════════ */

import { 
  supabase, 
  fetchAppState, 
  saveAppState, 
  fetchPowders, 
  uploadMenuImage, 
  getAdminSession,
  loginAdminWithSupabase,
  logoutAdminWithSupabase,
  verifyAdminPasscodeWithSupabase 
} from "./supabase.js";

window.__kifun_auth = {
  getAdminSession,
  loginAdminWithSupabase,
  logoutAdminWithSupabase,
  verifyPasscode: verifyAdminPasscodeWithSupabase
};
window.__kifun_verifyPasscode = verifyAdminPasscodeWithSupabase;

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
let supabasePowdersList = [];

async function initSupabase() {
  try {
    const { error } = await supabase
      .from("app_state")
      .select("id")
      .limit(1);

    if (error) throw error;

    supabaseReady = true;
    console.log("[KIFUN] Supabase connected");

    // Restore persistent session from Supabase Auth / Cookie
    try {
      const session = await getAdminSession();
      if (session) {
        K().setAdminAuthenticated(true);
        console.log("[KIFUN] Restored persistent admin session from Supabase Auth");
      }
    } catch (authErr) {
      console.warn("[KIFUN] Session check:", authErr);
    }

    // Load powders table
    try {
      supabasePowdersList = await fetchPowders();
      console.log(`[KIFUN] Loaded ${supabasePowdersList.length} powders from Supabase powders table`);
    } catch (pErr) {
      console.warn("[KIFUN] Could not fetch powders:", pErr);
    }

    // Load app state
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
   DYNAMIC PROFIT, RECIPE & CAMPAIGN SIMULATOR ENGINE
   ═══════════════════════════════════════════════════════════════ */

const MILK_COSTS = {
  fresh: { label: "นมสด (MM Milk)", cost: 5.35, storeAdd: 0, linemanAdd: 0, desc: "100ml @ ฿0.0535/ml" },
  oat: { label: "นม Oat (Goodmate)", cost: 9.50, storeAdd: 15, linemanAdd: 20, desc: "100ml @ ฿0.095/ml (+฿15/฿20)" },
  mixed: { label: "นมผสม (Mixed 60:40)", cost: 7.01, storeAdd: 10, linemanAdd: 15, desc: "นมสด 60ml + Oat 40ml (+฿10/฿15)" },
  none: { label: "ไม่ใส่นม (สำหรับ Clear)", cost: 0.00, storeAdd: 0, linemanAdd: 0, desc: "น้ำเปล่า + น้ำแข็ง" }
};

const BREW_METHODS = {
  latte: { label: "🥛 Latte (ลาเต้)", defaultGrams: 5, defaultMilk: "oat", packCost: 4.91, desc: "ผง + น้ำร้อน 50ml + นม 100ml" },
  coldwhisk: { label: "🌿 Cold Whisk (โคลด์วิสก์)", defaultGrams: 5, defaultMilk: "oat", packCost: 4.91, desc: "ผง + นม 100ml ตีวิสก์เนื้อโฟม" },
  clear: { label: "🫧 Clear Matcha (ชาใส)", defaultGrams: 3, defaultMilk: "none", packCost: 4.91, desc: "ผง + น้ำร้อน 50ml + น้ำเปล่า 100ml" },
  coconut: { label: "🥥 Coconut Matcha (มัทฉะมะพร้าว)", defaultGrams: 4, defaultMilk: "none", liquidCost: 21.71, packCost: 5.98, desc: "น้ำมะพร้าว 135ml (฿15.53) + Oat milk 65ml (฿6.18) + ถาดโฟม" },
  coconutfoam: { label: "☁️ Coconut Foam Matcha", defaultGrams: 4, defaultMilk: "none", liquidCost: 25.00, packCost: 5.98, desc: "น้ำมะพร้าว 135ml + Oat milk 65ml + โฟม (฿3.29) + ถาดโฟม" },
  biscoff: { label: "🍪 Biscoff Matcha (บิสคอฟ)", defaultGrams: 5, defaultMilk: "fresh", extraCost: 11.40, packCost: 5.98, desc: "สเปรด 15g (฿6.98) + บิสกิต 16g (฿4.42) + ถาดโฟม (฿1.07)" },
  nutella: { label: "🍫 Nutella Matcha (นูเทลล่า)", defaultGrams: 5, defaultMilk: "fresh", extraCost: 14.10, packCost: 4.91, desc: "สเปรดนูเทลล่า 30g (฿14.10) + นม 100ml" }
};

const PACK_ITEMS_DETAIL = {
  basic: [
    { name: "14oz PET cup (Basic Pac FP-14)", qty: 1, unitCost: 2.80 },
    { name: "98mm sipper lid with plug (ฝายกดื่มมีจุก)", qty: 1, unitCost: 0.47 },
    { name: "Spill-proof lid sheet (แผ่นรองฝาแก้ว)", qty: 1, unitCost: 0.096 },
    { name: "Cold whisk pouch 200ml (ซองแยกน้ำแข็ง)", qty: 1, unitCost: 0.99 },
    { name: "Cup bag 6×11 (ถุงหิ้วใส 1 แก้ว)", qty: 1, unitCost: 0.40 },
    { name: "6mm straw (หลอด)", qty: 1, unitCost: 0.15 }
  ],
  tray: { name: "Topping tray 98mm (ถาดรองโฟม)", qty: 1, unitCost: 1.07 }
};

const profitState = {
  powderName: "NOKO Premium Grade Nishio",
  powderCostPerGram: 3.71,
  powderGrams: 5.0,
  brewMethod: "latte",
  milkType: "oat",
  storePrice: 99,
  linemanPrice: 149,
  gpRate: 0.321, // 32.1% default
  discountPercent: 10, // 10% Hermes 6.0 default
  whip: false,
  matrixBrew: "latte",
  matrixMilk: "oat",
  matrixGrams: 5,
  matrixSupplierFilter: "all"
};

function getAllPowders() {
  if (supabasePowdersList && supabasePowdersList.length > 0) {
    return supabasePowdersList;
  }
  // Fallback if supabase not yet loaded
  return Object.entries(powders()).map(([key, p]) => ({
    name: p.label || key,
    supplier: p.supplier || "House",
    cost_per_gram: p.cost || 3.71,
    notes: p.note || ""
  }));
}

function calculateDynamicCOGS(powderCostG, grams, brewMethodKey, milkTypeKey, hasWhip = false) {
  const brew = BREW_METHODS[brewMethodKey] || BREW_METHODS.latte;
  const milk = MILK_COSTS[milkTypeKey] || MILK_COSTS.fresh;

  const powderCost = grams * powderCostG;
  const liquidCost = brew.liquidCost !== undefined ? brew.liquidCost : (brewMethodKey === "clear" ? 0 : milk.cost);
  const extraCost = brew.extraCost || 0;
  const packCost = brew.packCost || 4.91;
  const whipCost = hasWhip ? 3.29 : 0;

  const totalCOGS = powderCost + liquidCost + extraCost + packCost + whipCost;

  return {
    powderCost,
    liquidCost,
    extraCost,
    packCost,
    whipCost,
    totalCOGS,
    brew,
    milk
  };
}

function calculateProfitMetrics({
  price,
  discountPercent = 0,
  gpRate = 0.321,
  cogs = 0
}) {
  const discountAmount = Math.min(price * (discountPercent / 100), 50); // max 50 THB under Hermes 6.0
  const customerPrice = Math.max(0, price - discountAmount);

  const gpAmount = customerPrice * gpRate;
  const payout = customerPrice - gpAmount;

  const profit = payout - cogs;
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
  const allPowders = getAllPowders();

  // Find currently selected powder
  let curPowder = allPowders.find((p) => p.name === profitState.powderName) || allPowders[0];
  if (curPowder) {
    profitState.powderName = curPowder.name;
    profitState.powderCostPerGram = Number(curPowder.cost_per_gram) || 3.71;
  }

  return `
    <div class="profit-calculator-root">
      
      <!-- Top Card: Interactive Recipe & Parameter Controls -->
      <div class="profit-top-card">
        <div class="profit-top-header">
          <div>
            <h2>📊 คำนวณกำไร & จำลองแคมเปญ LINE MAN (Dynamic Engine)</h2>
            <p>คำนวณจาก <b>ผงชา + จำนวนกรัม + วิธีชง + ชนิดนม + แพ็กเกจจิ้ง</b> ซิงก์ข้อมูลสดกับ Supabase Database</p>
          </div>
          <div class="campaign-badge-pill">
            <i></i> Database-Backed (Supabase)
          </div>
        </div>

        <div class="profit-controls-grid">
          
          <!-- Powder Selector -->
          <div class="profit-field" style="grid-column: span 2;">
            <label>🍵 เลือกผงชา (Matcha Powder จาก Supabase — ${allPowders.length} รายการ)</label>
            <select id="sim-powder-select" style="font-weight:600;">
              ${allPowders.map((p) => {
                const costG = Number(p.cost_per_gram) || 0;
                const isSel = p.name === profitState.powderName;
                return `<option value="${esc(p.name)}" data-cost="${costG}" ${isSel ? "selected" : ""}>
                  ${esc(p.supplier ? `[${p.supplier}] ` : "")}${esc(p.name)} — ฿${costG.toFixed(2)}/g (1kg ฿${p.package_price ? Number(p.package_price).toLocaleString() : (costG * 1000).toLocaleString()})
                </option>`;
              }).join("")}
            </select>
          </div>

          <!-- Powder Grams -->
          <div class="profit-field">
            <label>⚖️ ปริมาณผง (กรัม / Dose)</label>
            <div style="display:flex;gap:6px;align-items:center;">
              <input id="sim-grams-input" type="number" step="0.5" min="1" max="20" value="${profitState.powderGrams}" style="font-weight:bold;width:80px;">
              <div style="display:flex;gap:4px;">
                <button class="gp-preset-btn ${profitState.powderGrams === 3 ? "active" : ""}" data-grams="3">3g</button>
                <button class="gp-preset-btn ${profitState.powderGrams === 4 ? "active" : ""}" data-grams="4">4g</button>
                <button class="gp-preset-btn ${profitState.powderGrams === 5 ? "active" : ""}" data-grams="5">5g</button>
                <button class="gp-preset-btn ${profitState.powderGrams === 9.2 ? "active" : ""}" data-grams="9.2">9.2g</button>
              </div>
            </div>
          </div>

          <!-- Brew Method -->
          <div class="profit-field">
            <label>🫖 วิธีชง (Brew Method)</label>
            <select id="sim-brew-select" style="font-weight:600;">
              <option value="latte" ${profitState.brewMethod === "latte" ? "selected" : ""}>🥛 Latte (ลาเต้)</option>
              <option value="coldwhisk" ${profitState.brewMethod === "coldwhisk" ? "selected" : ""}>🌿 Cold Whisk (โคลด์วิสก์)</option>
              <option value="clear" ${profitState.brewMethod === "clear" ? "selected" : ""}>🫧 Clear Matcha (ชาใส)</option>
              <option value="coconut" ${profitState.brewMethod === "coconut" ? "selected" : ""}>🥥 Coconut Matcha (มัทฉะมะพร้าว)</option>
              <option value="coconutfoam" ${profitState.brewMethod === "coconutfoam" ? "selected" : ""}>☁️ Coconut Foam Matcha</option>
              <option value="biscoff" ${profitState.brewMethod === "biscoff" ? "selected" : ""}>🍪 Biscoff Matcha (บิสคอฟ)</option>
              <option value="nutella" ${profitState.brewMethod === "nutella" ? "selected" : ""}>🍫 Nutella Matcha (นูเทลล่า)</option>
            </select>
          </div>

          <!-- Milk Option -->
          <div class="profit-field">
            <label>🥛 ชนิดนม (Milk Option)</label>
            <select id="sim-milk-select" ${profitState.brewMethod === "clear" ? "disabled" : ""}>
              <option value="fresh" ${profitState.milkType === "fresh" ? "selected" : ""}>🥛 นมสด (MM Milk — ฿5.35/100ml)</option>
              <option value="oat" ${profitState.milkType === "oat" ? "selected" : ""}>🌾 นม Oat (Goodmate — ฿9.50/100ml)</option>
              <option value="mixed" ${profitState.milkType === "mixed" ? "selected" : ""}>🧋 นมผสม (Mixed 60:40 — ฿7.01/100ml)</option>
              <option value="none" ${profitState.milkType === "none" ? "selected" : ""}>🚫 ไม่ใส่นม (สำหรับ Clear)</option>
            </select>
          </div>

          <!-- Store Price -->
          <div class="profit-field">
            <label>ราคาขายหน้าร้าน (฿)</label>
            <input id="sim-store-price" type="number" step="1" min="0" value="${profitState.storePrice}">
          </div>

          <!-- LINE MAN Price -->
          <div class="profit-field">
            <label>ราคาตั้งบน LINE MAN (฿)</label>
            <input id="sim-lineman-price" type="number" step="1" min="0" value="${profitState.linemanPrice}">
          </div>

        </div>

        <!-- Secondary Controls: GP Presets & Hermes Discounts -->
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
            แถมวิปครีม 15ml (+฿3.29)
          </label>

        </div>

      </div>

      <!-- Dynamic Section: Detailed BOM & Comparison Cards -->
      <div id="sim-dynamic-section"></div>

    </div>
  `;
}

function renderSimulatorDynamicContent() {
  const target = document.querySelector("#sim-dynamic-section");
  if (!target) return;

  const cogsData = calculateDynamicCOGS(
    profitState.powderCostPerGram,
    profitState.powderGrams,
    profitState.brewMethod,
    profitState.milkType,
    profitState.whip
  );

  const storePrice = Number(profitState.storePrice) || 0;
  const linemanPrice = Number(profitState.linemanPrice) || 0;

  // Scenario 1: หน้าร้าน
  const scStore = calculateProfitMetrics({
    price: storePrice,
    discountPercent: 0,
    gpRate: 0,
    cogs: cogsData.totalCOGS
  });

  // Scenario 2: LINE MAN ปกติ (ไม่เข้าแคมเปญ)
  const scNormal = calculateProfitMetrics({
    price: linemanPrice,
    discountPercent: 0,
    gpRate: profitState.gpRate,
    cogs: cogsData.totalCOGS
  });

  // Scenario 3: LINE MAN แคมเปญดีลเดือด (Hermes 6.0)
  const scCampaign = calculateProfitMetrics({
    price: linemanPrice,
    discountPercent: profitState.discountPercent,
    gpRate: profitState.gpRate,
    cogs: cogsData.totalCOGS
  });

  // Multi-tier Hermes table data (0%, 5%, 10%, 15%, 20%, 25%)
  const discountTiers = [0, 5, 10, 15, 20, 25];
  const tierRows = discountTiers.map((d) => {
    const res = calculateProfitMetrics({
      price: linemanPrice,
      discountPercent: d,
      gpRate: profitState.gpRate,
      cogs: cogsData.totalCOGS
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
        <td>${money(res.cogs)}</td>
        <td><b class="profit-badge ${health}" style="font-size:15px;">${money(res.profit)}</b></td>
        <td><span class="margin-chip ${health}">${res.marginPercent.toFixed(1)}%</span></td>
        <td><small>${label}</small></td>
      </tr>
    `;
  }).join("");

  // Master Powder & Menu Comparison Matrix Table
  const allPowders = getAllPowders();
  let matrixPowders = allPowders;

  if (profitState.matrixSupplierFilter !== "all") {
    if (profitState.matrixSupplierFilter === "thep") {
      matrixPowders = allPowders.filter((p) => p.supplier?.includes("เทพมัทฉะ") || p.name?.includes("Thep"));
    } else if (profitState.matrixSupplierFilter === "yume") {
      matrixPowders = allPowders.filter((p) => p.supplier?.includes("YUMEMATCHA") || p.name?.includes("YUME"));
    } else if (profitState.matrixSupplierFilter === "base") {
      matrixPowders = allPowders.filter((p) => (Number(p.cost_per_gram) || 0) <= 6.0);
    } else {
      matrixPowders = allPowders.filter((p) => p.supplier === profitState.matrixSupplierFilter);
    }
  }

  const matrixRows = matrixPowders.map((p) => {
    const costG = Number(p.cost_per_gram) || 3.71;
    const cogs = calculateDynamicCOGS(
      costG,
      profitState.matrixGrams,
      profitState.matrixBrew,
      profitState.matrixMilk,
      false
    );

    // Dynamic price calculation based on powder grade difference
    const nokoCost = 3.71 * profitState.matrixGrams;
    const powderDelta = Math.max(0, (costG * profitState.matrixGrams) - nokoCost);
    const storeBase = profitState.matrixBrew === "clear" ? 69 : (profitState.matrixBrew === "coconut" ? 95 : 99);
    const linemanBase = profitState.matrixBrew === "clear" ? 99 : (profitState.matrixBrew === "coconut" ? 125 : 149);

    const mStorePrice = Math.round((storeBase + powderDelta + (profitState.matrixMilk === "oat" ? 15 : profitState.matrixMilk === "mixed" ? 10 : 0)) / 5) * 5;
    const mLinemanPrice = Math.round((linemanBase + (powderDelta * 1.47) + (profitState.matrixMilk === "oat" ? 20 : profitState.matrixMilk === "mixed" ? 15 : 0)) / 5) * 5;

    const mStoreProfit = mStorePrice - cogs.totalCOGS;
    const mNormal = calculateProfitMetrics({ price: mLinemanPrice, discountPercent: 0, gpRate: profitState.gpRate, cogs: cogs.totalCOGS });
    const mPromo10 = calculateProfitMetrics({ price: mLinemanPrice, discountPercent: 10, gpRate: profitState.gpRate, cogs: cogs.totalCOGS });
    const mPromo20 = calculateProfitMetrics({ price: mLinemanPrice, discountPercent: 20, gpRate: profitState.gpRate, cogs: cogs.totalCOGS });

    const isCurrent = p.name === profitState.powderName;

    return `
      <tr class="${isCurrent ? "active-tier" : ""}">
        <td>
          <b>${esc(p.name)}</b>
          ${p.supplier ? `<br><small class="muted">${esc(p.supplier)}</small>` : ""}
        </td>
        <td style="text-align:right;"><b>฿${costG.toFixed(2)}</b>/g</td>
        <td style="text-align:right;">${money(cogs.powderCost)}</td>
        <td style="text-align:right;font-weight:700;color:var(--green);">${money(cogs.totalCOGS)}</td>
        <td style="text-align:right;"><b>${money(mStoreProfit)}</b> <small class="muted">(${money(mStorePrice)})</small></td>
        <td style="text-align:right;">
          <b class="${getProfitHealthClass(mNormal.marginPercent)}">${money(mNormal.profit)}</b>
          <small class="muted">(${mNormal.marginPercent.toFixed(0)}%)</small>
        </td>
        <td style="text-align:right;">
          <b class="${getProfitHealthClass(mPromo10.marginPercent)}">${money(mPromo10.profit)}</b>
          <small class="muted">(${mPromo10.marginPercent.toFixed(0)}%)</small>
        </td>
        <td style="text-align:right;">
          <b class="${getProfitHealthClass(mPromo20.marginPercent)}">${money(mPromo20.profit)}</b>
          <small class="muted">(${mPromo20.marginPercent.toFixed(0)}%)</small>
        </td>
        <td style="text-align:center;">
          <span class="margin-chip ${getProfitHealthClass(mPromo10.marginPercent)}">
            ${getProfitHealthLabel(mPromo10.marginPercent).split(" ")[1]}
          </span>
        </td>
      </tr>
    `;
  }).join("");

  target.innerHTML = `
    <div class="profit-two-col">
      
      <!-- Left: Itemized Ingredients & Packaging BOM -->
      <div class="bom-card">
        
        <div class="bom-section-title">
          <span>🍵 วัตถุดิบเครื่องดื่ม (${cogsData.brew.label})</span>
          <span>รวม ${money(cogsData.powderCost + cogsData.liquidCost + cogsData.extraCost)}</span>
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
            <tr>
              <td><b>${esc(profitState.powderName)}</b></td>
              <td>${profitState.powderGrams}g</td>
              <td>฿${profitState.powderCostPerGram.toFixed(2)}/g</td>
              <td style="text-align:right;"><b>${money(cogsData.powderCost)}</b></td>
            </tr>
            ${profitState.brewMethod === "coconut" || profitState.brewMethod === "coconutfoam" ? `
              <tr>
                <td>น้ำมะพร้าวสดแท้ 100%</td>
                <td>135ml</td>
                <td>฿0.115/ml</td>
                <td style="text-align:right;"><b>฿15.53</b></td>
              </tr>
              <tr>
                <td>Goodmate Oat Milk</td>
                <td>65ml</td>
                <td>฿0.095/ml</td>
                <td style="text-align:right;"><b>฿6.18</b></td>
              </tr>
            ` : profitState.brewMethod !== "clear" ? `
              <tr>
                <td>${esc(cogsData.milk.label)}</td>
                <td>100ml</td>
                <td>${cogsData.milk.desc}</td>
                <td style="text-align:right;"><b>${money(cogsData.liquidCost)}</b></td>
              </tr>
            ` : `
              <tr>
                <td>น้ำร้อน + น้ำเปล่าเย็น</td>
                <td>150ml</td>
                <td>—</td>
                <td style="text-align:right;"><b>฿0.00</b></td>
              </tr>
            `}
            ${cogsData.extraCost > 0 ? `
              <tr>
                <td>ท็อปปิ้ง / สเปรด / บิสกิต</td>
                <td>ตามสูตร</td>
                <td>—</td>
                <td style="text-align:right;"><b>${money(cogsData.extraCost)}</b></td>
              </tr>
            ` : ""}
            ${cogsData.whipCost > 0 ? `
              <tr>
                <td>วิปครีมสด 15ml</td>
                <td>15ml</td>
                <td>฿0.22/ml</td>
                <td style="text-align:right;"><b>฿3.29</b></td>
              </tr>
            ` : ""}
          </tbody>
        </table>

        <div class="bom-section-title">
          <span>📦 แพ็กเกจจิ้ง & อุปกรณ์ส่งเดลิเวอรี่</span>
          <span>รวม ${money(cogsData.packCost)}</span>
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
            ${PACK_ITEMS_DETAIL.basic.map((item) => `
              <tr>
                <td>${esc(item.name)}</td>
                <td>${item.qty} ชิ้น</td>
                <td>฿${item.unitCost.toFixed(2)}</td>
                <td style="text-align:right;"><b>฿${(item.qty * item.unitCost).toFixed(2)}</b></td>
              </tr>
            `).join("")}
            ${cogsData.packCost > 5.0 ? `
              <tr>
                <td>${esc(PACK_ITEMS_DETAIL.tray.name)}</td>
                <td>1 ชิ้น</td>
                <td>฿1.07</td>
                <td style="text-align:right;"><b>฿1.07</b></td>
              </tr>
            ` : ""}
          </tbody>
        </table>

        <div class="bom-total-bar">
          <div>
            <small>ต้นทุนรวมสุทธิ (COGS)</small>
            <div style="font-size:11px;color:#c0e0c8;">ผงชา (${profitState.powderGrams}g) + ${cogsData.brew.label} + แพ็กเกจจิ้งครบเซ็ต</div>
          </div>
          <b>${money(cogsData.totalCOGS)} / แก้ว</b>
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
            <div class="scenario-row"><span>ต้นทุน COGS:</span> <b>−${money(scStore.cogs)}</b></div>
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
            <div class="scenario-row"><span>ต้นทุน COGS:</span> <b>−${money(scNormal.cogs)}</b></div>
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
            <div class="scenario-row"><span>ต้นทุน COGS:</span> <b>−${money(scCampaign.cogs)}</b></div>
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
      <p>เปรียบเทียบกำไรสุทธิของ <b>${esc(profitState.powderName)}</b> (${cogsData.brew.label}, ${profitState.powderGrams}g) เมื่อเลือกลด 0%, 5%, 10%, 15%, 20%, 25%</p>
      
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

    <!-- Master Powder & Menu Comparison Matrix Table -->
    <div class="all-menus-matrix-card" style="margin-top:20px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:12px;">
        <div>
          <h3>📋 ตารางเปรียบเทียบกำไรทุกผงชา (Master Powder & Recipe Matrix)</h3>
          <p>คำนวณกำไรสดตามสูตรชงที่เลือกแบบ Real-time สำหรับผงชาทั้งหมดใน Supabase</p>
        </div>
        
        <!-- Interactive Mode Switchers for the Matrix -->
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
          <span style="font-size:12px;font-weight:bold;color:#4b6352;">สูตรที่แสดงในตาราง:</span>
          <button class="gp-preset-btn ${profitState.matrixBrew === "latte" && profitState.matrixMilk === "fresh" ? "active" : ""}" data-matrix-brew="latte" data-matrix-milk="fresh" data-matrix-grams="5">🥛 Latte 5g (นมสด)</button>
          <button class="gp-preset-btn ${profitState.matrixBrew === "latte" && profitState.matrixMilk === "oat" ? "active" : ""}" data-matrix-brew="latte" data-matrix-milk="oat" data-matrix-grams="5">🌾 Latte 5g (นม Oat)</button>
          <button class="gp-preset-btn ${profitState.matrixBrew === "latte" && profitState.matrixMilk === "mixed" ? "active" : ""}" data-matrix-brew="latte" data-matrix-milk="mixed" data-matrix-grams="5">🧋 Latte 5g (นมผสม)</button>
          <button class="gp-preset-btn ${profitState.matrixBrew === "coldwhisk" ? "active" : ""}" data-matrix-brew="coldwhisk" data-matrix-milk="oat" data-matrix-grams="5">🌿 Cold Whisk 5g</button>
          <button class="gp-preset-btn ${profitState.matrixBrew === "clear" ? "active" : ""}" data-matrix-brew="clear" data-matrix-milk="none" data-matrix-grams="3">🫧 Clear 3g</button>
          <button class="gp-preset-btn ${profitState.matrixBrew === "coconut" ? "active" : ""}" data-matrix-brew="coconut" data-matrix-milk="none" data-matrix-grams="4">🥥 Coconut 4g</button>
        </div>
      </div>

      <!-- Supplier Filter Pills for the Matrix -->
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:14px;padding:8px 12px;background:#f8faf7;border-radius:10px;">
        <span style="font-size:11px;font-weight:bold;color:#556b5c;">กรองซัพพลายเออร์:</span>
        <button class="gp-preset-btn ${profitState.matrixSupplierFilter === "all" ? "active" : ""}" data-matrix-filter="all">ทั้งหมด (${allPowders.length})</button>
        <button class="gp-preset-btn ${profitState.matrixSupplierFilter === "thep" ? "active" : ""}" data-matrix-filter="thep">🍃 เทพมัทฉะ (8)</button>
        <button class="gp-preset-btn ${profitState.matrixSupplierFilter === "yume" ? "active" : ""}" data-matrix-filter="yume">🍵 YUMEMATCHA (8)</button>
        <button class="gp-preset-btn ${profitState.matrixSupplierFilter === "base" ? "active" : ""}" data-matrix-filter="base">🟢 Base ประหยัด (≤฿6.0/g)</button>
      </div>
      
      <div class="table-wrap">
        <table class="matrix-table">
          <thead>
            <tr>
              <th>ผงชา / Supplier</th>
              <th style="text-align:right;">ราคาผง/g</th>
              <th style="text-align:right;">ค่าผง (${profitState.matrixGrams}g)</th>
              <th style="text-align:right;">ต้นทุน COGS</th>
              <th style="text-align:right;">กำไรหน้าร้าน</th>
              <th style="text-align:right;">กำไร LINE MAN ปกติ</th>
              <th style="text-align:right;">กำไร ดีลเดือด (ลด 10%)</th>
              <th style="text-align:right;">กำไร ดีลเดือด (ลด 20%)</th>
              <th style="text-align:center;">ความคุ้มค่า</th>
            </tr>
          </thead>
          <tbody>
            ${matrixRows}
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
  const gpBtn = event.target.closest(".gp-preset-btn[data-gp]");
  if (gpBtn) {
    profitState.gpRate = Number(gpBtn.dataset.gp) || 0.321;
    document.querySelectorAll(".gp-preset-btn[data-gp]").forEach((b) => b.classList.toggle("active", b === gpBtn));
    renderSimulatorDynamicContent();
    return;
  }

  // Grams quick preset buttons
  const gramsBtn = event.target.closest(".gp-preset-btn[data-grams]");
  if (gramsBtn) {
    profitState.powderGrams = Number(gramsBtn.dataset.grams) || 5;
    const inp = document.querySelector("#sim-grams-input");
    if (inp) inp.value = profitState.powderGrams;
    document.querySelectorAll(".gp-preset-btn[data-grams]").forEach((b) => b.classList.toggle("active", b === gramsBtn));
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

  // Matrix formula toggles
  const mBtn = event.target.closest("[data-matrix-brew]");
  if (mBtn) {
    profitState.matrixBrew = mBtn.dataset.matrixBrew;
    profitState.matrixMilk = mBtn.dataset.matrixMilk;
    profitState.matrixGrams = Number(mBtn.dataset.matrixGrams) || 5;
    renderSimulatorDynamicContent();
    return;
  }

  // Matrix supplier filter
  const mFilterBtn = event.target.closest("[data-matrix-filter]");
  if (mFilterBtn) {
    profitState.matrixSupplierFilter = mFilterBtn.dataset.matrixFilter;
    renderSimulatorDynamicContent();
    return;
  }
});

document.addEventListener("change", (event) => {
  const id = event.target.id;
  if (!id) return;

  if (id === "sim-powder-select") {
    const sel = event.target;
    profitState.powderName = sel.value;
    const opt = sel.selectedOptions[0];
    profitState.powderCostPerGram = Number(opt?.dataset?.cost) || 3.71;

    // Auto-calculate suggested prices
    const nokoCost = 3.71 * profitState.powderGrams;
    const powderDelta = Math.max(0, (profitState.powderCostPerGram * profitState.powderGrams) - nokoCost);
    const storeBase = profitState.brewMethod === "clear" ? 69 : (profitState.brewMethod === "coconut" ? 95 : 99);
    const linemanBase = profitState.brewMethod === "clear" ? 99 : (profitState.brewMethod === "coconut" ? 125 : 149);

    profitState.storePrice = Math.round((storeBase + powderDelta + (profitState.milkType === "oat" ? 15 : profitState.milkType === "mixed" ? 10 : 0)) / 5) * 5;
    profitState.linemanPrice = Math.round((linemanBase + (powderDelta * 1.47) + (profitState.milkType === "oat" ? 20 : profitState.milkType === "mixed" ? 15 : 0)) / 5) * 5;

    renderProfitTabIfActive();
    return;
  }

  if (id === "sim-brew-select") {
    profitState.brewMethod = event.target.value;
    const bInfo = BREW_METHODS[profitState.brewMethod];
    if (bInfo) {
      profitState.powderGrams = bInfo.defaultGrams;
      profitState.milkType = bInfo.defaultMilk;
    }
    renderProfitTabIfActive();
    return;
  }

  if (id === "sim-milk-select") {
    profitState.milkType = event.target.value;
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

  if (id === "sim-grams-input") {
    profitState.powderGrams = Number(event.target.value) || 5;
    renderSimulatorDynamicContent();
  }

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