import { initStorefront } from "./storefront.js";

initStorefront().catch((error) => {
  console.error("Storefront failed to load", error);
  const root = document.querySelector("#customer-view");
  if (root) root.innerHTML = "<section class=\"panel\"><h1>โหลดเมนูไม่สำเร็จ</h1><p>กรุณารีเฟรชหน้า หรือติดต่อหน้าร้าน</p></section>";
});
