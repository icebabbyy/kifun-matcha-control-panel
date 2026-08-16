document.querySelector("#btn-sync-now").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.url && tab.url.includes("merchant.wongnai.com")) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        if (typeof scrapeOrdersFromPage === "function") {
          const orders = scrapeOrdersFromPage();
          syncOrdersToSupabase(orders);
        } else {
          alert("กรุณารีเฟรชหน้า Wongnai Merchant 1 ครั้งก่อนซิงก์ครับ");
        }
      }
    });
  } else {
    chrome.tabs.create({ url: "https://merchant.wongnai.com/businesses/3884438/menu" });
  }
});

document.querySelector("#btn-open-panel").addEventListener("click", () => {
  chrome.tabs.create({ url: "https://icebabbyy.github.io/kifun-matcha-control-panel/" });
});
