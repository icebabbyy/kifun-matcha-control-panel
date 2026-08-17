// KIFUN MATCHA — Content Script for merchant.wongnai.com (v2.0)

const SUPABASE_URL = "https://ydwpbygugsrucxvmgbdl.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlkd3BieWd1Z3NydWN4dm1nYmRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NTkzMTcsImV4cCI6MjEwMjAzNTMxN30.EfiyPPlkm-j-EPiCtBtlfCVxo0ajidsGon-u8rhNQqg";

// Recipe mapping dictionary for automatic BOM deduction
const RECIPE_BOM = {
  "clear": { powderG: 3, items: [{ name: "12oz cup + lid set", qty: 1 }] },
  "latte": { powderG: 5, items: [{ name: "MM Milk", qty: 100 }, { name: "12oz cup + lid set", qty: 1 }] },
  "coconut": { powderG: 4, items: [{ name: "Coconut water", qty: 135 }, { name: "Goodmate oat milk", qty: 65 }, { name: "Syrup", qty: 5 }, { name: "12oz cup + lid set", qty: 1 }, { name: "Topping tray 98mm", qty: 1 }] },
  "nutella": { powderG: 5, items: [{ name: "MM Milk", qty: 100 }, { name: "Nutella spread", qty: 20 }, { name: "12oz cup + lid set", qty: 1 }] },
  "biscoff": { powderG: 5, items: [{ name: "Goodmate oat milk", qty: 135 }, { name: "Biscoff spread", qty: 15 }, { name: "Lotus Biscoff biscuit", qty: 16 }, { name: "12oz cup + lid set", qty: 1 }] },
  "coldwhisk": { powderG: 5, items: [{ name: "Goodmate oat milk", qty: 150 }, { name: "Syrup", qty: 5 }, { name: "Cold whisk pouch 200ml", qty: 1 }] },
  "hojicha": { powderG: 5, items: [{ name: "MM Milk", qty: 100 }, { name: "Syrup", qty: 5 }, { name: "12oz cup + lid set", qty: 1 }] }
};

function showToast(msg, duration = 4000) {
  let toast = document.querySelector("#kifun-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "kifun-toast";
    toast.className = "kifun-sync-toast";
    document.body.appendChild(toast);
  }
  toast.innerHTML = msg;
  toast.style.display = "block";
  setTimeout(() => { toast.style.display = "none"; }, duration);
}

function detectMenuType(title) {
  const t = (title || "").toLowerCase();
  if (t.includes("coconut") || t.includes("มะพร้าว")) return "coconut";
  if (t.includes("nutella") || t.includes("นูเทลล่า")) return "nutella";
  if (t.includes("biscoff") || t.includes("บิสคอฟ")) return "biscoff";
  if (t.includes("clear") || t.includes("เคลียร์") || t.includes("ใส")) return "clear";
  if (t.includes("cold") || t.includes("whisk") || t.includes("โคลด์")) return "coldwhisk";
  if (t.includes("hoji") || t.includes("โฮจิ")) return "hojicha";
  return "latte";
}

function detectPowder(title, optionsText) {
  const full = (title + " " + (optionsText || "")).toLowerCase();
  if (full.includes("yame") || full.includes("ยาเมะ") || full.includes("sukito") || full.includes("saemidori")) {
    return { name: "Sukito Kagoshima 03", label: "YAME" };
  }
  if (full.includes("sora") || full.includes("mie") || full.includes("มิเอะ")) {
    return { name: "Mie Matcha", label: "SORA" };
  }
  if (full.includes("haku") || full.includes("mellow")) {
    return { name: "Haku Daily Uji Mellow", label: "HAKU" };
  }
  if (full.includes("p01") || full.includes("kagoshima")) {
    return { name: "Osha Ocha Kagoshima P01", label: "P01" };
  }
  return { name: "NOKO Premium Grade Nishio", label: "NOKO" };
}

