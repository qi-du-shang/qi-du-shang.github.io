    const API_URL = "https://api.xxoo.team/hero/getHeroInfo.php";

    const $ = (selector) => document.querySelector(selector);

    const heroInput = $("#hero-name");
    const platformSelect = $("#platform");
    const areaTypeSelect = $("#area-type");
    const searchButton = $("#search-button");
    const message = $("#message");
    const clearButton = $("#clear-button");
    const ratingBody = $("#ranking-body");

    const platformNames = {
      1: "安卓 QQ",
      2: "安卓微信",
      3: "苹果 QQ",
      4: "苹果微信"
    };

    const platformCodes = {
      1: "aqq",
      2: "awx",
      3: "iqq",
      4: "iwx"
    };

    function formatScore(value) {
      if (value === undefined || value === null || value === "") return "—";
      const score = Number(value);
      return Number.isFinite(score) ? score.toLocaleString("zh-CN") : "—";
    }

    function formatTime(value) {
      if (value === undefined || value === null || value === "") return "—";

      if (typeof value === "string" && !/^\d+$/.test(value)) {
        return value;
      }

      const numericValue = Number(value);
      if (!Number.isFinite(numericValue)) return String(value);

      let milliseconds = numericValue;

      const digits = String(Math.trunc(Math.abs(numericValue))).length;

      if (digits <= 10) {
        milliseconds = numericValue * 1000;
      } else if (digits <= 13) {
        milliseconds = numericValue;
      } else if (digits <= 16) {
        milliseconds = numericValue / 1000;
      } else if (digits <= 19) {
        milliseconds = numericValue / 1000000;
      } else {
        return String(value);
      }

      const date = new Date(milliseconds);
      if (Number.isNaN(date.getTime())) return String(value);

      return date.toLocaleString("zh-CN", {
        hour12: false
      });
    }

    function setMessage(text = "", type = "") {
      message.textContent = text;
      message.className = `message ${type}`.trim();
    }

    function renderRanking(result) {
      const data = result.data;
      const selectedArea = Number(areaTypeSelect.value);
      const areaConfig = {
        1: {
          name: "省榜",
          region: data.province,
          score: data.provincePower,
          regionLabel: "最低上榜省份"
        },
        2: {
          name: "市榜",
          region: data.city,
          score: data.cityPower,
          regionLabel: "最低上榜城市"
        },
        3: {
          name: "区榜",
          region: data.area,
          score: data.areaPower,
          regionLabel: "最低上榜区县"
        }
      };
      const selected = areaConfig[selectedArea];
      const levelName = selected.name;
      const heroName = data.name || heroInput.value.trim();

      $("#result-hero").textContent = heroName;
      $("#result-level").textContent = levelName;
      $("#table-level").textContent = levelName;
      $("#featured-platform").textContent =
        data.platform || platformNames[Number(platformSelect.value)] || "当前平台";
      $("#featured-label").textContent = `全国${levelName}最低战力`;
      $("#featured-region-label").textContent = selected.regionLabel;
      $("#featured-foot-label").textContent = `${levelName}最低分数线`;
      $("#featured-region").textContent = selected.region || "暂无数据";
      $("#featured-score").textContent = formatScore(selected.score);
      $("#city-score").textContent = formatScore(data.cityPower);
      $("#city-region").textContent = data.city || "暂无数据";
      $("#district-score").textContent = formatScore(data.areaPower);
      $("#district-region").textContent = data.area || "暂无数据";
      $("#national-score").textContent = formatScore(data.guobiao);
      $("#national-region").textContent = "国标战力参考";
      $("#result-count").textContent = "仅返回最低值";
      $("#updated-time").textContent = formatTime(data.updatetime || data.stamp);

      if (data.photo) {
        $("#hero-portrait").src = data.photo;
      }

      ratingBody.replaceChildren();
      const row = document.createElement("tr");
      const cells = [
        levelName,
        selected.region || "暂无数据",
        formatScore(selected.score),
        formatTime(data.updatetime || data.stamp)
      ];

      cells.forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });
      ratingBody.appendChild(row);
    }

    async function fetchRanking() {
      const params = new URLSearchParams({
        hero: heroInput.value.trim(),
        type: platformCodes[Number(platformSelect.value)]
      });

      const response = await fetch(`${API_URL}?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`请求失败（${response.status}）`);
      }

      const result = await response.json();

      if (Number(result.code) !== 200 || !result.data || typeof result.data !== "object") {
        throw new Error(result?.msg || "新接口没有返回有效数据");
      }

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
        const result = await fetchRanking();
        renderRanking(result);
        setMessage(`已更新 ${heroName} 的省榜、市榜、区榜及国标最低战力`, "loading");
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : "查询失败，请稍后重试";

        setMessage(msg, "error");
      } finally {
        searchButton.disabled = false;
        searchButton.querySelector("span").textContent = "开始查询";
      }
    }

    clearButton.addEventListener("click", () => {
      heroInput.value = "";
      heroInput.focus();
    });

    searchButton.addEventListener("click", search);

    areaTypeSelect.addEventListener("change", () => {
      if (heroInput.value.trim()) {
        search();
      }
    });

    heroInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        search();
      }
    });

    // 初始化默认查询
    search();
