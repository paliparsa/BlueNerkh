const FALLBACK_JSON_URL = "data/prices.json";

function toman(value) {
  const n = Number(value || 0);
  return n.toLocaleString("fa-IR") + " تومان";
}

function normalizeDate(value) {
  if (!value) return "—";
  return String(value).replace("T", " ").slice(0, 16);
}

function mapApiSeller(row) {
  return {
    seller: row.seller || row.name || "فروشنده بدون نام",
    telegram: row.telegram || "-",
    website: row.website || "",
    netMelli: Number(row.netMelli ?? row.national_price ?? row.nationalPrice ?? 0),
    tunnel: Number(row.tunnel ?? row.tunnel_price ?? row.tunnelPrice ?? 0),
    direct: Number(row.direct ?? row.direct_price ?? row.directPrice ?? 0),
    updatedAt: normalizeDate(row.updated_at || row.updatedAt),
    status: Number(row.verified || 0) ? "تأیید شده" : "درحال بررسی",
    score: row.score ?? (Number(row.verified || 0) ? 90 : 60),
    note: row.note || (Number(row.verified || 0) ? "فروشنده تأیید شده" : "در انتظار بررسی")
  };
}

function average(list, key) {
  const nums = list.map(x => Number(x[key] || 0)).filter(Boolean);
  if (!nums.length) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function buildCategories(sellers) {
  return [
    {
      key: "netMelli",
      title: "سرویس نت ملی",
      desc: "میانگین قیمت هر گیگ برای سرویس‌های قابل استفاده در محدودیت شدید",
      averagePerGB: average(sellers, "netMelli")
    },
    {
      key: "tunnel",
      title: "سرویس تانل",
      desc: "میانگین قیمت هر گیگ برای سرویس‌های تونل‌شده",
      averagePerGB: average(sellers, "tunnel")
    },
    {
      key: "direct",
      title: "سرویس مستقیم",
      desc: "میانگین قیمت هر گیگ برای کانفیگ مستقیم",
      averagePerGB: average(sellers, "direct")
    }
  ];
}

async function getData() {
  const apiUrl = window.BLUENERKH_API_URL;
  const hasRealApi = apiUrl && !apiUrl.includes("YOUR-WORKER-URL");

  if (hasRealApi) {
    try {
      const res = await fetch(apiUrl, { cache: "no-store" });
      if (!res.ok) throw new Error("API response was not OK");
      const payload = await res.json();
      const rows = Array.isArray(payload) ? payload : (payload.sellers || payload.results || []);
      const sellers = rows.map(mapApiSeller);
      return { categories: buildCategories(sellers), sellers };
    } catch (error) {
      console.warn("BlueNerkh API failed. Falling back to local JSON.", error);
    }
  }

  try {
    return await (await fetch(FALLBACK_JSON_URL, { cache: "no-store" })).json();
  } catch (error) {
    console.error("Local JSON failed too.", error);
    return { categories: [], sellers: [] };
  }
}

function renderCategoryCards(data) {
  document.querySelectorAll("[data-cat-cards]").forEach(el => {
    el.innerHTML = data.categories.map(c => `
      <div class="card">
        <h3>${c.title}</h3>
        <p class="muted">${c.desc}</p>
        <div class="price">${toman(c.averagePerGB)}</div>
        <span class="pill">میانگین هر گیگ</span>
      </div>
    `).join("");
  });
}

function renderPrices(data) {
  document.querySelectorAll("[data-prices]").forEach(el => {
    if (!data.sellers.length) {
      el.innerHTML = `<tr><td colspan="5">هنوز داده‌ای ثبت نشده است.</td></tr>`;
      return;
    }
    el.innerHTML = data.sellers.map(s => `
      <tr>
        <td><b>${s.seller}</b><br><span class="muted">${s.note || "-"}</span></td>
        <td>${toman(s.netMelli)}</td>
        <td>${toman(s.tunnel)}</td>
        <td>${toman(s.direct)}</td>
        <td><span class="pill">${s.updatedAt || "—"}</span></td>
      </tr>
    `).join("");
  });
}

function renderSellers(data) {
  document.querySelectorAll("[data-sellers]").forEach(el => {
    if (!data.sellers.length) {
      el.innerHTML = `<tr><td colspan="4">هنوز فروشنده‌ای ثبت نشده است.</td></tr>`;
      return;
    }
    el.innerHTML = data.sellers.map(s => `
      <tr>
        <td><b>${s.seller}</b><br><span class="muted">${s.telegram || "-"}</span></td>
        <td>${s.status || "درحال بررسی"}</td>
        <td>${s.score || 0}/100</td>
        <td>${s.note || "-"}</td>
      </tr>
    `).join("");
  });
}

function setupCalculator(data) {
  const sel = document.querySelector("#serviceType");
  const gb = document.querySelector("#gb");
  const result = document.querySelector("#calcResult");
  if (!sel || !gb || !result) return;

  sel.innerHTML = data.categories.map(c => `<option value="${c.key}">${c.title}</option>`).join("");

  const calc = () => {
    const amount = Number(gb.value || 0);
    const key = sel.value;
    const cat = data.categories.find(c => c.key === key);
    result.textContent = toman(amount * (cat ? Number(cat.averagePerGB || 0) : 0));
  };

  gb.addEventListener("input", calc);
  sel.addEventListener("change", calc);
  calc();
}

function renderMarketChart(data) {
  const chart = document.getElementById("marketChart");
  if (!chart) return;

  const categories = data.categories && data.categories.length
    ? data.categories
    : buildCategories(data.sellers || []);

  if (!categories.length) {
    chart.innerHTML = `<div class="muted">هنوز داده‌ای برای رسم نمودار وجود ندارد.</div>`;
    return;
  }

  const max = Math.max(...categories.map(x => Number(x.averagePerGB || 0)), 1);

  chart.innerHTML = categories.map(c => {
    const value = Number(c.averagePerGB || 0);
    const h = Math.max((value / max) * 220, value > 0 ? 18 : 4);

    return `
      <div style="flex:1;text-align:center;min-width:0">
        <div style="height:${h}px;background:linear-gradient(180deg,#23e2ff,#2f8cff);border-radius:16px 16px 0 0;margin-bottom:10px;box-shadow:0 18px 45px rgba(47,140,255,.22)"></div>
        <div style="font-weight:900">${value.toLocaleString("fa-IR")} تومان</div>
        <div style="opacity:.75;font-size:13px;margin-top:6px">${c.title}</div>
      </div>
    `;
  }).join("");
}

async function render() {
  const data = await getData();
  renderCategoryCards(data);
  renderPrices(data);
  renderSellers(data);
  setupCalculator(data);
  renderMarketChart(data);
}

render();
