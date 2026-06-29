/* ============================================================
   可复用 UI 组件模块
   ============================================================ */

/** 渲染一张规范卡片（用于列表页） */
function renderCard(s, linkToDetail, basePath) {
  var icon = CAT_ICONS[s.cat] || '📋';
  var sc = s.status === 'current' ? 'status-current' : 'status-replaced';
  var st = s.status === 'current' ? '现行' : (s.replacedBy ? '⛔已废止→' + s.replacedBy : '已替代');
  var tags = s.tags.map(function(t) {
    return '<span class="card-tag tag-' + s.cat + '">' + t + '</span>';
  }).join('');

  var bp = basePath || '../specs/';
  var href = linkToDetail !== false
    ? ' href="' + bp + '?code=' + encodeURIComponent(s.code) + '"'
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
    + ""
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
    + (pdf > 0 ? '' : '')
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
      ? '<a href="../' + spec.pdf + '" target="_blank" class="btn btn-pdf" title="查看PDF原文">📖 PDF原文</a>'
      : '')
    + '<a href="../compare/?codes=' + encodeURIComponent(spec.code) + '" class="btn" title="对比">📊 对比</a>'
    + '<button class="btn" id="btnSelectExport" title="选择条文导出">☑ 选择导出</button>'
    + '<button class="btn" id="btnDoExport" title="导出选中条文" style="display:none">📄 导出(<span id="exportCount">0</span>)</button>'
    + '<div class="inline-search" id="inlineSearchBox">'
    + '<input type="text" id="inlineSearchInput" placeholder="页内搜索…" title="在规范内搜索（Ctrl+F）">'
    + '<span class="is-count" id="isCount"></span>'
    + '<button class="is-btn" id="isPrev" disabled title="上一个">↑</button>'
    + '<button class="is-btn" id="isNext" disabled title="下一个">↓</button>'
    + '</div>'
    + '</div>';
}

/** 渲染页脚 */
function renderFooter() {
  return '<footer class="footer">'
    + '<div class="footer-links">'
    + '<a href="../">🏠 首页</a>'
    + '<a href="../quickref/">📋 参数速查</a>'
    + '<a href="../compare/">📊 规范对比</a>'
    + '<a href="../qa/">🤖 智能问答</a>'
    + '<a href="../favorites/">⭐ 收藏夹</a>'
    + '<a href="../category/?cat=all">📋 全部规范</a>'
    + '</div>'
    + '<p style="margin-bottom:8px;">📡 官方渠道：<a href="https://www.mot.gov.cn/" target="_blank">交通运输部</a> | <a href="https://www.mohurd.gov.cn/" target="_blank">住建部</a> | <a href="http://std.samr.gov.cn" target="_blank">国家标准信息服务平台</a> | <a href="https://www.spc.org.cn/" target="_blank">中国标准在线服务网</a></p>'
    + '<p style="font-size:11px;color:var(--text3);">⚠ 免责声明：本网站为设计辅助查阅工具，所有规范内容仅供参考。工程设计请以官方发布的最新版本规范正本为准。使用者因依赖本网站信息而产生的任何后果，本网站不承担法律责任。</p>'
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
    + '<h1>' + (title || '公路道路设计规范 · 在线设计辅助平台') + '</h1>'
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
