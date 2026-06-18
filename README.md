# 公路道路设计规范 · 在线查阅网站

## 🚀 功能特性

- 📋 **69 部规范**完整收录，6 大分类浏览
- 🔍 **全站搜索**：按编号、名称、标签实时检索
- 📖 **详情页**：每部规范含完整章节目录、核心参数表、设计公式
- ⭐ **收藏夹**：收藏常用规范（浏览器 localStorage 存储）
- 📊 **对比工具**：同时对比 2~4 部规范的关键设计参数
- 🖨 **打印优化**：专用打印样式，隐藏导航仅留正文
- 📥 **离线 PDF**：9 部规范原文可本地打开
- 📱 **响应式**：桌面/平板/手机全适配

## 📁 文件结构

```
规范收录网站/
├── index.html              # 首页
├── category/index.html     # 分类列表（?cat=bridge）
├── specs/index.html        # 规范详情（?code=JTG+B01-2014）
├── compare/index.html      # 对比工具
├── favorites/index.html    # 收藏夹
├── css/style.css           # 全局样式
├── js/
│   ├── data.js             # 规范数据
│   ├── router.js           # 路由与查询
│   ├── components.js       # UI 组件
│   ├── favorites.js        # 收藏管理
│   ├── compare.js          # 对比逻辑
│   └── render.js           # 页面渲染
├── 规范PDF/                # 离线 PDF（9部）
└── README.md
```

## 🛠 本地运行

```bash
# 方法1: 直接打开
双击 index.html

# 方法2: 用本地服务器（推荐，支持URL参数路由）
npx serve .
# 然后打开 http://localhost:3000

# 方法3: Python
python -m http.server 8080
```

## 🌐 部署到 GitHub Pages

```bash
cd 规范收录网站
git init
git add .
git commit -m "初始化规范收录网站"
git branch -M main
git remote add origin git@github.com:你的用户名/规范收录网站.git
git push -u origin main
```

然后在 GitHub 仓库 Settings → Pages → Source 选择 `main` 分支，保存。

## ⚠ 注意

- PDF 文件较大（共 118MB），建议使用 Git LFS 或 `.gitignore` 排除后单独提供下载
- 本网站仅供设计辅助查阅，正式设计请以官方出版物为准
- 数据持续更新中，如有勘误请反馈
