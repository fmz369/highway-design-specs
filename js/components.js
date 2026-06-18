/* ============================================================
   可复用 UI 组件模块
   ============================================================ */

/** 渲染一张规范卡片（用于列表页） */
function renderCard(s, linkToDetail) {
  var icon = CAT_ICONS[s.cat] || '📋';
  var sc = s.status === 'current' ? 'status-current' : 'status-replaced';
  var st = s.status === 'current' ? '现行' : '已替代';
  var tags = s.tags.map(function(t) {
    return '<span class="card-tag tag-' + s.cat + '">' + t + '</span>';
  }).join('');

  var href = linkToDetail !== false
    ? ' href="../specs/?code=' + encodeURIComponent(s.code) + '"'
    : '';
  var tag = linkToDetail !== false ? 'a' : 'div';

  return '<' + tag + ' class="card" data-cat="' + s.cat + '" data-search="' + s.code + ' ' + s.title + ' ' + s.tags.join(' ') + '"' + href + '>'
    + '<div class="card-header">'
    + '<div class="card-icon ' + s.cat + '">' + icon + '</div>'
    + '<div class="card-body">'
    + '<div class="card-code">' + s.code + '</div>'
    + '<div class="card-title">' + s.title + '</div>'
    + '<div class="card-meta">'
    + '<span class="status-badge ' + sc + '">' + st + '</span>' + tags
    + (s.hasPdf ? '<span style="font-size:10px;color:#16a34a;">📥 PDF</span>' : '')
    + '</div></div></div>'
    + '</' + tag + '>';
}

/** 渲染面包屑导航 */
function renderBreadcrumb(items) {
  var html = '<div class="breadcrumb">';
  items.forEach(function(item, i) {
    if (i > 0) html += '<span class="sep">›</span>';
    if (item.link) {
      html += '<a href="' + item.link + '">' + item.label + '</a>';
    } else {
      html += '<span>' + item.label + '</span>';
    }
  });
  html += '</div>';
  return html;
}

/** 渲染统计胶囊 */
function renderStatsPills(extraHtml) {
  var current = getCurrentCount();
  var total = SPECS.length;
  var pdf = getPdfCount();
  var fav = getFavoriteCount();

  return '<div class="stats-pills">'
    + '<span class="stat-pill"><span class="dot green"></span> 现行 <strong>' + current + '</strong></span>'
    + '<span class="stat-pill"><span class="dot yellow"></span> 总计 <strong>' + total + '</strong></span>'
    + (pdf > 0 ? '<span class="stat-pill" style="background:rgba(74,222,128,.15);border-color:rgba(74,222,128,.3);"><span class="dot green"></span> 离线PDF <strong>' + pdf + '</strong></span>' : '')
    + (fav > 0 ? '<span class="stat-pill"><span class="dot yellow"></span> ⭐ 收藏 <strong>' + fav + '</strong></span>' : '')
    + (extraHtml || '')
    + '</div>';
}

/** 渲染规范详情工具栏 */
function renderToolbar(spec) {
  var isFav = isFavorite(spec.code);
  return '<div class="toolbar">'
    + '<button onclick="history.back()" title="返回">← 返回</button>'
    + '<a href="../" class="btn" title="回首页">🏠 首页</a>'
    + '<button class="btn btn-fav' + (isFav ? ' active' : '') + '" id="btnFavorite" data-code="' + spec.code + '" title="收藏">'
    + (isFav ? '⭐ 已收藏' : '☆ 收藏')
    + '</button>'
    + '<button class="btn" onclick="window.print()" title="打印">🖨 打印</button>'
    + (spec.hasPdf
      ? '<a href="../' + spec.pdf + '" target="_blank" class="btn btn-pdf" title="打开PDF">📥 打开PDF</a>'
      : '<span class="btn" style="opacity:.4;" title="暂无离线PDF">📥 暂无PDF</span>')
    + '<a href="../compare/?codes=' + encodeURIComponent(spec.code) + '" class="btn" title="对比">📊 对比</a>'
    + '</div>';
}

/** 渲染页脚 */
function renderFooter() {
  return '<footer class="footer">'
    + '<div class="footer-links">'
    + '<a href="../">🏠 首页</a>'
    + '<a href="../favorites/">⭐ 收藏夹</a>'
    + '<a href="../compare/">📊 对比工具</a>'
    + '</div>'
    + '<p>⚠ 本网站为设计辅助查阅工具，规范正文请以官方出版物为准。</p>'
    + '<p>数据持续更新中 | 如有勘误请反馈指正</p>'
    + '</footer>';
}

/** 渲染页面头部（含搜索框） */
function renderHeader(title, subtitle, showSearch, searchPlaceholder) {
  var sub = subtitle || 'Highway & Road Design Standards Reference';
  var ph = searchPlaceholder || '搜索规范编号 / 名称 / 关键词…（按 / 键聚焦）';
  return '<header class="header">'
    + '<div class="header-inner">'
    + '<div class="header-top">'
    + '<a href="../" class="header-logo" style="text-decoration:none;">🛣️</a>'
    + '<div>'
    + '<h1>' + (title || '公路道路设计规范 · 深度查阅手册') + '</h1>'
    + '<p class="subtitle">' + sub + '</p>'
    + '</div></div>'
    + (showSearch !== false
      ? '<div class="header-actions">'
        + '<div class="search-bar">'
        + '<input type="text" id="searchInput" placeholder="' + ph + '">'
        + '<button class="clear-btn" id="clearSearch" title="清除">✕</button>'
        + '</div>'
        + renderStatsPills()
        + '</div>'
      : renderStatsPills())
    + '</div></header>';
}

/** 渲染回到顶部按钮 */
function renderBackTop() {
  return '<button class="back-top" id="backTop" title="回到顶部">↑</button>';
}
