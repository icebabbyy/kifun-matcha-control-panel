/* KIFUN MATCHA — Supabase client (CDN module for GitHub Pages) */

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://ydwpbygugsrucxvmgbdl.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlkd3BieWd1Z3NydWN4dm1nYmRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NTkzMTcsImV4cCI6MjEwMjAzNTMxN30.EfiyPPlkm-j-EPiCtBtlfCVxo0ajidsGon-u8rhNQqg";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ── Data access helpers ─────────────────────────────────────── */

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

/** ดึงรายการผงชาและราคาต่อกรัมทั้งหมดจาก Supabase powders table */
export async function fetchPowders() {
  const { data, error } = await supabase
    .from("powders")
    .select("*")
    .order("cost_per_gram", { ascending: true });
  if (error) throw error;
  return data || [];
}

/** บันทึก/อัปเดตผงชาลง Supabase powders table */
export async function savePowder(powderObj) {
  const { data, error } = await supabase
    .from("powders")
    .upsert(powderObj)
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

/* ── Native Supabase Authentication (Session & Cookie Persistence) ── */

/** ดึง Session ล่าสุดที่บันทึกไว้ในเบราว์เซอร์อัตโนมัติ */
export async function getAdminSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return data?.session || null;
  } catch {
    return null;
  }
}

/** เข้าสู่ระบบ Admin ผ่าน Supabase Auth (Persistent Session) */
export async function loginAdminWithSupabase(email, password) {
  const cleanEmail = String(email || "admin@happihaus.com").trim();
  const cleanPassword = String(password || "").trim();
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password: cleanPassword
  });
  
  if (error) throw error;
  return data.session;
}

/** ออกจากระบบ Supabase Auth */
export async function logoutAdminWithSupabase() {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn("[KIFUN] Sign out error:", err);
  }
}

/** ตรวจสอบรหัสผ่าน Admin ผ่าน Supabase Auth */
export async function verifyAdminPasscodeWithSupabase(passcode, email = "admin@happihaus.com") {
  if (!passcode) return false;
  try {
    const session = await loginAdminWithSupabase(email, passcode);
    return !!session;
  } catch (authErr) {
    console.warn("[KIFUN] Supabase Auth login failed:", authErr.message || authErr);
    return false;
  }
}