function detectMilk(optionsText) {
  const opt = (optionsText || "").toLowerCase();
  if (opt.includes("oat") || opt.includes("โอ๊ต")) return "Goodmate oat milk";
  if (opt.includes("mixed") || opt.includes("ผสม")) return "Mixed";
  return "MM Milk";
}

// Scrape orders or product summary rows from any page
function scrapeOrdersFromPage() {
  const orders = [];
  
  // Strategy 1: Table rows (e.g. from /report/product-sales or /orders)
  const rows = document.querySelectorAll("table tr, [role='row'], .order-row, .ant-table-row");
  rows.forEach((row, idx) => {
    const text = row.innerText || "";
    if (text.toLowerCase().includes("matcha") || text.includes("มัทฉะ") || text.includes("ชาเขียว") || text.includes("hojicha")) {
      const matchNum = text.match(/(\d+)\s*(?:แก้ว|ชิ้น|รายการ|ea)/i) || text.match(/\t(\d+)\t/) || text.match(/\b([1-9]\d?)\b/);
      const qty = matchNum ? parseInt(matchNum[1], 10) : 1;
      const menuType = detectMenuType(text);
      const powder = detectPowder(text, text);
      const milk = detectMilk(text);

      orders.push({
        orderId: `row-${idx}-${Date.now()}`,
        rawName: text.split("\n")[0].slice(0, 40),
        menuType,
        powder,
        milk,
        qty: Math.min(qty, 50),
        timestamp: new Date().toISOString()
      });
    }
  });

  // Strategy 2: Order Cards
  if (orders.length === 0) {
    const cards = document.querySelectorAll("[data-testid*='order'], .order-card, .order-item, [class*='OrderCard']");
    cards.forEach((card, idx) => {
      const text = card.innerText || "";
      if (text.includes("฿") || text.includes("บาท")) {
        const orderIdMatch = text.match(/#([A-Za-z0-9\-]+)/) || text.match(/(\d{6,})/);
        const orderId = orderIdMatch ? orderIdMatch[1] : `wn-${Date.now()}-${idx}`;
        
        const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
        lines.forEach(line => {
          if (line.toLowerCase().includes("matcha") || line.includes("มัทฉะ") || line.includes("ชาเขียว") || line.includes("hojicha")) {
            const menuType = detectMenuType(line);
            const powder = detectPowder(line, text);
            const milk = detectMilk(text);
            const qtyMatch = line.match(/x\s*(\d+)/i) || line.match(/(\d+)\s*แก้ว/);
            const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
            
            orders.push({
              orderId,
              rawName: line,
              menuType,
              powder,
              milk,
              qty,
              timestamp: new Date().toISOString()
            });
          }
        });
      }
    });
  }

  return orders;
}

// Sync scraped orders to Supabase and deduct inventory
async function syncOrdersToSupabase(orders) {
  if (!orders || orders.length === 0) {
    const currentUrl = window.location.href;
    let hint = "กรุณาเปิดหน้า <b>'เกี่ยวกับออเดอร์'</b> หรือ <b>'รายงานสินค้า'</b> ด้านซ้าย แล้วกดปุ่มซิงก์อีกครั้งครับ";
    if (currentUrl.includes("/report/sales")) {
      hint = "หน้ารวมยอดขายไม่มีชื่อเมนูแยกแก้ว ให้คลิกเมนูซ้ายมือที่ <b>'เกี่ยวกับออเดอร์'</b> หรือกด <b>'⚡ ตัดสต็อกด่วน'</b> ด้านล่างได้เลยครับ";
    }
    showToast(`⚠️ ไม่พบรายการเมนูในหน้านี้<br><small style="opacity:0.9;">${hint}</small>`, 6000);
    return;
  }

  showToast(`⏳ กำลังตัดสต็อก ${orders.length} รายการลง Supabase...`);

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/app_state?id=eq.1&select=payload`, {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`
      }
    });
    const stateArr = await res.json();
    if (!stateArr || !stateArr[0]) throw new Error("Could not load Supabase app_state");

    const payload = stateArr[0].payload;
    payload.stock = payload.stock || [];
    payload.sales = payload.sales || [];
    payload.history = payload.history || [];

    const existingSaleIds = new Set(payload.sales.map(s => s.orderId || s.id));
    let deductedCount = 0;

    for (const ord of orders) {
      if (existingSaleIds.has(ord.orderId)) {
        continue;
      }

      const bom = RECIPE_BOM[ord.menuType] || RECIPE_BOM.latte;
      const totalPowder = bom.powderG * ord.qty;

      // Deduct powder
      const powderStock = payload.stock.find(s => s.name === ord.powder.name || s.name.includes(ord.powder.name.split(" ")[0]));
      if (powderStock) {
        powderStock.qty = Math.max(0, +(powderStock.qty - totalPowder).toFixed(2));
      }

      // Deduct other ingredients & packaging
      bom.items.forEach(it => {
        let ingName = it.name;
        if (ingName === "MM Milk" && ord.milk === "Goodmate oat milk") {
          ingName = "Goodmate oat milk";
        }
        const st = payload.stock.find(s => s.name === ingName);
        if (st) {
          st.qty = Math.max(0, +(st.qty - it.qty * ord.qty).toFixed(2));
        }
      });

      payload.sales.push({
        id: `sale-wn-${ord.orderId}-${Date.now()}`,
        orderId: ord.orderId,
        at: new Date().toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }),
        menu: ord.rawName,
        powder: ord.powder.label,
        qty: ord.qty,
        channel: "lineman",
        price: 119 * ord.qty,
        profit: 46.83 * ord.qty
      });

      payload.history.push({
        at: new Date().toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }),
        type: "sale",
        title: `Wongnai: ${ord.rawName}`,
        detail: `หักผง ${ord.powder.label} ${totalPowder}g + วัตถุดิบ (#${ord.orderId})`,
        delta: `-${totalPowder}g`
      });

      deductedCount++;
      existingSaleIds.add(ord.orderId);
    }

    if (deductedCount === 0) {
      showToast("✅ ออเดอร์ทั้งหมดเคยตัดสต็อกไปแล้ว (ไม่มีออเดอร์ค้าง)");
      return;
    }

    const saveRes = await fetch(`${SUPABASE_URL}/rest/v1/app_state?id=eq.1`, {
      method: "PATCH",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({
        payload: payload,
        updated_at: new Date().toISOString()
      })
    });

    if (!saveRes.ok) throw new Error("Supabase save failed");

    showToast(`🎉 ตัดสต็อกสำเร็จแล้ว ${deductedCount} รายการ!`);
    updateWidgetUI(deductedCount);
  } catch (err) {
    console.error("Sync error:", err);
    showToast(`❌ เกิดข้อผิดพลาด: ${err.message}`);
  }
}

