
const FALLBACK_JSON_URL = "data/prices.json";

function toman(value) {
  const n = Number(value || 0);
  return n.toLocaleString("fa-IR") + " تومان";
}

function normalizeDate(value) {
  if (!value) return "—";
  return String(value).replace("T", " ").slice(0, 16);
}

function avg(nums) {
  const arr = nums.map(Number).filter(x => x > 0);
  if (!arr.length) return 0;
  return Math.round(arr.reduce((a,b)=>a+b,0)/arr.length);
}

function minv(nums) {
  const arr = nums.map(Number).filter(x => x > 0);
  return arr.length ? Math.min(...arr) : 0;
}

function maxv(nums) {
  const arr = nums.map(Number).filter(x => x > 0);
  return arr.length ? Math.max(...arr) : 0;
}

function mapApiSeller(row) {
  return {
    id: row.id,
    seller: row.seller || row.name || "فروشنده بدون نام",
    telegram: row.telegram || "",
    website: row.website || "",
    netMelli: Number(row.netMelli ?? row.national_price ?? row.nationalPrice ?? 0),
    tunnel: Number(row.tunnel ?? row.tunnel_price ?? row.tunnelPrice ?? 0),
    direct: Number(row.direct ?? row.direct_price ?? row.directPrice ?? 0),
    updatedAt: normalizeDate(row.updated_at || row.updatedAt),
    status: Number(row.verified || 0) ? "تأیید شده" : "درحال بررسی",
    score: row.score ?? (Number(row.verified || 0) ? 90 : 60),
    note: row.note || ""
  };
}

function buildStats(sellers) {
  const direct = sellers.map(s => s.direct);
  const tunnel = sellers.map(s => s.tunnel);
  const national = sellers.map(s => s.netMelli);
  return {
    seller_count: sellers.length,
    services: [
      { key:"national", title:"نت ملی", desc:"میانگین سرویس‌های قابل استفاده در محدودیت شدید", avg:avg(national), min:minv(national), max:maxv(national), count:national.filter(Boolean).length },
      { key:"tunnel", title:"تانل", desc:"میانگین سرویس‌های تونل‌شده", avg:avg(tunnel), min:minv(tunnel), max:maxv(tunnel), count:tunnel.filter(Boolean).length },
      { key:"direct", title:"مستقیم", desc:"میانگین کانفیگ مستقیم", avg:avg(direct), min:minv(direct), max:maxv(direct), count:direct.filter(Boolean).length }
    ]
  };
}

async function getSettings() {
  const apiUrl = window.BLUENERKH_API_URL;
  const hasRealApi = apiUrl && !apiUrl.includes("YOUR-WORKER-URL");
  if (!hasRealApi) return {};
  try {
    const res = await fetch(apiUrl.replace(/\/$/, "") + "/settings", { cache:"no-store" });
    if (!res.ok) return {};
    return await res.json();
  } catch { return {}; }
}

function applySettings(settings) {
  const pairs = {
    hero_title: "[data-setting='hero_title']",
    hero_subtitle: "[data-setting='hero_subtitle']",
    site_notice: "[data-setting='site_notice']",
    footer_text: "[data-setting='footer_text']"
  };
  Object.entries(pairs).forEach(([key, selector]) => {
    document.querySelectorAll(selector).forEach(el => {
      if (settings[key]) el.textContent = settings[key];
    });
  });
  document.querySelectorAll("[data-setting-link='telegram_support']").forEach(el => {
    const tg = settings.telegram_support || "@Support";
    const username = tg.replace(/^@/, "").trim();
    el.textContent = tg.startsWith("@") ? tg : `@${tg}`;
    el.href = `https://t.me/${username}`;
  });
}

async function getData() {
  const apiUrl = window.BLUENERKH_API_URL;
  const hasRealApi = apiUrl && !apiUrl.includes("YOUR-WORKER-URL");
  if (hasRealApi) {
    try {
      const res = await fetch(apiUrl.replace(/\/$/, "") + "/public", { cache:"no-store" });
      if (!res.ok) throw new Error("API failed");
      const payload = await res.json();
      const sellers = (payload.sellers || []).map(mapApiSeller);
      return { sellers, stats: payload.stats || buildStats(sellers) };
    } catch (err) {
      console.warn("API failed; using fallback", err);
    }
  }
  try {
    const local = await (await fetch(FALLBACK_JSON_URL, { cache:"no-store" })).json();
    const sellers = (local.sellers || []).map(mapApiSeller);
    return { sellers, stats: buildStats(sellers) };
  } catch {
    return { sellers: [], stats: buildStats([]) };
  }
}

