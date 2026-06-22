/* ============================================================
   路由与数据查询模块
   ============================================================ */

/** 读取 URL 查询参数 */
function getParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

/** 按规范编号查找 */
function getSpecByCode(code) {
  return SPECS.find(function(s) { return s.code === code; }) || null;
}

/** 按分类过滤 */
function getSpecsByCat(cat) {
  if (cat === 'all') return SPECS.slice();
  return SPECS.filter(function(s) { return s.cat === cat; });
}

/** 全站搜索（编号、名称、标签） */
function searchSpecs(query) {
  if (!query || !query.trim()) return SPECS.slice();
  var q = query.trim().toLowerCase();
  return SPECS.filter(function(s) {
    return s.code.toLowerCase().indexOf(q) !== -1
        || s.title.toLowerCase().indexOf(q) !== -1
        || s.tags.some(function(t) { return t.toLowerCase().indexOf(q) !== -1; });
  });
}

/** 在分类内搜索 */
function searchInCat(cat, query) {
  var specs = getSpecsByCat(cat);
  if (!query || !query.trim()) return specs;
  var q = query.trim().toLowerCase();
  return specs.filter(function(s) {
    return s.code.toLowerCase().indexOf(q) !== -1
        || s.title.toLowerCase().indexOf(q) !== -1
        || s.tags.some(function(t) { return t.toLowerCase().indexOf(q) !== -1; });
  });
}

/** 获取各分类计数 */
function getCategoryCounts() {
  var counts = { all: SPECS.length };
  var cats = ['general', 'geometry', 'pavement', 'bridge', 'drainage', 'safety'];
  cats.forEach(function(c) {
    counts[c] = SPECS.filter(function(s) { return s.cat === c; }).length;
  });
  return counts;
}

/** 获取现行规范数 */
function getCurrentCount() {
  return SPECS.filter(function(s) { return s.status === 'current'; }).length;
}

/** 获取有离线PDF的规范数 */
function getPdfCount() {
  return SPECS.filter(function(s) { return s.hasPdf; }).length;
}

/** 分类中文名映射 */
var CAT_NAMES = {
  all: '全部',
  general: '通用/总体',
  geometry: '路线/线形',
  pavement: '路基路面',
  bridge: '桥梁涵洞',
  drainage: '排水防护',
  safety: '交安设施',
  rural: '农村公路',
  materials: '材料/钢材',
  seismic: '抗震/基础'
};

/** 分类图标映射 */
var CAT_ICONS = {
  general: '📐',
  geometry: '📏',
  pavement: '🛣',
  bridge: '🌉',
  drainage: '💧',
  safety: '🛡',
  rural: '🏘',
  materials: '🔩',
  seismic: '🏔'
};
