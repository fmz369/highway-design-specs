/* ============================================================
   规范对比工具逻辑
   ============================================================ */

/** 提取规范的通用参数进行对比 */
function extractKeyParams(spec) {
  if (!spec || !spec.content) return {};

  var params = {};
  var content = spec.content;

  // 提取表格式参数：匹配 <td> 中的关键值
  var tableMatch;

  // 设计速度
  var speedMatch = content.match(/设计速度[^<]*<[^>]*>([^<]+)</i);
  if (!speedMatch) speedMatch = content.match(/(\d+)\s*km\/h/);
  if (speedMatch) params['设计速度'] = (speedMatch[1] || speedMatch[0]).replace(/[^0-9/~\s]/g, '').trim();

  // 车道宽度
  var laneMatch = content.match(/车道宽度[^<]*<[^>]*>([^<]+)</i);
  if (!laneMatch) laneMatch = content.match(/车道宽[^<]*<[^>]*>([^<]+)</i);
  if (laneMatch) params['车道宽度'] = laneMatch[1].trim();

  // 最大纵坡
  var gradeMatch = content.match(/最大纵坡[^<]*<[^>]*>([^<]+)</i);
  if (!gradeMatch) gradeMatch = content.match(/最大纵坡[^0-9]*(\d+[%％])/);
  if (gradeMatch) params['最大纵坡'] = (gradeMatch[1] || gradeMatch[0]).replace(/[^0-9%％]/g, '').trim();

  // 最小平曲线半径
  var radiusMatch = content.match(/一般最小半径[^<]*<[^>]*>([^<]+)</i);
  if (!radiusMatch) radiusMatch = content.match(/平曲线最小半径[^<]*一般值[^<]*<[^>]*>([^<]+)</i);
  if (radiusMatch) params['平曲线最小半径(一般值)'] = radiusMatch[1].trim();

  // 停车视距
  var sightMatch = content.match(/停车视距[^<]*<[^>]*>([^<]+)</i);
  if (sightMatch) params['停车视距'] = sightMatch[1].trim();

  // 路基压实度
  var compactMatch = content.match(/压实度[^<]*<[^>]*>([^<]+)</i);
  if (compactMatch) params['路基压实度(上路床)'] = compactMatch[1].trim();

  // 路面设计年限
  var lifeMatch = content.match(/设计[使用]*年限[^<]*<[^>]*>([^<]+)</i);
  if (lifeMatch) params['设计年限'] = lifeMatch[1].trim();

  // 净高
  var heightMatch = content.match(/净高[^<]*<[^>]*>([^<]+)</i);
  if (heightMatch) params['建筑限界净高'] = heightMatch[1].trim();

  // 设计洪水频率
  var floodMatch = content.match(/洪水频率[^<]*<[^>]*>([^<]+)</i);
  if (!floodMatch) floodMatch = content.match(/1\/(\d+)/);
  if (floodMatch) params['设计洪水频率'] = '1/' + (floodMatch[1] || floodMatch[0]).replace(/[^0-9]/g, '').trim();

  return params;
}

/** 生成对比表格 HTML */
function renderCompareTable(specs) {
  if (!specs || specs.length === 0) return '';

  // 收集所有参数键
  var allKeys = [];
  var specParams = specs.map(function(s) {
    var p = extractKeyParams(s);
    Object.keys(p).forEach(function(k) {
      if (allKeys.indexOf(k) < 0) allKeys.push(k);
    });
    return p;
  });

  if (allKeys.length === 0) {
    return '<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-title">无可对比参数</div><div class="empty-hint">所选规范暂无可自动提取的对比参数，建议手动参考详情页</div></div>';
  }

  // 构建表格
  var html = '<div class="compare-table-wrap"><table class="compare-table"><thead><tr><th>参数项</th>';
  specs.forEach(function(s) {
    html += '<th>' + s.code + '<br><small>' + s.title + '</small></th>';
  });
  html += '</tr></thead><tbody>';

  allKeys.forEach(function(key) {
    html += '<tr><td>' + key + '</td>';
    var values = specParams.map(function(p) { return p[key] || '—'; });
    // 检查是否有差异
    var allSame = values.every(function(v) { return v === values[0]; });
    var hasDiff = !allSame && values.length > 1;

    values.forEach(function(v) {
      html += '<td' + (hasDiff ? ' class="diff"' : '') + '>' + v + '</td>';
    });
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  return html;
}