function renderMarketCards(data) {
  document.querySelectorAll("[data-market-cards]").forEach(el => {
    el.innerHTML = data.stats.services.map(s => `
      <div class="card">
        <h3>${s.title}</h3>
        <p class="muted">${s.desc}</p>
        <div class="price">${toman(s.avg)}</div>
        <span class="pill">میانگین بازار</span>
      </div>
    `).join("");
  });
}

function renderMarketChart(data) {
  const chart = document.getElementById("marketChart");
  if (!chart) return;
  const services = data.stats.services || [];
  const max = Math.max(...services.map(x => Number(x.avg || 0)), 1);
  chart.innerHTML = services.map(s => {
    const h = Math.max((Number(s.avg || 0) / max) * 230, s.avg ? 18 : 4);
    return `<div class="barbox">
      <div class="bar" style="height:${h}px"></div>
      <div style="font-weight:900">${toman(s.avg)}</div>
      <div class="muted" style="font-size:13px;margin-top:6px">${s.title}</div>
    </div>`;
  }).join("");
}

function renderIndexTable(data) {
  document.querySelectorAll("[data-index-table]").forEach(el => {
    const services = data.stats.services || [];
    el.innerHTML = services.map(s => `
      <tr>
        <td><b>${s.title}</b></td>
        <td>${toman(s.avg)}</td>
        <td>${toman(s.min)}</td>
        <td>${toman(s.max)}</td>
        <td><span class="pill">${s.count}</span></td>
      </tr>
    `).join("");
  });
}

function renderStats(data) {
  const get = key => data.stats.services.find(x => x.key === key);
  const nat = get("national"), tun = get("tunnel"), dir = get("direct");
  document.querySelectorAll("[data-stat='seller_count']").forEach(e => e.textContent = data.stats.seller_count || 0);
  document.querySelectorAll("[data-stat='national_range']").forEach(e => e.textContent = nat ? `${toman(nat.min)} تا ${toman(nat.max)}` : "—");
  document.querySelectorAll("[data-stat='tunnel_range']").forEach(e => e.textContent = tun ? `${toman(tun.min)} تا ${toman(tun.max)}` : "—");
  document.querySelectorAll("[data-stat='direct_range']").forEach(e => e.textContent = dir ? `${toman(dir.min)} تا ${toman(dir.max)}` : "—");
}

function renderPublicSellers(data) {
  document.querySelectorAll("[data-public-sellers]").forEach(el => {
    if (!data.sellers.length) {
      el.innerHTML = `<div class="seller-card muted">هنوز فروشنده‌ای ثبت نشده است.</div>`;
      return;
    }
    el.innerHTML = data.sellers.map(s => {
      const tg = s.telegram ? `<a class="pill" href="https://t.me/${s.telegram.replace("@","")}" target="_blank">${s.telegram}</a>` : `<span class="pill">بدون تلگرام</span>`;
      const site = s.website ? `<a class="pill" href="${s.website}" target="_blank">وب‌سایت</a>` : "";
      return `<div class="seller-card">
        <h3>${s.seller}</h3>
        <p class="muted">${s.note || "فروشنده مشارکت‌کننده در شاخص بازار"}</p>
        <div class="actions">${tg}${site}<span class="pill">${s.status}</span></div>
      </div>`;
    }).join("");
  });
}

