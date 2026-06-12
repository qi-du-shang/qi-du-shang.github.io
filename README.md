# Roco | 洛克王国世界 远行商人自动化监控系统





[![Pages Status](https://img.shields.io/badge/Online-Preview-orange)](https://qi-du-shang.github.io/roco)

> 在线预览：https://qi-du-shang.github.io/roco
> 仓库地址：https://github.com/qi-du-shang/roco

---

## 📖 项目简介
本项目是一套**基于 GitHub 生态实现的零服务器、纯静态自动化监控方案**，专为《洛克王国世界》远行商人（蛇瞳）数据查询打造。

采用「**云端定时脚本 + 静态数据文件 + 前端纯页面展示**」的极简架构，依托 GitHub Actions 实现无人值守数据爬取、微信告警推送，同时完全保留原有前端页面与访问链接，无需复杂运维，稳定低成本运行。

---

## 📂 项目目录结构（文件用途说明）
├── .github/
│   └── workflows/
│       └── auto-update.yml      # GitHub Actions 定时任务配置文件
├── fetch-data.js                 # 云端数据处理脚本（Node.js 运行）
├── data.json                     # 定时任务生成的静态数据文件
├── _headers                      # GitHub Pages 缓存配置文件
└── roco/                         # 前端展示目录（原有页面完全保留）
└── index.html                # 唯一需修改的前端文件


---

## ✨ 核心技术亮点
1.  **GitHub Actions 云端定时任务**
    - 由 `.github/workflows/auto-update.yml` 配置定时规则，每日 08:00 / 12:00 / 16:00 / 20:00（北京时间）自动触发
    - 云端拉起 Node.js 环境，执行 `fetch-data.js` 脚本，实现 7×24 小时无人值守数据更新
    - 支持自定义 Cron 表达式，灵活调整执行频次，无需本地维护服务

2.  **一体化云端数据脚本 `fetch-data.js`**
    - 核心逻辑载体，在 GitHub Actions 中直接运行，实现「数据爬取→清洗校验→写入文件→微信推送」全流程
    - 拉取游戏公开接口数据，完成格式转换与异常过滤
    - 自动更新根目录 `data.json` 数据源
    - 集成微信推送逻辑，任务成功/失败时自动发送告警通知

3.  **微信消息推送告警**
    - 内置在 `fetch-data.js` 中，无需额外服务，配置密钥即可启用
    - 支持两种推送场景：
      - ✅ 任务执行成功：推送本次更新的关键数据（当前轮次、刷新时间等）
      - ❌ 任务执行失败：推送错误原因（接口超时、数据为空、写入失败等）
    - 无需登录仓库即可知晓服务运行状态，降低维护成本

4.  **静态数据存储与前端无侵入适配**
    - 所有爬取数据落地到根目录 `data.json`，作为前端唯一数据源
    - 仅需修改 `roco/index.html` 中的数据读取路径，即可适配新架构，原有页面布局、样式、交互完全保留
    - 访问地址依旧为 `https://qi-du-shang.github.io/roco`，用户体验零变化

5.  **缓存优化与性能提升**
    - 根目录 `_headers` 文件为 GitHub Pages 配置 HTTP 响应头，优化静态资源缓存策略
    - 为 `data.json` 配置短期缓存，确保用户获取最新数据；为静态资源配置合理缓存时间，减少重复请求，提升页面加载速度
    - 解决浏览器缓存旧数据的问题，保证数据时效性

6.  **极简架构，零运维成本**
    - 无后端服务器、无数据库、无付费服务，完全依托 GitHub 免费资源运行
    - 所有配置均在仓库内，可随时查看、修改、回滚，维护成本极低
    - 前端为纯静态文件，加载速度快，适配 PC/移动端所有浏览器

---

## 🔁 全流程执行逻辑
1.  到达定时时间 → `.github/workflows/auto-update.yml` 触发 GitHub Actions 工作流
2.  云端初始化 Node.js 环境，执行 `fetch-data.js` 脚本
3.  脚本拉取游戏公开接口数据，完成清洗、校验
4.  处理后的合法数据写入根目录 `data.json`
5.  脚本根据执行结果，调用微信推送接口发送通知
6.  工作流执行结束，GitHub Pages 自动同步更新仓库文件
7.  用户访问 `https://qi-du-shang.github.io/roco` → `roco/index.html` 读取根目录 `data.json`，渲染页面数据

---

## 🚀 部署与运行方式
### 1. 普通用户使用
直接访问前端页面即可，无需任何操作：

### 2. 本地开发/调试
1.  克隆仓库到本地：
    ```bash
    git clone https://github.com/qi-du-shang/roco.git
    cd roco
    ```
2.  调试云端脚本（需安装 Node.js）：
    ```bash
    node fetch-data.js
    ```
    执行完成后，根目录会生成/更新 `data.json` 文件。
3.  前端页面预览：进入 `roco` 文件夹，直接双击 `index.html` 即可打开查看效果。

### 3. 云端自动运行
提交代码后，GitHub Actions 会自动读取 `.github/workflows/auto-update.yml` 配置，按设定时间定时执行任务，无需额外配置。

---

## 📌 关键文件修改说明
### 1. `roco/index.html`（唯一需修改的前端文件）
仅需修改数据读取路径，将原来读取本地文件的代码改为读取根目录的 `data.json`，示例：
```javascript
// 修改前（示例）
fetch('./local-data.json')

// 修改后（适配新架构）
fetch('../data.json')


---

## 徽章说明 & 可选扩展
### 一、现有徽章含义（全部已适配你的仓库）
1. `GitHub Actions Status`：**核心徽章**，实时展示定时任务运行状态（成功绿标 / 失败红标）
2. `License`：标识项目为 MIT 开源协议
3. `Repo Size`：展示整个仓库代码体积
4. `Node.js`：标注脚本运行依赖的 Node 版本
5. `Online Preview`：跳转按钮，直达线上页面

### 二、可选追加徽章（按需添加，直接复制到标题下方即可）
#### 1. Star / Fork 统计徽章
```markdown
![GitHub Stars](https://img.shields.io/github/stars/qi-du-shang/roco?style=social)


