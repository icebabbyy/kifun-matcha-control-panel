/* KIFUN MATCHA — Supabase client */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ydwpbygugsrucxvmgbdl.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlkd3BieWd1Z3NydWN4dm1nYmRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NTkzMTcsImV4cCI6MjEwMjAzNTMxN30.EfiyPPlkm-j-EPiCtBtlfCVxo0ajidsGon-u8rhNQqg";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ── Data access helpers ─────────────────────────────────────── */

/** ดึงเมนูที่ลูกค้าเห็น (customer_menu view) */
export async function fetchCustomerMenu() {
  const { data, error } = await supabase
    .from("customer_menu")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data || [];
}

/** ดึงผงทั้งหมด */
export async function fetchPowders() {
  const { data, error } = await supabase
    .from("powders")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data || [];
}

/** ดึงสต็อกผงปัจจุบัน (view) */
export async function fetchPowderStock() {
  const { data, error } = await supabase
    .from("current_powder_stock")
    .select("*");
  if (error) throw error;
  return data || [];
}

/** ดึงสต็อกแพ็กเกจจิ้งปัจจุบัน (view) */
export async function fetchPackagingStock() {
  const { data, error } = await supabase
    .from("current_packaging_stock")
    .select("*");
  if (error) throw error;
  return data || [];
}

/** ดึง recipes */
export async function fetchRecipes() {
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("active", true);
  if (error) throw error;
  return data || [];
}

/** ดึงราคาเมนู */
export async function fetchMenuPrices() {
  const { data, error } = await supabase
    .from("menu_prices")
    .select("*")
    .eq("active", true);
  if (error) throw error;
  return data || [];
}

/** บันทึกขายจริง */
export async function insertSale(payload) {
  const { data, error } = await supabase.from("sales").insert(payload).select();
  if (error) throw error;
  return data?.[0] || null;
}

/** บันทึก sale items */
export async function insertSaleItems(items) {
  const { data, error } = await supabase.from("sale_items").insert(items).select();
  if (error) throw error;
  return data || [];
}

/** บันทึก inventory movement */
export async function insertInventoryMovement(movement) {
  const { data, error } = await supabase
    .from("inventory_movements")
    .insert(movement)
    .select();
  if (error) throw error;
  return data?.[0] || null;
}

/** บันทึก usage log */
export async function insertUsageLog(log) {
  const { data, error } = await supabase.from("usage_logs").insert(log).select();
  if (error) throw error;
  return data?.[0] || null;
}

/* ── App state (single-row table `app_state`) ─────────────────── */

/** ดึงสถานะทั้งระบบจาก Supabase (payload เป็น JSON) */
export async function fetchAppState() {
  const { data, error } = await supabase
    .from("app_state")
    .select("payload")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  return data?.payload || null;
}

/** เขียนสถานะทั้งระบบลง Supabase (upsert แถว id=1) */
export async function saveAppState(stateObj) {
  const { data, error } = await supabase
    .from("app_state")
    .upsert({ id: 1, payload: stateObj, updated_at: new Date().toISOString() })
    .select();
  if (error) throw error;
  return data?.[0] || null;
}

/* ── Menu photo upload (storage bucket `menu-images`) ─────────── */

/** Resize a photo to fit within 640×640 (keeps aspect ratio) */
export function resizeImageTo640(file, max = 640) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read-failed"));
    reader.onload = () => {
      const original = reader.result;
      const img = new Image();
      img.onerror = () => reject(new Error("not-image"));
      img.onload = () => {
        const scale = Math.min(1, max / img.width, max / img.height);
        if (scale === 1 && original.length <= 1_800_000) {
          const keep = dataURLtoBlob(original);
          resolve(keep);
          return;
        }
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        const isPng = file.type === "image/png";
        const dataUrl = canvas.toDataURL(isPng ? "image/png" : "image/jpeg", 0.82);
        resolve(dataURLtoBlob(dataUrl));
      };
      img.src = original;
    };
    reader.readAsDataURL(file);
  });
}

function dataURLtoBlob(dataUrl) {
  const [head, body] = dataUrl.split(",");
  const mime = /data:(.*?);base64/.exec(head)?.[1] || "image/jpeg";
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Upload a resized (≤640×640) menu photo and return its public URL */
export async function uploadMenuImage(menuId, file) {
  const blob = await resizeImageTo640(file);
  const ext = file.type === "image/png" ? "png" : "jpg";
  const contentType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const path = `menu-${menuId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("menu-images")
    .upload(path, blob, { contentType, upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("menu-images").getPublicUrl(path);
  return data.publicUrl;
}
