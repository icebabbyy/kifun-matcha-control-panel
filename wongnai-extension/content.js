// KIFUN MATCHA — Content Script for merchant.wongnai.com (v3.0)

const SUPABASE_URL = "https://ydwpbygugsrucxvmgbdl.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlkd3BieWd1Z3NydWN4dm1nYmRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NTkzMTcsImV4cCI6MjEwMjAzNTMxN30.EfiyPPlkm-j-EPiCtBtlfCVxo0ajidsGon-u8rhNQqg";

// Comprehensive Catalog of Powders & Stock mapping
const POWDER_CATALOG = {
  noko: { label: "NOKO", stock: "NOKO Premium Grade Nishio", aliases: ["noko", "โนโกะ", "nishio", "kome", "house"] },
  ureshino: { label: "Ureshino Blend #2", stock: "Rinya Ureshino Premium #2", aliases: ["ureshino", "อุเรชิโนะ", "rinya", "รินยะ", "blend 2", "rinya 2", "ureshino blend"] },
  sukito: { label: "Sukito Kagoshima 03", stock: "Sukito Kagoshima 03", aliases: ["sukito", "สุกิโตะ", "yame", "ยาเมะ", "03", "saemidori"] },
  mie: { label: "Mie Matcha", stock: "Mie Matcha", aliases: ["mie", "มิเอะ", "sora", "โซระ", "kamu"] },
  mori: { label: "Harusaki Oku no Mori", stock: "Harusaki Oku no Mori", aliases: ["mori", "โมริ", "harusaki", "oku no mori", "ฮารุซากิ"] },
  yameReserve: { label: "Yame no Shiro", stock: "Yame no Shiro", aliases: ["yame no shiro", "shiro", "ชิโระ", "yame reserve"] },
  horii: { label: "Horii Uji Mukashi", stock: "Horii Uji Mukashi", aliases: ["horii", "โฮริอิ", "uji mukashi", "มุคาชิ", "uromi"] },
  marukyu: { label: "Marukyu Yugen", stock: "Marukyu Yugen", aliases: ["marukyu", "มารุคิว", "yugen", "ยูเก็น", "maromi"] },
  lumi: { label: "Tokocha Shizuoka Okumidori", stock: "Tokocha Shizuoka Okumidori", aliases: ["lumi", "tokocha shizuoka", "okumidori", "โทโคฉะ ชิซูโอกะ"] },
  silk: { label: "Tokocha Yame Dania", stock: "Tokocha Yame Dania", aliases: ["silk", "tokocha yame", "dania", "โทโคฉะ ยาเมะ", "ดาเนีย"] },
  hojicha: { label: "Hoho Hojicha", stock: "Hoho Hojicha", aliases: ["hoji", "โฮจิ", "hoho", "kogashi", "roasted"] },
  p01: { label: "Osha Ocha Kagoshima P01", stock: "Osha Ocha Kagoshima P01", aliases: ["p01", "osha ocha", "โอชา"] },
  haku: { label: "Haku Daily Uji Mellow", stock: "Haku Daily Uji Mellow", aliases: ["haku", "ฮาคุ", "mellow"] }
};

const COMMON_PACK_ITEMS = [
  { name: "14oz PET cup (Basic Pac FP-14)", qty: 1 },
  { name: "98mm sipper lid with plug (ฝายกดื่มมีจุก)", qty: 1 },
  { name: "Spill-proof lid sheet (แผ่นรองฝาแก้ว)", qty: 1 },
  { name: "Cold whisk pouch 200ml", qty: 1 },
  { name: "Cup bag 6×11", qty: 1 },
  { name: "6mm straw", qty: 1 }
];