function updateWidgetUI(count) {
  const statusEl = document.querySelector("#kifun-status-text");
  if (statusEl) {
    statusEl.textContent = `ซิงก์แล้ว (${count} รายการใหม่)`;
  }
}

// Quick Deduct Modal
function openQuickDeductModal() {
  let modal = document.querySelector("#kifun-quick-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "kifun-quick-modal";
    modal.innerHTML = `
      <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:1000001;display:flex;align-items:center;justify-content:center;">
        <div style="background:#143024;color:#fff;border-radius:14px;padding:20px;width:340px;box-shadow:0 12px 32px rgba(0,0,0,0.5);font-family:sans-serif;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <h3 style="margin:0;color:#a3e635;font-size:16px;">⚡ บันทึกตัดสต็อกด่วน</h3>
            <button id="close-kifun-modal" style="background:none;border:none;color:#aaa;font-size:20px;cursor:pointer;">✕</button>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;font-size:13px;">
            <label>เมนู:
              <select id="quick-menu" style="width:100%;padding:8px;border-radius:6px;margin-top:4px;background:#254d3d;color:#fff;border:1px solid #444;">
                <option value="latte">Matcha Latte (12/14oz)</option>
                <option value="clear">Clear Matcha</option>
                <option value="coconut">Cloudy Coconut</option>
                <option value="nutella">Rocky Nutella</option>
                <option value="biscoff">Biscoff Latte</option>
                <option value="coldwhisk">Matcha Cold Whisk</option>
                <option value="hojicha">Hojicha Latte</option>
              </select>
            </label>
            <label>ผงชา:
              <select id="quick-powder" style="width:100%;padding:8px;border-radius:6px;margin-top:4px;background:#254d3d;color:#fff;border:1px solid #444;">
                <option value="NOKO">NOKO Nishio</option>
                <option value="YAME">Sukito Yame</option>
                <option value="P01">Osha Ocha P01</option>
                <option value="HAKU">Haku Mellow</option>
              </select>
            </label>
            <label>จำนวนแก้ว:
              <input type="number" id="quick-qty" min="1" value="1" style="width:100%;padding:8px;border-radius:6px;margin-top:4px;background:#254d3d;color:#fff;border:1px solid #444;">
            </label>
            <button id="quick-submit-btn" style="background:#a3e635;color:#143024;font-weight:bold;padding:10px;border-radius:6px;border:none;cursor:pointer;margin-top:8px;">
              บันทึกและตัดสต็อก
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.querySelector("#close-kifun-modal").addEventListener("click", () => {
      modal.style.display = "none";
    });

    document.querySelector("#quick-submit-btn").addEventListener("click", () => {
      const menuType = document.querySelector("#quick-menu").value;
      const powderLabel = document.querySelector("#quick-powder").value;
      const qty = parseInt(document.querySelector("#quick-qty").value, 10) || 1;
      
      const orders = [{
        orderId: `quick-${Date.now()}`,
        rawName: `Quick ${menuType}`,
        menuType,
        powder: { name: powderLabel === "YAME" ? "Sukito Kagoshima 03" : "NOKO Premium Grade Nishio", label: powderLabel },
        milk: "MM Milk",
        qty,
        timestamp: new Date().toISOString()
      }];

      modal.style.display = "none";
      syncOrdersToSupabase(orders);
    });
  }
  modal.style.display = "block";
}

// Inject floating widget on Wongnai Merchant page
function injectFloatingWidget() {
  if (document.querySelector(".kifun-sync-widget")) return;

  const widget = document.createElement("div");
  widget.className = "kifun-sync-widget";
  widget.innerHTML = `
    <span class="kifun-sync-badge">🍵</span>
    <div class="kifun-sync-info">
      <span class="kifun-sync-title">HAPPIHAUS MATCHA SYNC</span>
      <span class="kifun-sync-status" id="kifun-status-text">🟢 เชื่อมต่อ Supabase แล้ว</span>
    </div>
    <div style="display:flex;gap:6px;">
      <button class="kifun-sync-btn" id="kifun-manual-sync" title="สแกนออเดอร์จากหน้าจอ">
        🔄 สแกนออเดอร์
      </button>
      <button class="kifun-sync-btn" id="kifun-quick-btn" style="background:#38bdf8;color:#0c4a6e;" title="ตัดสต็อกด่วน">
        ⚡ ตัดด่วน
      </button>
    </div>
  `;

  document.body.appendChild(widget);

  document.querySelector("#kifun-manual-sync").addEventListener("click", () => {
    const orders = scrapeOrdersFromPage();
    syncOrdersToSupabase(orders);
  });

  document.querySelector("#kifun-quick-btn").addEventListener("click", () => {
    openQuickDeductModal();
  });
}

// Auto-run on page load
setTimeout(() => {
  injectFloatingWidget();
}, 1500);
