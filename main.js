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

/* ── Profit calculator ────────────────────────────────────────── */
const COMMISSION = 0.321;
const WHIP_COST_15ML = 3.29;

function profitCalc(price, cost, whip = false, channel = "store") {
  const isLineman = channel === "lineman";

  // หน้าร้าน = เงินเข้าร้านเต็ม
  // LINE MAN = หัก GP 32.1%
  const net = isLineman
    ? price * (1 - COMMISSION)
    : price;

  const whipCost = whip
    ? WHIP_COST_15ML
    : 0;

  const totalCost = cost + whipCost;
  const profit = net - totalCost;

  return {
    net,
    cost,
    whipCost,
    totalCost,
    profit,
    commission: price - net
  };
}

function profitTab() {
  const menuOptions = menus()
    .map((m) => {
      const p = powderChoices(m)[0];

      const c = calc(
        m,
        p,
        "M Milk",
        m.coconut ? 5 : 5,
        "clear",
        "store"
      );

      return `
        <option
          value="${m.id}"
          data-cost="${c.cost}"
        >
          ${esc(m.name)} — ต้นทุน ${money(c.cost)}
        </option>
      `;
    })
    .join("");

  return `
    <div class="profit-calc">

      <div class="panel">

        <div class="panel-head">
          <div>
            <h2>คำนวณกำไรต่อแก้ว</h2>
            <p>ใส่ราคาขาย แล้วระบบคำนวณกำไรให้อัตโนมัติ</p>
          </div>
        </div>

        <div class="profit-inputs">

          <div class="profit-field">
            <label>เลือกเมนู (ดึงต้นทุนอัตโนมัติ)</label>
            <select id="profit-menu">
              ${menuOptions}
            </select>
          </div>

          <div class="profit-field">
            <label>ราคาขาย (฿)</label>
            <input
              id="profit-price"
              type="number"
              min="0"
              step="0.01"
              placeholder="เช่น 99"
              value="99"
            >
          </div>

          <div class="profit-field">
            <label>ช่องทางขาย</label>
            <select id="profit-channel">
              <option value="store">หน้าร้าน</option>
              <option value="lineman">LINE MAN</option>
            </select>
          </div>

          <label class="profit-toggle">
            <input
              type="checkbox"
              id="profit-whip"
            >
            แถมวิป 15ml (ต้นทุน ฿3.29)
          </label>

        </div>

        <div
          class="profit-result"
          id="profit-result"
        ></div>

      </div>

      <div class="panel">

        <div class="panel-head">
          <div>
            <h2>วิธีคำนวณ</h2>
            <p>อ้างอิง GP 32.1% สำหรับ LINE MAN</p>
          </div>
        </div>

        <div class="profit-breakdown">

          <p>
            <b>หน้าร้าน</b>
            = เงินเข้าร้านเท่าราคาขาย
          </p>

          <p>
            <b>LINE MAN</b>
            = ราคาขาย × 67.9%
          </p>

          <p>
            <b>เงินเข้าร้าน − ต้นทุน</b>
            = กำไรต่อแก้ว
          </p>

          <p>
            ถ้าแถมวิป 15ml ให้หักต้นทุนวิป ฿3.29 เพิ่ม
          </p>

        </div>

      </div>

    </div>
  `;
}

function renderProfitResult() {
  const priceEl = document.querySelector("#profit-price");
  const menuEl = document.querySelector("#profit-menu");
  const channelEl = document.querySelector("#profit-channel");
  const whipEl = document.querySelector("#profit-whip");
  const out = document.querySelector("#profit-result");

  if (
    !priceEl ||
    !menuEl ||
    !channelEl ||
    !whipEl ||
    !out
  ) {
    return;
  }

  const price = Number(priceEl.value) || 0;

  const cost =
    Number(
      menuEl.selectedOptions[0]?.dataset.cost
    ) || 0;

  const channel = channelEl.value;
  const whip = whipEl.checked;

  const r = profitCalc(
    price,
    cost,
    whip,
    channel
  );

  const channelLabel =
    channel === "lineman"
      ? "LINE MAN"
      : "หน้าร้าน";

  const menuLabel =
    menuEl.selectedOptions[0]
      ?.textContent
      .split("—")[0]
      ?.trim() || "เมนู";

  out.innerHTML = `
    <h3>
      ${channelLabel} · ${esc(menuLabel)}
    </h3>

    <div class="profit-line">
      <span>ราคาขาย</span>
      <b>${money(price)}</b>
    </div>

    ${
      channel === "lineman"
        ? `
          <div class="profit-line">
            <span>หัก GP 32.1% (× 67.9%)</span>
            <b>−${money(r.commission)}</b>
          </div>
        `
        : ""
    }

    <div class="profit-line">
      <span>เงินเข้าร้าน</span>
      <b>${money(r.net)}</b>
    </div>

    <div class="profit-line">
      <span>หักต้นทุน</span>
      <b>−${money(r.cost)}</b>
    </div>

    ${
      whip
        ? `
          <div class="profit-line">
            <span>หักวิป 15ml</span>
            <b>−${money(r.whipCost)}</b>
          </div>
        `
        : ""
    }

    <div
      class="profit-line net ${
        r.profit < 0 ? "negative" : ""
      }"
    >
      <span>กำไรต่อแก้ว</span>
      <b>${money(r.profit)}</b>
    </div>

    <p class="profit-note">
      ${
        whip
          ? `รวมต้นทุน ${money(r.totalCost)}/แก้ว`
          : `ต้นทุน ${money(r.cost)}/แก้ว`
      }
      · กำไร ${money(r.profit)}/แก้ว
    </p>
  `;
}

/* ── Profit tab integration ──────────────────────────────────── */
/*
  app.js keeps renderAdmin in its lexical scope.
  ดังนั้น main.js ไม่ควรพยายาม override window.renderAdmin
  เพราะจะไม่แทนที่ function จริงใน app.js
*/

function renderProfitTabIfActive() {
  if (activeTab() !== "profit") return;

  const target =
    document.querySelector("#admin-content");

  if (!target) return;

  target.innerHTML = profitTab();

  renderProfitResult();
}

/*
  app.js เป็นตัวจับ click ของ .tab-btn อยู่แล้ว
  เราใช้ microtask เพื่อรอให้ app.js render tab ก่อน
  แล้วค่อยใส่ Profit UI ของเราเข้าไป
*/
document.addEventListener("click", (event) => {
  const tab =
    event.target.closest(".tab-btn");

  if (
    !tab ||
    tab.dataset.tab !== "profit"
  ) {
    return;
  }

  queueMicrotask(
    renderProfitTabIfActive
  );
});

/* Safe bridge เผื่อโค้ดส่วนอื่นต้องสั่ง render profit */
window.__kifunProfit = {
  render: renderProfitTabIfActive,
  renderResult: renderProfitResult
};

/* ── Event delegation for profit tab ──────────────────────────── */

function shouldRenderProfitInput(target) {
  return (
    target?.id === "profit-price" ||
    target?.id === "profit-menu" ||
    target?.id === "profit-channel" ||
    target?.id === "profit-whip"
  );
}

document.addEventListener("input", (event) => {
  if (shouldRenderProfitInput(event.target)) {
    renderProfitResult();
  }
});

document.addEventListener("change", (event) => {
  if (shouldRenderProfitInput(event.target)) {
    renderProfitResult();
  }
});

/* ── Init ─────────────────────────────────────────────────────── */
initSupabase();