// Menu catalog with accurate BOM formulas matching app.js
const MENU_CATALOG = {
  latte: {
    name: "Matcha Latte",
    thai: "มัทฉะลาเต้",
    aliases: ["matcha latte", "มัทฉะลาเต้", "latte", "ลาเต้", "house latte"],
    defaultPowder: "noko",
    basePrice: 149,
    bom: (powderStock, milk, size = "12") => {
      const sizeFactor = size === "22" ? 22 / 12 : 1;
      const powderG = 5 * sizeFactor;
      const milkMl = 100 * sizeFactor;
      const milkName = (milk === "Goodmate oat milk" || milk === "Oat milk") ? "Goodmate oat milk" : "MM Milk";
      return {
        powderStock,
        powderG,
        items: [
          { name: milkName, qty: milkMl },
          { name: "Syrup", qty: 5 * sizeFactor },
          ...COMMON_PACK_ITEMS
        ]
      };
    }
  },
  coconut: {
    name: "Cloudy Coconut Matcha",
    thai: "มัทฉะมะพร้าวคลาวดี้",
    aliases: ["cloudy coconut", "coconut matcha", "มะพร้าว", "โคโคนัท", "matcha coconut", "coconut foam", "โฟมมะพร้าว"],
    defaultPowder: "noko",
    basePrice: 125,
    bom: (powderStock) => ({
      powderStock,
      powderG: 4,
      items: [
        { name: "Coconut water", qty: 135 },
        { name: "Goodmate oat milk", qty: 65 },
        { name: "Syrup", qty: 5 },
        { name: "Topping tray 98mm", qty: 1 },
        ...COMMON_PACK_ITEMS
      ]
    })
  },
  coconutfoam: {
    name: "Coconut Foam Matcha",
    thai: "มัทฉะโฟมมะพร้าว",
    aliases: ["coconut foam", "โฟมมะพร้าว", "matcha coconut foam"],
    defaultPowder: "noko",
    basePrice: 125,
    bom: (powderStock) => ({
      powderStock,
      powderG: 4,
      items: [
        { name: "Coconut water", qty: 135 },
        { name: "Goodmate oat milk", qty: 65 },
        { name: "Syrup", qty: 5 },
        { name: "Topping tray 98mm", qty: 1 },
        ...COMMON_PACK_ITEMS
      ]
    })
  },
  nutella: {
    name: "Nutella Matcha Latte",
    thai: "มัทฉะลาเต้นูเทลล่า",
    aliases: ["nutella", "นูเทลล่า", "rocky nutella"],
    defaultPowder: "noko",
    basePrice: 199,
    bom: (powderStock) => ({
      powderStock,
      powderG: 5,
      items: [
        { name: "MM Milk", qty: 100 },
        { name: "Nutella spread", qty: 20 },
        ...COMMON_PACK_ITEMS
      ]
    })
  },
  biscoff: {
    name: "Biscoff Matcha Latte",
    thai: "มัทฉะลาเต้บิสคอฟ",
    aliases: ["biscoff", "บิสคอฟ", "lotus"],
    defaultPowder: "noko",
    basePrice: 129,
    bom: (powderStock) => ({
      powderStock,
      powderG: 5,
      items: [
        { name: "Goodmate oat milk", qty: 135 },
        { name: "Biscoff spread", qty: 15 },
        { name: "Lotus Biscoff biscuit", qty: 16 },
        { name: "Topping tray 98mm", qty: 1 },
        ...COMMON_PACK_ITEMS
      ]
    })
  },
  clear: {
    name: "Clear Matcha",
    thai: "เคลียร์มัทฉะ",
    aliases: ["clear matcha", "เคลียร์", "ชาใส", "usucha", "clear"],
    defaultPowder: "noko",
    basePrice: 99,
    bom: (powderStock) => ({
      powderStock,
      powderG: 3,
      items: [
        { name: "Syrup", qty: 5 },
        ...COMMON_PACK_ITEMS
      ]
    })
  },
  coldwhisk: {
    name: "Cold Whisk Matcha",
    thai: "โคลด์วิสก์มัทฉะ",
    aliases: ["cold whisk", "โคลด์วิสก์", "coldwhisk", "ตีสด"],
    defaultPowder: "noko",
    basePrice: 179,
    bom: (powderStock) => ({
      powderStock,
      powderG: 5,
      items: [
        { name: "Goodmate oat milk", qty: 150 },
        { name: "Syrup", qty: 5 },
        ...COMMON_PACK_ITEMS
      ]
    })
  },
  hojicha: {
    name: "Hojicha Latte",
    thai: "โฮจิฉะลาเต้",
    aliases: ["hojicha", "โฮจิฉะ", "hoji latte"],
    defaultPowder: "hojicha",
    basePrice: 269,
    bom: (powderStock = POWDER_CATALOG.hojicha.stock) => ({
      powderStock,
      powderG: 4,
      items: [
        { name: "MM Milk", qty: 100 },
        { name: "Syrup", qty: 5 },
        ...COMMON_PACK_ITEMS
      ]
    })
  },
  haku: {
    name: "Haku Daily Uji Mellow",
    thai: "ฮาคุ เดลี่ อุจิ เมลโลว์",
    aliases: ["haku", "uji mellow", "mellow", "ฮาคุ", "เมลโลว์"],
    defaultPowder: "haku",
    basePrice: 279,
    bom: (powderStock, milk, size, brew = "latte") => getPremiumBOM(POWDER_CATALOG.haku.stock, brew, milk)
  },
  mori: {
    name: "Harusaki Oku no Mori",
    thai: "ฮารุซากิ โอคุ โนะ โมริ",
    aliases: ["harusaki", "oku no mori", "ฮารุซากิ"],
    defaultPowder: "mori",
    basePrice: 319,
    bom: (powderStock, milk, size, brew = "latte") => getPremiumBOM(POWDER_CATALOG.mori.stock, brew, milk)
  },
  yameReserve: {
    name: "Yame no Shiro",
    thai: "ยาเมะ โนะ ชิโระ",
    aliases: ["yame no shiro", "shiro", "ชิโระ"],
    defaultPowder: "yameReserve",
    basePrice: 219,
    bom: (powderStock, milk, size, brew = "latte") => getPremiumBOM(POWDER_CATALOG.yameReserve.stock, brew, milk)
  },
  horii: {
    name: "Horii Uji Mukashi",
    thai: "โฮริอิ อุจิ มุคาชิ",
    aliases: ["horii", "uji mukashi", "โฮริอิ"],
    defaultPowder: "horii",
    basePrice: 319,
    bom: (powderStock, milk, size, brew = "latte") => getPremiumBOM(POWDER_CATALOG.horii.stock, brew, milk)
  },
  marukyu: {
    name: "Marukyu Yugen",
    thai: "มารุคิว ยูเก็น",
    aliases: ["marukyu", "yugen", "มารุคิว"],
    defaultPowder: "marukyu",
    basePrice: 379,
    bom: (powderStock, milk, size, brew = "latte") => getPremiumBOM(POWDER_CATALOG.marukyu.stock, brew, milk)
  },
  lumi: {
    name: "Tokocha Shizuoka Okumidori",
    thai: "โทโคฉะ ชิซูโอกะ",
    aliases: ["tokocha shizuoka", "lumi", "okumidori"],
    defaultPowder: "lumi",
    basePrice: 329,
    bom: (powderStock, milk, size, brew = "latte") => getPremiumBOM(POWDER_CATALOG.lumi.stock, brew, milk)
  },
  silk: {
    name: "Tokocha Yame Dania",
    thai: "โทโคฉะ ยาเมะ ดาเนีย",
    aliases: ["tokocha yame", "dania", "ดาเนีย", "silk"],
    defaultPowder: "silk",
    basePrice: 319,
    bom: (powderStock, milk, size, brew = "latte") => getPremiumBOM(POWDER_CATALOG.silk.stock, brew, milk)
  },
  creamMatcha: {
    name: "Matcha Cream Roll",
    thai: "ครีมโรลมัทฉะ",
    aliases: ["cream roll matcha", "ครีมโรลมัทฉะ", "โรลมัทฉะ", "cream roll — matcha"],
    isSnack: true,
    basePrice: 59,
    bom: () => ({
      powderStock: null,
      powderG: 0,
      items: [{ name: "Cream roll — Matcha", qty: 1 }]
    })
  },
  creamHojicha: {
    name: "Hojicha Cream Roll",
    thai: "ครีมโรลโฮจิฉะ",
    aliases: ["cream roll hojicha", "ครีมโรลโฮจิฉะ", "โรลโฮจิฉะ", "cream roll — hojicha"],
    isSnack: true,
    basePrice: 59,
    bom: () => ({
      powderStock: null,
      powderG: 0,
      items: [{ name: "Cream roll — Hojicha", qty: 1 }]
    })
  }
};

