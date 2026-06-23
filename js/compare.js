/* ============================================================
   规范对比工具逻辑
   ============================================================ */

function extractKeyParams(spec) {
  if (!spec || !spec.content) return {};
  var params = {};
  var c = spec.content;
  var m;

  // 适用公路等级
  var grades = [];
  if (c.includes('高速公路')||c.match(/>高速</)) grades.push('高速');
  if (c.includes('一级公路')||c.match(/>一级</)) grades.push('一级');
  if (c.includes('二级公路')||c.match(/>二级</)) grades.push('二级');
  if (c.includes('三级公路')||c.match(/>三级</)) grades.push('三级');
  if (c.includes('四级公路')||c.match(/>四级</)) grades.push('四级');
  if (grades.length > 0) params['适用公路等级'] = grades.join('/');

  // 参数提取规则: [参数名, 正则数组]
  var rules = [
    ['设计速度', [/(\d+)\s*km\/h/i, /设计速度[^<]*<[^>]*>([^<]+)</i]],
    ['车道宽度(m)', [/车道宽[度]*[^<]*<[^>]*>([^<]+)</i]],
    ['车道数', [/车道数[^<]*<[^>]*>([^<]+)</i]],
    ['路肩宽度(m)', [/路肩宽[度]*[^<]*<[^>]*>([^<]+)</i]],
    ['路基宽度(m)', [/路基宽度[^<]*<[^>]*>([^<]+)</i]],
    ['路面宽度(m)', [/路面宽度[^<]*<[^>]*>([^<]+)</i]],
    ['中间带宽度(m)', [/中间带[总]*宽[度]*[^<]*<[^>]*>([^<]+)</i]],
    ['平曲线最小半径一般值(m)', [/一般最小半径[^<]*<[^>]*>([^<]+)</i, /平曲线最小半径[^<]*一般值[^<]*<[^>]*>([^<]+)</i]],
    ['平曲线最小半径极限值(m)', [/极限最小半径[^<]*<[^>]*>([^<]+)</i]],
    ['停车视距(m)', [/停车视距[^<]*<[^>]*>([^<]+)</i]],
    ['最大纵坡(%)', [/最大纵坡[^<]*<[^>]*>([^<]+)</i]],
    ['最小坡长(m)', [/最小坡长[^<]*<[^>]*>([^<]+)</i]],
    ['最大超高(%)', [/最大超高[^<]*<[^>]*>([^<]+)</i]],
    ['最大合成坡度(%)', [/最大合成坡度[^<]*<[^>]*>([^<]+)</i]],
    ['建筑限界净高(m)', [/净高[^<]*<[^>]*>([^<]+)</i]],
    ['路基压实度(上路床)', [/压实度[^<]*<[^>]*>([^<]+)</i]],
    ['路面设计年限', [/路面设计[使用]*年限[^<]*<[^>]*>([^<]+)</i, /设计[使用]*年限[^<]*<[^>]*>([^<]+)</i]],
    ['水泥弯拉强度(MPa)', [/弯拉强度[^<]*<[^>]*>([^<]+)</i]],
    ['汽车荷载', [/公路[-—]?[ⅠI一二]级|公路[-—]?[ⅡI二]级/]],
    ['设计洪水频率', [/洪水频率[^<]*<[^>]*>([^<]+)</i]],
    ['隧道净高(m)', [/隧道[^<]*净高[^<]*<[^>]*>([^<]+)</i]],
    ['护栏防撞等级', [/护栏[防撞]*等级[^<]*<[^>]*>([^<]+)</i]],
    ['面层厚度(cm)', [/面层[^<]*厚度[^<]*<[^>]*>([^<]+)</i]],
    ['会车视距(m)', [/会车视距[^<]*<[^>]*>([^<]+)</i]],
    ['缓和曲线最小长度(m)', [/缓和曲线最小长度[^<]*<[^>]*>([^<]+)</i]],
    ['最大坡长(m)', [/最大坡长[^<]*<[^>]*>([^<]+)</i]],
  ];

  rules.forEach(function(rule) {
    var key = rule[0], patterns = rule[1];
    if (params[key]) return;
    for (var i = 0; i < patterns.length; i++) {
      m = c.match(patterns[i]);
      if (m) {
        var val = (m[1] || m[0]).replace(/<[^>]+>/g, '').replace(/[^0-9a-zA-Z\/~%％:.\-\s一-鿿]/g, '').trim();
        if (val && val.length < 40) { params[key] = val; break; }
      }
    }
  });

  // 洪水频率特殊处理
  if (!params['设计洪水频率']) {
    m = c.match(/1\/(\d+)/);
    if (m) params['设计洪水频率'] = '1/' + m[1];
  }

  return params;
}

function findGradeIntersection(specs) {
  var allGrades = specs.map(function(s) {
    var p = extractKeyParams(s);
    return p['适用公路等级'] ? p['适用公路等级'].split('/') : [];
  });
  if (allGrades.length < 2) return null;
  var inter = allGrades[0].filter(function(g) {
    return allGrades.every(function(gs) { return gs.indexOf(g) >= 0; });
  });
  return inter.length > 0 ? inter : null;
}

function renderCompareTable(specs) {
  if (!specs || specs.length === 0) return '';

  var specParams = specs.map(function(s) { return extractKeyParams(s); });
  var allKeys = [];
  specParams.forEach(function(p) {
    Object.keys(p).forEach(function(k) {
      if (allKeys.indexOf(k) < 0) allKeys.push(k);
    });
  });

  if (allKeys.length === 0) {
    return '<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-title">无可对比参数</div><div class="empty-hint">所选规范暂无可自动提取的对比参数</div></div>';
  }

  var inter = findGradeIntersection(specs);
  var gradeInfos = specs.map(function(s, i) {
    return '<b>' + s.code + '</b>: ' + (specParams[i]['适用公路等级'] || '未识别');
  }).join(' &nbsp;|&nbsp; ');

  var html = '<div style="background:#fef3c7;padding:10px 16px;border-radius:8px;margin-bottom:14px;font-size:12px;color:#92400e;">';
  html += '📌 等级：' + gradeInfos;
  if (inter) {
    html += ' &nbsp;→&nbsp; 可对比等级：<b>' + inter.join('/') + '</b>';
  } else {
    html += ' &nbsp;→&nbsp; ⚠ 等级范围不同，参数值仅供参考';
  }
  html += '</div>';

  html += '<div class="compare-table-wrap"><table class="compare-table"><thead><tr><th>参数项</th>';
  specs.forEach(function(s) {
    html += '<th>' + s.code + '<br><small>' + s.title.substring(0, 20) + '</small></th>';
  });
  html += '</tr></thead><tbody>';

  allKeys.forEach(function(key) {
    html += '<tr><td>' + key + '</td>';
    var values = specParams.map(function(p) { return p[key] || '—'; });
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
