const API_URL = "https://api.key5.site/API/king/new/index.php";
const API_KEY = "50e7099a396e7cefcba6a5f1170f01a152334cd1bb36610d916c31cc1abb5819";

const $ = (selector) => document.querySelector(selector);
const heroInput = $("#hero-name");
const platformSelect = $("#platform");
const searchButton = $("#search-button");
const message = $("#message");

const platformNames = {
  1: "安卓QQ",
  2: "安卓微信",
  3: "苹果QQ",
  4: "苹果微信"
};

function formatScore(value) {
  const score = Number(value);
  return Number.isFinite(score) ? score.toLocaleString("zh-CN") : "—";
}

function formatTime(value) {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "string" && !/^\d+$/.test(value)) return value;

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return String(value);
  const digits = String(Math.trunc(Math.abs(numericValue))).length;
  let milliseconds = numericValue;
  if (digits <= 10) milliseconds = numericValue * 1000;
  else if (digits <= 13) milliseconds = numericValue;
  else if (digits <= 16) milliseconds = numericValue / 1000;
  else if (digits <= 19) milliseconds = numericValue / 1000000;
  else return String(value);
  const date = new Date(milliseconds);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("zh-CN", { hour12: false });
}

function setMessage(text = "", type = "") {
  message.textContent = text;
  message.className = `message ${type}`.trim();
}

function getLowest(list) {
  if (!Array.isArray(list) || !list.length) return null;
  return list.reduce((lowest, item) => Number(item.value) < Number(lowest.value) ? item : lowest);
}

function getRegionLabel(item) {
  return item?.regionPath || item?.regionName || "暂无数据";
}

function renderRanking(result) {
  const data = result?.data || {};
  const list = Array.isArray(data?.list) ? data.list : [];
  const lowest = getLowest(list);
  const heroName = data?.heroName || heroInput.value.trim();
  const platform = result?.typeName || data?.typeName || platformNames[Number(platformSelect.value)] || "当前平台";

  $("#result-hero").textContent = heroName;
  $("#featured-platform").textContent = platform;
  $("#featured-region").textContent = getRegionLabel(lowest);
  $("#featured-score").textContent = formatScore(lowest?.value);
  $("#hero-portrait").src = data?.heroPortraitUrl || $("#hero-portrait").src;
  $("#result-count").textContent = `${list.length} 个省份`;
  $("#updated-time").textContent = formatTime(result?.ut || lowest?.ut);
  $("#national-score").textContent = "—";
  $("#national-region").textContent = "接口暂不提供国标榜单";

  const body = $("#ranking-body");
  body.innerHTML = "";
  if (!list.length) {
    body.innerHTML = '<tr><td colspan="4" class="empty-row">接口未返回可用榜单数据</td></tr>';
  } else {
    list.forEach((item, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `<td>${item.rank || index + 1}</td><td>${getRegionLabel(item)}</td><td>${formatScore(item.value)}</td><td>${formatTime(result?.ut || item.ut)}</td>`;
      body.appendChild(row);
    });
  }
}

async function fetchRanking(areaType) {
  const params = new URLSearchParams({
    apikey: API_KEY,
    heroName: heroInput.value.trim(),
    type: platformSelect.value,
    areaType: String(areaType)
  });
  const response = await fetch(`${API_URL}?${params}`);
  if (!response.ok) throw new Error(`请求失败（${response.status}）`);
  const result = await response.json();
  if (Number(result.code) !== 200 || !result.data) throw new Error(result.msg || "接口没有返回有效数据");
  return result;
}

async function search() {
  const heroName = heroInput.value.trim();
  if (!heroName) {
    heroInput.focus();
    setMessage("请输入英雄名称后再查询");
    return;
  }
  searchButton.disabled = true;
  searchButton.querySelector("span").textContent = "查询中…";
  setMessage("正在同步最新榜单数据…", "loading");
  try {
    const [provinceResult, cityResult, districtResult] = await Promise.all([
      fetchRanking(1),
      fetchRanking(2),
      fetchRanking(3)
    ]);
    renderRanking(provinceResult);
    const cityLowest = getLowest(cityResult.data.list);
    const districtLowest = getLowest(districtResult.data.list);
    $("#city-score").textContent = formatScore(cityLowest?.value);
    $("#city-region").textContent = getRegionLabel(cityLowest);
    $("#district-score").textContent = formatScore(districtLowest?.value);
    $("#district-region").textContent = getRegionLabel(districtLowest);
    setMessage(`已更新 ${heroName} 的省、市、区榜数据`, "loading");
  } catch (error) {
    setMessage(error instanceof Error ? error.message : "查询失败，请稍后重试");
  } finally {
    searchButton.disabled = false;
    searchButton.querySelector("span").textContent = "开始查询";
  }
}

$("#clear-button").addEventListener("click", () => {
  heroInput.value = "";
  heroInput.focus();
});
searchButton.addEventListener("click", search);
heroInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") search();
});
search();