function getPremiumBOM(powderStock, brew = "latte", milk = "MM Milk") {
  if (brew === "clear") {
    return {
      powderStock,
      powderG: 3,
      items: [
        { name: "Syrup", qty: 5 },
        ...COMMON_PACK_ITEMS
      ]
    };
  }
  if (brew === "coldwhisk") {
    return {
      powderStock,
      powderG: 5,
      items: [
        { name: "Goodmate oat milk", qty: 150 },
        { name: "Syrup", qty: 5 },
        ...COMMON_PACK_ITEMS
      ]
    };
  }
  const milkName = (milk === "Goodmate oat milk" || milk === "Oat milk") ? "Goodmate oat milk" : "MM Milk";
  return {
    powderStock,
    powderG: 5,
    items: [
      { name: milkName, qty: 145 },
      { name: "Syrup", qty: 5 },
      ...COMMON_PACK_ITEMS
    ]
  };
}

function showToast(msg, duration = 4500) {
  let toast = document.querySelector("#kifun-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "kifun-toast";
    toast.className = "kifun-sync-toast";
    document.body.appendChild(toast);
  }
  toast.innerHTML = msg;
  toast.style.display = "block";
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { toast.style.display = "none"; }, duration);
}

function detectMenu(rawText) {
  const t = (rawText || "").toLowerCase();
  for (const [key, menu] of Object.entries(MENU_CATALOG)) {
    if (menu.aliases.some(alias => t.includes(alias.toLowerCase()))) {
      return { key, ...menu };
    }
  }
  // Generic matchers
  if (t.includes("มะพร้าว") || t.includes("coconut")) return { key: "coconut", ...MENU_CATALOG.coconut };
  if (t.includes("นูเทลล่า") || t.includes("nutella")) return { key: "nutella", ...MENU_CATALOG.nutella };
  if (t.includes("บิสคอฟ") || t.includes("biscoff")) return { key: "biscoff", ...MENU_CATALOG.biscoff };
  if (t.includes("โคลด์") || t.includes("whisk")) return { key: "coldwhisk", ...MENU_CATALOG.coldwhisk };
  if (t.includes("โฮจิ") || t.includes("hoji")) return { key: "hojicha", ...MENU_CATALOG.hojicha };
  if (t.includes("โรล") || t.includes("roll")) return { key: "creamMatcha", ...MENU_CATALOG.creamMatcha };
  if (t.includes("ใส") || t.includes("clear")) return { key: "clear", ...MENU_CATALOG.clear };
  if (t.includes("matcha") || t.includes("มัทฉะ") || t.includes("ชาเขียว")) return { key: "latte", ...MENU_CATALOG.latte };
  return null;
}

