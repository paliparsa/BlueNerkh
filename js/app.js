const API_URL = "https://bluenerkh-api.iampaliparsa.workers.dev";

async function loadSellers() {
  const container = document.querySelector("#sellers-table-body");

  if (!container) return;

  try {
    const res = await fetch(API_URL);
    const sellers = await res.json();

    container.innerHTML = sellers.map(seller => `
      <tr>
        <td>${seller.name}</td>
        <td>${seller.telegram || "-"}</td>
        <td>${seller.direct_price || "-"}</td>
        <td>${seller.tunnel_price || "-"}</td>
        <td>${seller.national_price || "-"}</td>
        <td>${seller.verified ? "تایید شده" : "تایید نشده"}</td>
      </tr>
    `).join("");

  } catch (err) {
    container.innerHTML = `
      <tr>
        <td colspan="6">خطا در دریافت اطلاعات</td>
      </tr>
    `;
  }
}

loadSellers();
