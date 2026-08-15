/* KIFUN MATCHA — main entry (ES module)
   Loads after app.js (classic script) and wires up:
   1. Supabase as the database layer (state + images)
   2. Profit calculator tab
*/
import { supabase, fetchAppState, saveAppState, uploadMenuImage } from "./supabase.js";

/* Bridge to app.js globals (classic script). ES modules cannot see
   const/let globals, so app.js exposes them via window.__kifun. */
const K = () => window.__kifun;
const menus = () => K().menus;
const activeTab = () => K().activeTab;
const calc = (...a) => K().calc(...a);
const powderChoices = (...a) => K().powderChoices(...a);
const esc = (...a) => K().esc(...a);
const money = (...a) => K().money(...a);

/* ── Supabase sync status ─────────────────────────────────────── */
let supabaseReady = false;
let supabaseError = null;

async function initSupabase() {
  try {
    // Test connection by fetching the app_state table (created by supabase-setup.sql).
    // The `powders` table is not part of the setup script, so querying it here
    // would always fail and leave supabaseReady=false.
    const { data, error } = await supabase.from("app_state").select("id").limit(1);
    if (error) throw error;
    supabaseReady = true;
    console.log("[KIFUN] Supabase connected");

    // Load persisted app state (menu status, stock, sales, home editor, images)
    try {
      const saved = await fetchAppState();
      if (saved && typeof saved === "object") {
        K().setState(saved);
        console.log("[KIFUN] App state loaded from Supabase");
      } else {
        // First run: persist the default state so every device starts synced
        await saveAppState(K().state);
        console.log("[KIFUN] Default state pushed to Supabase");
      }
    } catch (stateErr) {
      console.warn("[KIFUN] Could not load app state:", stateErr.message || stateErr);
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
    .catch((err) => console.warn("[KIFUN] Save failed:", err.message || err));
});

/* ── Menu photo upload (resized ≤640×640 → Supabase Storage) ──── */
window.addEventListener("kifun:menu-image-selected", async (event) => {
  const { menuId, file } = event.detail || {};
  const toast = (msg) => { const t = document.querySelector("#toast"); if (!t) return; t.textContent = msg; t.classList.add("show"); clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove("show"), 2600); };
  if (!menuId || !file) return;
  toast("กำลังอัปโหลดรูป… (ปรับไม่เกิน 640×640)");
  try {
    if (!supabaseReady) throw new Error("Supabase ยังไม่เชื่อมต่อ");
    const publicUrl = await uploadMenuImage(menuId, file);
    K().setMenuImage(menuId, publicUrl);
    toast("อัปโหลดรูปลง Supabase แล้ว");
  } catch (err) {
    console.warn("[KIFUN] Upload failed:", err);
    toast(`อัปโหลดรูปไม่สำเร็จ — ${(err.message || err).replace(/^.*?: /, "")}`);
  }
});

/* ── Profit calculator ────────────────────────────────────────── */
const COMMISSION = 0.321; // GP 32.1%
const WHIP_COST_15ML = 3.29; // วิป 15ml ต้นทุน

function profitCalc(price, cost, whip = false) {
  const net = price * (1 - COMMISSION); // เข้าร้านหลังหัก GP
  const whipCost = whip ? WHIP_COST_15ML : 0;
  const totalCost = cost + whipCost;
  const profit = net - totalCost;
  return { net, cost, whipCost, totalCost, profit };
}