function detectPowder(rawText, defaultKey = "noko") {
  const t = (rawText || "").toLowerCase();
  for (const [key, powder] of Object.entries(POWDER_CATALOG)) {
    if (powder.aliases.some(alias => t.includes(alias.toLowerCase()))) {
      return powder;
    }
  }
  return POWDER_CATALOG[defaultKey] || POWDER_CATALOG.noko;
}

function detectMilk(rawText) {
  const t = (rawText || "").toLowerCase();
  if (t.includes("oat") || t.includes("โอ๊ต") || t.includes("goodmate")) return "Goodmate oat milk";
  if (t.includes("mixed") || t.includes("ผสม")) return "Mixed!";
  return "MM Milk";
}

function detectBrew(rawText) {
  const t = (rawText || "").toLowerCase();
  if (t.includes("cold") || t.includes("whisk") || t.includes("โคลด์")) return "coldwhisk";
  if (t.includes("clear") || t.includes("ใส") || t.includes("usucha")) return "clear";
  return "latte";
}

function detectSize(rawText) {
  const t = (rawText || "").toLowerCase();
  if (t.includes("22") || t.includes("22oz") || t.includes("ใหญ่")) return "22";
  return "12";
}

// Scrape orders from any table or card across Wongnai Merchant Portal
function scrapeOrdersFromPage() {
  const orders = [];
  const scannedTexts = new Set();

  // Strategy 1: Table Rows (e.g. /report/menus, /report/sales, or order lists)
  const rows = document.querySelectorAll("table tr, [role='row'], .ant-table-row, .w-table-row, [class*='TableRow'], [class*='table-row']");
  rows.forEach((row, idx) => {
    // Skip table header
    if (row.querySelector("th") || row.closest("thead")) return;

    const cells = row.querySelectorAll("td, [role='cell'], [class*='TableCell'], [class*='table-cell']");
    const fullText = (row.innerText || "").trim();
    if (!fullText || scannedTexts.has(fullText)) return;

    // Check if row matches any of our known menu items
    const matchedMenu = detectMenu(fullText);
    if (matchedMenu) {
      scannedTexts.add(fullText);

      // Try to parse quantity from dedicated cell, regex, or table column
      let qty = 1;
      if (cells.length >= 3) {
        // Typical Wongnai report table: [Index, Product Name, Qty Sold, Revenue, ...]
        for (let i = 1; i < cells.length; i++) {
          const cText = (cells[i].innerText || "").trim();
          const cleanNum = parseInt(cText.replace(/,/g, ""), 10);
          if (/^\d+$/.test(cText) && cleanNum > 0 && cleanNum < 10000) {
            qty = cleanNum;
            break;
          }
        }
      }

      if (qty === 1) {
        const matchNum = fullText.match(/x\s*(\d+)/i) || fullText.match(/(\d+)\s*(?:แก้ว|ชิ้น|รายการ|ea|เสิร์ฟ)/i) || fullText.match(/\b([1-9]\d?)\b/);
        if (matchNum) qty = parseInt(matchNum[1], 10);
      }

      const powder = detectPowder(fullText, matchedMenu.defaultPowder);
      const milk = detectMilk(fullText);
      const brew = detectBrew(fullText);
      const size = detectSize(fullText);

      orders.push({
        orderId: `wn-row-${Date.now()}-${idx}`,
        rawName: (cells[1]?.innerText || fullText.split("\n")[0]).slice(0, 50),
        menuKey: matchedMenu.key,
        menuTitle: matchedMenu.name,
        powder,
        milk,
        brew,
        size,
        qty: Math.min(qty, 500),
        price: matchedMenu.basePrice,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Strategy 2: Order Cards / History Feed / Live Orders
  if (orders.length === 0) {
    const cards = document.querySelectorAll("[data-testid*='order'], .order-card, .order-item, [class*='OrderCard'], [class*='order-card'], [class*='OrderItem']");
    cards.forEach((card, idx) => {
      const cardText = (card.innerText || "").trim();
      if (!cardText || scannedTexts.has(cardText)) return;
      scannedTexts.add(cardText);

      const orderIdMatch = cardText.match(/#([A-Za-z0-9\-]+)/) || cardText.match(/(\d{6,})/);
      const orderId = orderIdMatch ? orderIdMatch[1] : `wn-${Date.now()}-${idx}`;

      const lines = cardText.split("\n").map(l => l.trim()).filter(Boolean);
      lines.forEach(line => {
        const matchedMenu = detectMenu(line);
        if (matchedMenu) {
          const qtyMatch = line.match(/x\s*(\d+)/i) || line.match(/(\d+)\s*แก้ว/) || cardText.match(/x\s*(\d+)/i);
          const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
          const powder = detectPowder(line + " " + cardText, matchedMenu.defaultPowder);
          const milk = detectMilk(line + " " + cardText);
          const brew = detectBrew(line + " " + cardText);
          const size = detectSize(line + " " + cardText);

          orders.push({
            orderId,
            rawName: line,
            menuKey: matchedMenu.key,
            menuTitle: matchedMenu.name,
            powder,
            milk,
            brew,
            size,
            qty,
            price: matchedMenu.basePrice,
            timestamp: new Date().toISOString()
          });
        }
      });
    });
  }

  return orders;
}

// Sync orders to Supabase and deduct inventory
async function syncOrdersToSupabase(orders) {
  if (!orders || orders.length === 0) {
    const currentUrl = window.location.href;
    let hint = "กรุณาเปิดหน้า <b>'รายงานสินค้า'</b> หรือ <b>'เกี่ยวกับออเดอร์'</b> ที่มีข้อมูลรายการ แล้วกดอีกครั้ง หรือกดปุ่ม <b>'⚡ ตัดด่วน'</b> ได้ทันทีครับ";
    if (currentUrl.includes("/report/sales")) {
      hint = "หน้านี้คือ <b>'รายงานการขายรวม'</b> (กราฟรวม) ไม่มีชื่อเมนูแยกรายแก้ว<br>👉 ให้กดเลือกเมนูซ้ายมือที่ <b>'รายงานสินค้า'</b> หรือกด <b>'⚡ ตัดด่วน'</b> ได้เลยครับ";
    }
    showToast(`⚠️ ไม่พบรายการเมนูในหน้านี้<br><small style="opacity:0.95;line-height:1.4;display:block;margin-top:4px;">${hint}</small>`, 7000);
    return;
  }

  // Show confirmation modal with detected items
  openConfirmSyncModal(orders);
}

// Interactive confirmation dialog before writing to Supabase
function openConfirmSyncModal(orders) {
  let modal = document.querySelector("#kifun-confirm-modal");
  if (modal) modal.remove();

  const totalCups = orders.reduce((sum, o) => sum + o.qty, 0);

  modal = document.createElement("div");
  modal.id = "kifun-confirm-modal";
  modal.innerHTML = `
    <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(3px);z-index:1000002;display:flex;align-items:center;justify-content:center;">
      <div style="background:#143024;color:#fff;border-radius:14px;padding:22px;width:380px;max-width:92vw;box-shadow:0 16px 40px rgba(0,0,0,0.6);border:1px solid rgba(163,230,53,0.3);font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <h3 style="margin:0;color:#a3e635;font-size:16px;display:flex;align-items:center;gap:6px;">
            <span>🍵</span> ตรวจพบ ${orders.length} รายการ (${totalCups} แก้ว/ชิ้น)
          </h3>
          <button id="close-confirm-modal" style="background:none;border:none;color:#aaa;font-size:20px;cursor:pointer;padding:4px;">✕</button>
        </div>

        <div style="max-height:220px;overflow-y:auto;background:rgba(0,0,0,0.25);border-radius:8px;padding:8px 12px;margin-bottom:14px;font-size:12px;display:flex;flex-direction:column;gap:8px;">
          ${orders.map(o => `
            <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:6px;">
              <div>
                <b style="color:#f3f4f6;">${o.menuTitle}</b>
                <div style="color:#a3e635;font-size:11px;">ผง: ${o.powder.label} · ${o.milk}</div>
              </div>
              <span style="font-weight:bold;background:#254d3d;padding:2px 8px;border-radius:4px;color:#a3e635;">× ${o.qty}</span>
            </div>
          `).join("")}
        </div>

        <p style="font-size:11px;color:#d1d5db;margin:0 0 14px 0;line-height:1.4;">
          กด <b>"ยืนยันและตัดสต็อก"</b> เพื่อตัดผงชา, นม, และแพ็กเกจจิ้งลง Supabase อัตโนมัติ
        </p>

        <div style="display:flex;gap:8px;">
          <button id="cancel-confirm-btn" style="flex:1;background:rgba(255,255,255,0.12);color:#fff;border:none;padding:10px;border-radius:6px;font-size:13px;cursor:pointer;">
            ยกเลิก
          </button>
          <button id="commit-sync-btn" style="flex:2;background:#a3e635;color:#143024;font-weight:bold;border:none;padding:10px;border-radius:6px;font-size:13px;cursor:pointer;">
            ⚡ ยืนยันและตัดสต็อก
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.querySelector("#close-confirm-modal").addEventListener("click", () => modal.remove());
  document.querySelector("#cancel-confirm-btn").addEventListener("click", () => modal.remove());
  document.querySelector("#commit-sync-btn").addEventListener("click", () => {
    modal.remove();
    executeSupabaseDeduction(orders);
  });
}

// Perform exact database deduction into Supabase
async function executeSupabaseDeduction(orders) {
  showToast(`⏳ กำลังตัดสต็อก ${orders.length} รายการลง Supabase...`);

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/app_state?id=eq.1&select=payload`, {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`
      }
    });
    const stateArr = await res.json();
    if (!stateArr || !stateArr[0]) throw new Error("ไม่สามารถโหลดข้อมูลจาก Supabase app_state ได้");

    const payload = stateArr[0].payload;
    payload.stock = payload.stock || [];
    payload.sales = payload.sales || [];
    payload.history = payload.history || [];

    const existingSaleIds = new Set(payload.sales.map(s => s.orderId || s.id));
    let deductedCount = 0;
    let totalDeductedGrams = 0;

    for (const ord of orders) {
      if (existingSaleIds.has(ord.orderId)) {
        continue;
      }

      const menuDef = MENU_CATALOG[ord.menuKey] || MENU_CATALOG.latte;
      const bom = menuDef.bom(ord.powder.stock, ord.milk, ord.size, ord.brew);
      const totalPowderG = (bom.powderG || 0) * ord.qty;

      // Deduct tea powder
      if (bom.powderStock && totalPowderG > 0) {
        const powderStockItem = payload.stock.find(s =>
          s.name.toLowerCase() === bom.powderStock.toLowerCase() ||
          s.name.toLowerCase().includes(bom.powderStock.split(" ")[0].toLowerCase())
        );
        if (powderStockItem) {
          powderStockItem.qty = Math.max(0, +(powderStockItem.qty - totalPowderG).toFixed(2));
          totalDeductedGrams += totalPowderG;
        }
      }

      // Deduct ingredients and packaging
      if (bom.items && Array.isArray(bom.items)) {
        bom.items.forEach(it => {
          const st = payload.stock.find(s => s.name.toLowerCase() === it.name.toLowerCase());
          if (st) {
            st.qty = Math.max(0, +(st.qty - it.qty * ord.qty).toFixed(2));
          }
        });
      }

      // Log sale
      payload.sales.push({
        id: `sale-wn-${ord.orderId}-${Date.now()}`,
        orderId: ord.orderId,
        at: new Date().toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }),
        menu: ord.rawName || ord.menuTitle,
        powder: ord.powder.label,
        qty: ord.qty,
        channel: "lineman",
        price: ord.price * ord.qty,
        profit: +(ord.price * 0.4 * ord.qty).toFixed(2)
      });

      // Log history
      payload.history.push({
        at: new Date().toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }),
        type: "sale",
        title: `Wongnai: ${ord.rawName || ord.menuTitle}`,
        detail: `หัก ${ord.powder.label} ${totalPowderG}g + วัตถุดิบ (${ord.qty} แก้ว/ชิ้น)`,
        delta: totalPowderG > 0 ? `-${totalPowderG}g` : `-${ord.qty} ชิ้น`
      });

      deductedCount++;
      existingSaleIds.add(ord.orderId);
    }

    if (deductedCount === 0) {
      showToast("✅ ออเดอร์ทั้งหมดเคยตัดสต็อกไปแล้ว (ไม่มีออเดอร์ใหม่)");
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

    if (!saveRes.ok) throw new Error("บันทึกลง Supabase ล้มเหลว");

    showToast(`🎉 ตัดสต็อกสำเร็จแล้ว ${deductedCount} รายการ (ผงชา ${totalDeductedGrams}g)!`);
    updateWidgetUI(deductedCount);
  } catch (err) {
    console.error("Sync error:", err);
    showToast(`❌ เกิดข้อผิดพลาด: ${err.message}`);
  }
}

function updateWidgetUI(count) {
  const statusEl = document.querySelector("#kifun-status-text");
  if (statusEl) {
    statusEl.textContent = `🟢 ซิงก์ล่าสุด: ${count} รายการ`;
  }
}

// Complete Quick Deduct Modal with all store menus and powders
function openQuickDeductModal() {
  let modal = document.querySelector("#kifun-quick-modal");
  if (modal) modal.remove();

  modal = document.createElement("div");
  modal.id = "kifun-quick-modal";
  modal.innerHTML = `
    <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(3px);z-index:1000001;display:flex;align-items:center;justify-content:center;">
      <div style="background:#143024;color:#fff;border-radius:14px;padding:22px;width:360px;max-width:92vw;box-shadow:0 16px 40px rgba(0,0,0,0.6);border:1px solid rgba(163,230,53,0.3);font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <h3 style="margin:0;color:#a3e635;font-size:16px;display:flex;align-items:center;gap:6px;">
            <span>⚡</span> บันทึกตัดสต็อกด่วน
          </h3>
          <button id="close-kifun-modal" style="background:none;border:none;color:#aaa;font-size:20px;cursor:pointer;padding:4px;">✕</button>
        </div>

        <div style="display:flex;flex-direction:column;gap:10px;font-size:13px;">
          <label>เลือกเมนู:
            <select id="quick-menu" style="width:100%;padding:9px;border-radius:6px;margin-top:4px;background:#254d3d;color:#fff;border:1px solid rgba(255,255,255,0.2);outline:none;">
              <optgroup label="── Daily & House ──">
                <option value="latte">Matcha Latte (12oz)</option>
                <option value="coconut">Cloudy Coconut Matcha</option>
                <option value="coconutfoam">Coconut Foam Matcha</option>
                <option value="nutella">Rocky Nutella Matcha</option>
                <option value="biscoff">Biscoff Matcha Latte</option>
                <option value="clear">Clear Matcha</option>
                <option value="coldwhisk">Matcha Cold Whisk</option>
                <option value="hojicha">Hojicha Latte</option>
              </optgroup>
              <optgroup label="── Special & Single Origin ──">
                <option value="mori">Harusaki Oku no Mori (MORI)</option>
                <option value="yameReserve">Yame no Shiro (YAME)</option>
                <option value="horii">Horii Uji Mukashi (UROMI)</option>
                <option value="marukyu">Marukyu Yugen (MAROMI)</option>
                <option value="lumi">Tokocha Shizuoka Okumidori (LUMI)</option>
                <option value="silk">Tokocha Yame Dania (SILK)</option>
              </optgroup>
              <optgroup label="── ขนม / Sweets ──">
                <option value="creamMatcha">ครีมโรลมัทฉะ (Matcha Roll)</option>
                <option value="creamHojicha">ครีมโรลโฮจิฉะ (Hojicha Roll)</option>
              </optgroup>
            </select>
          </label>

          <div id="quick-tea-options" style="display:flex;flex-direction:column;gap:10px;">
            <label>ผงชา:
              <select id="quick-powder" style="width:100%;padding:9px;border-radius:6px;margin-top:4px;background:#254d3d;color:#fff;border:1px solid rgba(255,255,255,0.2);outline:none;">
                <option value="ureshino">Ureshino Blend #2 (Rinya House Base)</option>
                <option value="noko">NOKO (House Base · เหลือ ~45g)</option>
                <option value="sukito">Sukito Kagoshima 03 (YAME)</option>
                <option value="mie">Mie Matcha (SORA)</option>
                <option value="mori">Harusaki Oku no Mori</option>
                <option value="yameReserve">Yame no Shiro</option>
                <option value="horii">Horii Uji Mukashi</option>
                <option value="marukyu">Marukyu Yugen</option>
                <option value="lumi">Tokocha Okumidori</option>
                <option value="silk">Tokocha Yame Dania</option>
                <option value="hojicha">Hoho Hojicha</option>
              </select>
            </label>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              <label>นม:
                <select id="quick-milk" style="width:100%;padding:9px;border-radius:6px;margin-top:4px;background:#254d3d;color:#fff;border:1px solid rgba(255,255,255,0.2);outline:none;">
                  <option value="MM Milk">MM Milk (นมสด)</option>
                  <option value="Goodmate oat milk">Goodmate Oat</option>
                  <option value="Mixed!">Mixed (นมผสม)</option>
                </select>
              </label>
              <label>วิธีชง:
                <select id="quick-brew" style="width:100%;padding:9px;border-radius:6px;margin-top:4px;background:#254d3d;color:#fff;border:1px solid rgba(255,255,255,0.2);outline:none;">
                  <option value="latte">Latte</option>
                  <option value="clear">Clear</option>
                  <option value="coldwhisk">Cold Whisk</option>
                </select>
              </label>
            </div>
          </div>

          <label>จำนวนแก้ว/ชิ้น:
            <input type="number" id="quick-qty" min="1" value="1" style="width:100%;padding:9px;box-sizing:border-box;border-radius:6px;margin-top:4px;background:#254d3d;color:#fff;border:1px solid rgba(255,255,255,0.2);outline:none;font-weight:bold;font-size:15px;">
          </label>

          <button id="quick-submit-btn" style="background:#a3e635;color:#143024;font-weight:bold;padding:12px;border-radius:6px;border:none;cursor:pointer;margin-top:8px;font-size:14px;transition:background 0.15s;">
            ⚡ บันทึกและตัดสต็อก
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const menuSelect = document.querySelector("#quick-menu");
  const teaOptions = document.querySelector("#quick-tea-options");
  const powderSelect = document.querySelector("#quick-powder");

  menuSelect.addEventListener("change", () => {
    const val = menuSelect.value;
    if (val === "creamMatcha" || val === "creamHojicha") {
      teaOptions.style.display = "none";
    } else {
      teaOptions.style.display = "flex";
      if (val === "hojicha") powderSelect.value = "hojicha";
      else if (val === "mori") powderSelect.value = "mori";
      else if (val === "yameReserve") powderSelect.value = "yameReserve";
      else if (val === "horii") powderSelect.value = "horii";
      else if (val === "marukyu") powderSelect.value = "marukyu";
      else if (val === "lumi") powderSelect.value = "lumi";
      else if (val === "silk") powderSelect.value = "silk";
    }
  });

  document.querySelector("#close-kifun-modal").addEventListener("click", () => {
    modal.remove();
  });

  document.querySelector("#quick-submit-btn").addEventListener("click", () => {
    const menuKey = menuSelect.value;
    const powderKey = powderSelect.value;
    const milk = document.querySelector("#quick-milk").value;
    const brew = document.querySelector("#quick-brew").value;
    const qty = Math.max(1, parseInt(document.querySelector("#quick-qty").value, 10) || 1);

    const menuDef = MENU_CATALOG[menuKey] || MENU_CATALOG.latte;
    const powder = POWDER_CATALOG[powderKey] || POWDER_CATALOG.noko;

    const orders = [{
      orderId: `quick-${Date.now()}`,
      rawName: `Quick ${menuDef.name}`,
      menuKey,
      menuTitle: menuDef.name,
      powder,
      milk,
      brew,
      size: "12",
      qty,
      price: menuDef.basePrice,
      timestamp: new Date().toISOString()
    }];

    modal.remove();
    executeSupabaseDeduction(orders);
  });
}

// Inject floating widget on Wongnai Merchant page
function injectFloatingWidget() {
  if (document.querySelector(".kifun-sync-widget")) return;

  const isCollapsed = localStorage.getItem("kifun_sync_collapsed") === "true";

  const widget = document.createElement("div");
  widget.className = `kifun-sync-widget ${isCollapsed ? "kifun-collapsed" : ""}`;
  widget.innerHTML = `
    <span class="kifun-sync-badge" title="คลิกเพื่อย่อ/ขยาย">🍵</span>
    <span class="kifun-collapsed-label" title="คลิกเพื่อขยายเมนู">HAPPIHAUS SYNC</span>
    <div class="kifun-sync-info">
      <span class="kifun-sync-title">HAPPIHAUS MATCHA SYNC</span>
      <span class="kifun-sync-status" id="kifun-status-text">🟢 เชื่อมต่อ Supabase แล้ว</span>
    </div>
    <div class="kifun-actions" style="display:flex;gap:6px;align-items:center;">
      <button class="kifun-sync-btn" id="kifun-manual-sync" title="สแกนออเดอร์จากหน้าจอ">
        🔄 สแกนออเดอร์
      </button>
      <button class="kifun-sync-btn" id="kifun-quick-btn" style="background:#38bdf8;color:#0c4a6e;" title="ตัดสต็อกด่วน">
        ⚡ ตัดด่วน
      </button>
      <button class="kifun-minimize-btn" id="kifun-collapse-btn" title="ย่อแถบเมนู">
        ✕
      </button>
    </div>
  `;

  document.body.appendChild(widget);

  const toggleCollapse = (shouldCollapse) => {
    const nextState = shouldCollapse !== undefined ? shouldCollapse : !widget.classList.contains("kifun-collapsed");
    widget.classList.toggle("kifun-collapsed", nextState);
    localStorage.setItem("kifun_sync_collapsed", nextState ? "true" : "false");
  };

  document.querySelector("#kifun-collapse-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    toggleCollapse(true);
  });

  widget.addEventListener("click", (e) => {
    if (widget.classList.contains("kifun-collapsed")) {
      toggleCollapse(false);
    }
  });

  document.querySelector("#kifun-manual-sync").addEventListener("click", (e) => {
    e.stopPropagation();
    const orders = scrapeOrdersFromPage();
    syncOrdersToSupabase(orders);
  });

  document.querySelector("#kifun-quick-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    openQuickDeductModal();
  });
}

// Auto-run on page load
setTimeout(() => {
  injectFloatingWidget();
}, 1200);

