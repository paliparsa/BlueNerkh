const API_URL = window.BLUENERKH_API_URL;

const $ = (id) => document.getElementById(id);

function toman(value) {
  const n = Number(value || 0);
  return n.toLocaleString("fa-IR") + " تومان";
}

function status(text, type = "muted") {
  const el = $("status");
  el.className = type;
  el.textContent = text;
}

function getToken() {
  return localStorage.getItem("BLUENERKH_ADMIN_TOKEN") || "";
}

function setToken(token) {
  localStorage.setItem("BLUENERKH_ADMIN_TOKEN", token);
}

function headers() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${getToken()}`
  };
}

async function api(path, options = {}) {
  if (!API_URL || API_URL.includes("YOUR-WORKER-URL")) {
    throw new Error("لینک Worker داخل js/config.js تنظیم نشده است.");
  }
  const res = await fetch(API_URL.replace(/\/$/, "") + path, {
    ...options,
    headers: { ...headers(), ...(options.headers || {}) },
    cache: "no-store"
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "خطای API");
  return data;
}

function formData() {
  return {
    name: $("name").value.trim(),
    telegram: $("telegram").value.trim(),
    website: $("website").value.trim(),
    direct_price: Number($("direct_price").value || 0),
    tunnel_price: Number($("tunnel_price").value || 0),
    national_price: Number($("national_price").value || 0),
    score: Number($("score").value || 0),
    note: $("note").value.trim(),
    verified: $("verified").checked ? 1 : 0
  };
}

function fillForm(s) {
  $("formTitle").textContent = "ویرایش فروشنده";
  $("sellerId").value = s.id;
  $("name").value = s.name || "";
  $("telegram").value = s.telegram || "";
  $("website").value = s.website || "";
  $("direct_price").value = s.direct_price || 0;
  $("tunnel_price").value = s.tunnel_price || 0;
  $("national_price").value = s.national_price || 0;
  $("score").value = s.score || 0;
  $("note").value = s.note || "";
  $("verified").checked = Boolean(Number(s.verified || 0));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetForm() {
  $("formTitle").textContent = "افزودن فروشنده";
  $("sellerForm").reset();
  $("sellerId").value = "";
}


function settingsData() {
  return {
    hero_title: $("hero_title")?.value.trim() || "",
    hero_subtitle: $("hero_subtitle")?.value.trim() || "",
    site_notice: $("site_notice")?.value.trim() || "",
    telegram_support: $("telegram_support")?.value.trim() || "",
    footer_text: $("footer_text")?.value.trim() || ""
  };
}

function fillSettings(settings) {
  ["hero_title", "hero_subtitle", "site_notice", "telegram_support", "footer_text"].forEach(key => {
    const el = $(key);
    if (el) el.value = settings[key] || "";
  });
}

async function loadSettings() {
  try {
    const settings = await api("/admin/settings");
    fillSettings(settings);
  } catch (e) {
    console.warn("Settings load failed", e);
  }
}

let sellersCache = [];

async function loadSellers() {
  const rows = await api("/admin/sellers");
  sellersCache = rows;
  const el = $("adminSellers");
  if (!rows.length) {
    el.innerHTML = `<tr><td colspan="6">فروشنده‌ای ثبت نشده است.</td></tr>`;
    return;
  }
  el.innerHTML = rows.map(s => `
    <tr>
      <td><b>${s.name}</b><br><span class="muted">${s.telegram || "-"}</span></td>
      <td>${toman(s.direct_price)}</td>
      <td>${toman(s.tunnel_price)}</td>
      <td>${toman(s.national_price)}</td>
      <td><span class="pill">${Number(s.verified) ? "تأیید شده" : "در بررسی"}</span></td>
      <td><div class="admin-actions"><button class="btn ghost smallbtn" data-edit="${s.id}">ویرایش</button><button class="btn ghost smallbtn danger" data-delete="${s.id}">حذف</button></div></td>
    </tr>
  `).join("");
}

async function loadReports() {
  const el = $("reports");
  try {
    const rows = await api("/admin/reports");
    if (!rows.length) {
      el.innerHTML = `<tr><td colspan="4">گزارشی ثبت نشده است.</td></tr>`;
      return;
    }
    el.innerHTML = rows.map(r => `
      <tr><td>${r.seller_name || r.seller_id || "-"}</td><td>${r.message || "-"}</td><td>${r.contact || "-"}</td><td>${String(r.created_at || "").slice(0,16)}</td></tr>
    `).join("");
  } catch (e) {
    el.innerHTML = `<tr><td colspan="4">${e.message}</td></tr>`;
  }
}

async function connect() {
  try {
    await api("/admin/check");
    status("اتصال ادمین برقرار شد.", "success");
    await loadSettings();
    await loadSellers();
    await loadReports();
  } catch (e) {
    status(e.message, "error");
  }
}

$("adminToken").value = getToken();
$("saveToken").addEventListener("click", async () => {
  setToken($("adminToken").value.trim());
  await connect();
});

$("sellerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("sellerId").value;
  const body = JSON.stringify(formData());
  try {
    if (id) {
      await api(`/admin/sellers/${id}`, { method: "PUT", body });
      status("فروشنده ویرایش شد.", "success");
    } else {
      await api("/admin/sellers", { method: "POST", body });
      status("فروشنده اضافه شد.", "success");
    }
    resetForm();
    await loadSellers();
  } catch (e) {
    status(e.message, "error");
  }
});

$("resetForm").addEventListener("click", resetForm);

const settingsForm = $("settingsForm");
if (settingsForm) {
  settingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/admin/settings", {
        method: "POST",
        body: JSON.stringify(settingsData())
      });
      status("تنظیمات سایت ذخیره شد.", "success");
      await loadSettings();
    } catch (err) {
      status(err.message, "error");
    }
  });
}


$("adminSellers").addEventListener("click", async (e) => {
  const editId = e.target.getAttribute("data-edit");
  const deleteId = e.target.getAttribute("data-delete");
  if (editId) {
    const s = sellersCache.find(x => Number(x.id) === Number(editId));
    if (s) fillForm(s);
  }
  if (deleteId) {
    if (!confirm("این فروشنده حذف شود؟")) return;
    try {
      await api(`/admin/sellers/${deleteId}`, { method: "DELETE" });
      status("فروشنده حذف شد.", "success");
      await loadSellers();
    } catch (err) {
      status(err.message, "error");
    }
  }
});

if (getToken()) connect();