function setupFairPrice(data) {
  const sel = document.getElementById("fairService");
  const input = document.getElementById("fairPrice");
  const btn = document.getElementById("checkFair");
  const out = document.getElementById("fairResult");
  if (!sel || !input || !btn || !out) return;
  sel.innerHTML = data.stats.services.map(s => `<option value="${s.key}">${s.title}</option>`).join("");
  const check = () => {
    const service = data.stats.services.find(s => s.key === sel.value);
    const price = Number(input.value || 0);
    if (!service || !service.avg || !price) {
      out.className = "compare-result muted";
      out.textContent = "قیمت و نوع سرویس را وارد کن.";
      return;
    }
    const diff = ((price - service.avg) / service.avg) * 100;
    const abs = Math.abs(diff).toFixed(1).replace(".", "٫");
    let text, cls;
    if (diff > 15) { text = `${abs}٪ بالاتر از میانگین بازار است. احتمالاً گران محسوب می‌شود.`; cls = "compare-result error"; }
    else if (diff < -15) { text = `${abs}٪ پایین‌تر از میانگین بازار است. ارزان‌تر از شاخص فعلی است.`; cls = "compare-result success"; }
    else { text = `نزدیک به میانگین بازار است. اختلاف حدود ${abs}٪ است.`; cls = "compare-result"; }
    out.className = cls;
    out.textContent = text;
  };
  btn.addEventListener("click", check);
  input.addEventListener("keydown", e => { if (e.key === "Enter") check(); });
}


function stateClass(status) {
  if (status === "cheap") return "state-cheap";
  if (status === "expensive") return "state-expensive";
  if (status === "normal") return "state-normal";
  return "muted";
}

function stateText(item) {
  if (!item || item.status === "unknown") return "داده تاریخی کافی نیست";
  const sign = item.change_percent > 0 ? "+" : "";
  return `${sign}${String(item.change_percent).replace(".", "٫")}٪ نسبت به میانگین ۳۰ روزه`;
}

function renderMarketState(data) {
  const el = document.getElementById("marketState");
  if (!el) return;
  const states = data.stats.market_state || {};
  const items = [
    { key: "national", title: "نت ملی", state: states.national },
    { key: "tunnel", title: "تانل", state: states.tunnel },
    { key: "direct", title: "مستقیم", state: states.direct }
  ];
  el.innerHTML = items.map(x => `
    <div class="state-card">
      <div class="muted">${x.title}</div>
      <div class="state-title ${stateClass(x.state?.status)}">${x.state?.label || "داده ناکافی"}</div>
      <p class="muted">${stateText(x.state)}</p>
    </div>
  `).join("");
}

function renderHistoryTrend(data) {
  const el = document.getElementById("historyTrend");
  if (!el) return;

  const history = data.stats.history || {};
  const points = history.points || [];
  const av = history.historyAverages || {};

  if (!points.length) {
    el.innerHTML = `<div class="trend-card muted">هنوز داده تاریخی کافی نیست. با چند بار ویرایش قیمت‌ها در ادمین، price_history پر می‌شود.</div>`;
    return;
  }

  const services = [
    { key: "national_avg", title: "نت ملی", avg30: av.national_avg_30d || 0 },
    { key: "tunnel_avg", title: "تانل", avg30: av.tunnel_avg_30d || 0 },
    { key: "direct_avg", title: "مستقیم", avg30: av.direct_avg_30d || 0 }
  ];

  el.innerHTML = services.map(service => {
    const vals = points.map(p => Number(p[service.key] || 0)).filter(Boolean);
    const max = Math.max(...vals, service.avg30 || 1);
    const latest = vals.length ? vals[vals.length - 1] : 0;
    const rows = points.slice(-8).map(p => {
      const val = Number(p[service.key] || 0);
      const w = max ? Math.max((val / max) * 100, val ? 4 : 0) : 0;
      return `
        <div class="history-row">
          <span class="muted">${p.day.slice(5)}</span>
          <div class="history-track"><div class="history-fill" style="width:${w}%"></div></div>
          <span style="text-align:left">${val ? toman(val) : "—"}</span>
        </div>
      `;
    }).join("");

    return `
      <div class="trend-card">
        <h3>${service.title}</h3>
        <div class="history-meta">
          <span class="pill">۳۰ روزه: ${toman(service.avg30)}</span>
          <span class="pill">آخرین: ${latest ? toman(latest) : "—"}</span>
        </div>
        <div class="history-chart">${rows}</div>
      </div>
    `;
  }).join("");
}

async function render() {
  const [data, settings] = await Promise.all([getData(), getSettings()]);
  applySettings(settings);
  renderMarketCards(data);
  renderMarketChart(data);
  renderIndexTable(data);
  renderStats(data);
  renderMarketState(data);
  renderHistoryTrend(data);
  renderPublicSellers(data);
  setupFairPrice(data);
}
render();
