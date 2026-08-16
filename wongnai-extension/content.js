// KIFUN MATCHA — Content Script for merchant.wongnai.com

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

function showToast(msg) {
  let toast = document.querySelector("#kifun-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "kifun-toast";
    toast.className = "kifun-sync-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.display = "block";
  setTimeout(() => { toast.style.display = "none"; }, 3500);
}

function detectMenuType(title) {
  const t = (title || "").toLowerCase();
  if (t.includes("coconut") || t.includes("มะพร้าว")) return "coconut";
  if (t.includes("nutella") || t.includes("นูเทลล่า")) return "nutella";
  if (t.includes("biscoff") || t.includes("บิสคอฟ")) return "biscoff";
  if (t.includes("clear") || t.includes("เคลียร์") || t.includes("ใส")) return "clear";
  if (t.includes("cold") || t.includes("whisk") || t.includes("โคลด์")) return "coldwhisk";
  if (t.includes("hoji") || t.includes("โฮจิ")) return "hojicha";
  return "latte"; // default
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

// Scrape visible completed orders from Wongnai table/cards
function scrapeOrdersFromPage() {
  const orders = [];
  
  // Strategy A: Check standard order table rows or order cards
  const orderCards = document.querySelectorAll("[data-testid*='order'], .order-card, tr.order-row, .order-item");
  
  orderCards.forEach((card, idx) => {
    try {
      const text = card.innerText;
      if (text.includes("฿") || text.includes("บาท")) {
        const orderIdMatch = text.match(/#([A-Za-z0-9\-]+)/) || text.match(/(\d{6,})/);
        const orderId = orderIdMatch ? orderIdMatch[1] : `wn-${Date.now()}-${idx}`;
        
        // Find lines that look like menu items
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
    } catch (e) {
      console.warn("Parse error for card:", e);
    }
  });

  return orders;
}

// Sync scraped orders to Supabase and deduct inventory
async function syncOrdersToSupabase(orders) {
  if (!orders || orders.length === 0) {
    showToast("⚠️ ไม่พบออเดอร์มัทฉะใหม่ในหน้านี้");
    return;
  }

  showToast(`⏳ กำลังตัดสต็อก ${orders.length} รายการลง Supabase...`);

  try {
    // 1. Fetch current app_state
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
        continue; // Prevent duplicate deduction
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

      // Record sale in state
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

    // 2. Save back to Supabase
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
    statusEl.textContent = `ซิงก์แล้วล่าสุด (${count} รายการใหม่)`;
  }
}

// Inject floating widget on Wongnai Merchant page
function injectFloatingWidget() {
  if (document.querySelector(".kifun-sync-widget")) return;

  const widget = document.createElement("div");
  widget.className = "kifun-sync-widget";
  widget.innerHTML = `
    <span class="kifun-sync-badge">🍵</span>
    <div class="kifun-sync-info">
      <span class="kifun-sync-title">KIFUN MATCHA SYNC</span>
      <span class="kifun-sync-status" id="kifun-status-text">🟢 เชื่อมต่อ Supabase แล้ว</span>
    </div>
    <button class="kifun-sync-btn" id="kifun-manual-sync">
      ⚡ ซิงก์ยอดตัดสต็อก
    </button>
  `;

  document.body.appendChild(widget);

  document.querySelector("#kifun-manual-sync").addEventListener("click", () => {
    const orders = scrapeOrdersFromPage();
    syncOrdersToSupabase(orders);
  });
}

// Auto-run on page load
setTimeout(() => {
  injectFloatingWidget();
}, 2000);
