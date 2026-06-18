/* ============================================================
   收藏功能模块 — 基于 localStorage
   ============================================================ */

var STORAGE_KEY = 'spec_favorites';

/** 获取收藏列表（返回 code 数组） */
function getFavorites() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/** 保存收藏列表 */
function saveFavorites(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('收藏保存失败:', e.message);
  }
}

/** 切换收藏状态，返回新状态(true=已收藏) */
function toggleFavorite(code) {
  var list = getFavorites();
  var idx = list.indexOf(code);
  if (idx >= 0) {
    list.splice(idx, 1);
    saveFavorites(list);
    return false;
  } else {
    list.push(code);
    saveFavorites(list);
    return true;
  }
}

/** 检查是否已收藏 */
function isFavorite(code) {
  return getFavorites().indexOf(code) >= 0;
}

/** 清空全部收藏 */
function clearFavorites() {
  saveFavorites([]);
}

/** 获取收藏的规范对象列表 */
function getFavoriteSpecs() {
  var codes = getFavorites();
  return codes.map(function(code) {
    return SPECS.find(function(s) { return s.code === code; });
  }).filter(Boolean);
}

/** 收藏数量 */
function getFavoriteCount() {
  return getFavorites().length;
}
