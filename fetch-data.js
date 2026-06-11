const fs = require('fs');
const https = require('https');

const API_URL = "https://rocokingdomworld.org/api/merchant/live";
const OUTPUT_FILE = "./data.json";

https.get(API_URL, (res) => {
    let chunks = [];
    res.on('data', (chunk) => {
        chunks.push(chunk);
    });

    res.on('end', () => {
        try {
            const data = JSON.parse(Buffer.concat(chunks).toString());
            // 追加抓取时间，用于页面展示最后更新
            data.fetchedAt = new Date().toISOString();
            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2), 'utf8');
            console.log("✅ 数据更新成功，已写入 data.json");
        } catch (err) {
            console.error("❌ 数据解析失败：", err.message);
        }
    });
}).on('error', (err) => {
    console.error("❌ 请求API失败：", err.message);
});
