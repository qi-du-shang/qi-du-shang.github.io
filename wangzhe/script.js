    const API_URL = "https://api.key5.site/API/king/new/index.php";
    const API_KEY = "50e7099a396e7cefcba6a5f1170f01a152334cd1bb36610d916c31cc1abb5819";

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

    const areaTypeNames = {
      1: "省榜",
      2: "市榜",
      3: "区榜"
    };

    function formatScore(value) {
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

    function getLowest(list) {
      if (!Array.isArray(list) || !list.length) return null;

      return list.reduce((lowest, item) => {
        const currentValue = Number(item?.value);
        const lowestValue = Number(lowest?.value);

        if (!Number.isFinite(currentValue)) return lowest;
        if (!Number.isFinite(lowestValue)) return item;
        return currentValue < lowestValue ? item : lowest;
      });
    }

    function getRegionLabel(item) {
      return item?.regionPath || item?.regionName || "暂无数据";
    }

    function renderRanking(result) {
      const data = result?.data || {};
      const list = Array.isArray(data?.list) ? data.list : [];
      const lowest = getLowest(list);

      const heroName = data?.heroName || heroInput.value.trim();
      const platform =
        result?.typeName ||
        data?.typeName ||
        platformNames[Number(platformSelect.value)] ||
        "当前平台";

      const levelName =
        areaTypeNames[Number(result?.level?.level)] ||
        areaTypeNames[Number(areaTypeSelect.value)] ||
        "榜单";

      $("#result-hero").textContent = heroName;
      $("#result-level").textContent = levelName;
      $("#table-level").textContent = levelName;
      $("#featured-platform").textContent = platform;
      $("#featured-region").textContent = getRegionLabel(lowest);
      $("#featured-score").textContent = formatScore(lowest?.value);

      if (data?.heroPortraitUrl) {
        $("#hero-portrait").src = data.heroPortraitUrl;
      }

      $("#result-count").textContent = `${list.length} 条排名`;
      $("#updated-time").textContent = formatTime(result?.ut || lowest?.ut);

      ratingBody.innerHTML = "";

      if (!list.length) {
        ratingBody.innerHTML =
          '<tr><td colspan="4" class="empty-row">接口未返回可用榜单数据</td></tr>';
        return;
      }

      list.forEach((item, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${item.rank || index + 1}</td>
          <td>${getRegionLabel(item)}</td>
          <td>${formatScore(item.value)}</td>
          <td>${formatTime(result?.ut || item.ut)}</td>
        `;
        ratingBody.appendChild(row);
      });
    }

    async function fetchRanking(areaType) {
      const params = new URLSearchParams({
        apikey: API_KEY,
        heroName: heroInput.value.trim(),
        type: platformSelect.value,
        areaType: String(areaType)
      });

      const response = await fetch(`${API_URL}?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`请求失败（${response.status}）`);
      }

      const result = await response.json();

      // 这里重点兼容接口返回的 500 错误
      if (Number(result.code) !== 200 || !result.data) {
        const msg = result?.msg || "接口没有返回有效数据";
        const errText = msg.includes("最大页数不能超过200")
          ? "接口返回：最大页数不能超过200，请稍后重试或联系接口提供方"
          : msg;

        throw new Error(errText);
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
        const areaTypes = [1, 2, 3];
        const areaNames = {
          1: "省榜",
          2: "市榜",
          3: "区榜"
        };

        const results = await Promise.allSettled(
          areaTypes.map((areaType) => fetchRanking(areaType))
        );

        const selectedArea = Number(areaTypeSelect.value);
        const selectedIndex = areaTypes.indexOf(selectedArea);

        const selectedResult = results[selectedIndex];
        if (selectedResult && selectedResult.status === "fulfilled") {
          renderRanking(selectedResult.value);
        } else {
          throw selectedResult?.reason || new Error("所选榜单接口没有返回有效数据");
        }

        // 兼容市榜/区榜失败时，仍显示省榜
        for (const areaType of [2, 3]) {
          const idx = areaTypes.indexOf(areaType);
          const item = results[idx];

          const scoreNode = $(`#${areaType === 2 ? "city" : "district"}-score`);
          const regionNode = $(`#${areaType === 2 ? "city" : "district"}-region`);

          if (!scoreNode || !regionNode) continue;

          if (item && item.status === "fulfilled") {
            const low = getLowest(item.value.data?.list);
            scoreNode.textContent = formatScore(low?.value);
            regionNode.textContent = getRegionLabel(low);
          } else {
            scoreNode.textContent = "—";
            regionNode.textContent = "接口暂不可用";
          }
        }

        const failedAreas = areaTypes
          .filter((type, idx) => results[idx]?.status === "rejected")
          .map((type) => areaNames[type]);

        if (failedAreas.length > 0) {
          const failMsg = failedAreas.join("、");
          setMessage(
            `已更新 ${heroName} 的${areaNames[selectedArea]}；${failMsg}接口异常，已自动忽略。`,
            "loading"
          );
        } else {
          setMessage(`已更新 ${heroName} 的省、市、区榜数据`, "loading");
        }
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