function profitTab() {
  const menuOptions = menus()
    .map((m) => {
      const p = powderChoices(m)[0];
      const c = calc(m, p, "M Milk", m.coconut ? 5 : 5, "clear", "store");
      return `<option value="${m.id}" data-cost="${c.cost}">${esc(m.name)} — ต้นทุน ${money(c.cost)}</option>`;
    })
    .join("");

  return `<div class="profit-calc">
    <div class="panel">
      <div class="panel-head"><div><h2>คำนวณกำไรต่อแก้ว</h2><p>ใส่ราคาขาย แล้วระบบคำนวณกำไรให้อัตโนมัติ</p></div></div>
      <div class="profit-inputs">
        <div class="profit-field">
          <label>เลือกเมนู (ดึงต้นทุนอัตโนมัติ)</label>
          <select id="profit-menu">${menuOptions}</select>
        </div>
        <div class="profit-field">
          <label>ราคาขาย (฿)</label>
          <input id="profit-price" type="number" min="0" step="0.01" placeholder="เช่น 99" value="99">
        </div>
        <div class="profit-field">
          <label>ช่องทางขาย</label>
          <select id="profit-channel">
            <option value="store">หน้าร้าน</option>
            <option value="lineman">LINE MAN</option>
          </select>
        </div>
        <label class="profit-toggle"><input type="checkbox" id="profit-whip"> แถมวิป 15ml (ต้นทุน ฿3.29)</label>
      </div>
      <div class="profit-result" id="profit-result"></div>
    </div>
    <div class="panel">
      <div class="panel-head"><div><h2>วิธีคำนวณ</h2><p>อ้างอิง GP 32.1%</p></div></div>
      <div class="profit-breakdown">
        <p><b>ราคาขาย × 67.9%</b> = เงินเข้าร้านหลังหักค่าคอมฯ LINE MAN</p>
        <p><b>เงินเข้าร้าน − ต้นทุน</b> = กำไรต่อแก้ว</p>
        <p>ถ้าแถมวิป 15ml ให้หักต้นทุนวิป ฿3.29 เพิ่ม</p>
        <p style="margin-top:10px">ตัวอย่าง: KOME Matcha Latte ฿99 × 67.9% = ฿67.22 เข้าร้าน · หักต้นทุน ฿26.17 · เหลือกำไร ฿41.05/แก้ว · ถ้าแถมวิป 15ml ต้นทุน ฿3.29 จะเหลือ ฿37.76/แก้ว</p>
      </div>
    </div>
  </div>`;
}

function renderProfitResult() {
  const priceEl = document.querySelector("#profit-price");
  const menuEl = document.querySelector("#profit-menu");
  const channelEl = document.querySelector("#profit-channel");
  const whipEl = document.querySelector("#profit-whip");
  if (!priceEl || !menuEl) return;

  const price = Number(priceEl.value) || 0;
  const cost = Number(menuEl.selectedOptions[0]?.dataset.cost) || 0;
  const channel = channelEl.value;
  const whip = whipEl.checked;
  const r = profitCalc(price, cost, whip);

  const out = document.querySelector("#profit-result");
  const channelLabel = channel === "lineman" ? "LINE MAN" : "หน้าร้าน";
  out.innerHTML = `
    <h3>${channelLabel} · ${esc(menuEl.selectedOptions[0]?.textContent.split("—")[0]?.trim() || "เมนู")}</h3>
    <div class="profit-line"><span>ราคาขาย</span><b>${money(price)}</b></div>
    <div class="profit-line"><span>หัก GP 32.1% (× 67.9%)</span><b>−${money(price - r.net)}</b></div>
    <div class="profit-line"><span>เงินเข้าร้าน</span><b>${money(r.net)}</b></div>
    <div class="profit-line"><span>หักต้นทุน</span><b>−${money(r.cost)}</b></div>
    ${whip ? `<div class="profit-line"><span>หักวิป 15ml</span><b>−${money(r.whipCost)}</b></div>` : ""}
    <div class="profit-line net ${r.profit < 0 ? "negative" : ""}"><span>กำไรต่อแก้ว</span><b>${money(r.profit)}</b></div>
    <p class="profit-note">${whip ? `รวมต้นทุน ${money(r.totalCost)}/แก้ว` : `ต้นทุน ${money(r.cost)}/แก้ว`} · กำไร ${money(r.profit)}/แก้ว</p>
  `;
}

/* ── Hook into app.js renderAdmin ─────────────────────────────── */
const originalRenderAdmin = window.renderAdmin;
window.renderAdmin = function () {
  originalRenderAdmin();
  if (activeTab() === "profit") {
    document.querySelector("#admin-content").innerHTML = profitTab();
    renderProfitResult();
  }
};

/* ── Event delegation for profit tab ──────────────────────────── */
document.addEventListener("input", (e) => {
  if (e.target.id === "profit-price" || e.target.id === "profit-menu" || e.target.id === "profit-channel" || e.target.id === "profit-whip") {
    renderProfitResult();
  }
});

/* ── Init ─────────────────────────────────────────────────────── */
initSupabase();