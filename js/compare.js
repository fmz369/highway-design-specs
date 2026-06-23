/* ============================================================
   规范对比工具逻辑
   ============================================================ */

/** 提取规范的通用参数进行对比 */
function extractKeyParams(spec) {
  if (!spec || !spec.content) return {};

  var params = {};
  var c = spec.content;

  // === 基本参数 ===
  var rules = [
    ['适用公路等级', null],
    ['设计速度(km/h)', null],
    ['车道宽度(m)', null],
    ['车道数', null],
    ['路肩宽度(m)', null],
    ['路基宽度(m)', null],
    ['路面宽度(m)', null],
    ['中间带宽度(m)', null],
    // 平面
    ['平曲线最小半径一般值(m)', null],
    ['平曲线最小半径极限值(m)', null],
    ['停车视距(m)', null],
    // 纵断面
    ['最大纵坡(%)', null],
    ['最小坡长(m)', null],
    ['凸竖曲线一般值(m)', null],
    ['凹竖曲线一般值(m)', null],
    ['最大超高(%)', null],
    ['最大合成坡度(%)', null],
    // 限界
    ['建筑限界净高(m)', null],
    // 路基
    ['路基压实度(上路床)', null],
    // 路面
    ['路面设计年限', null],
    ['水泥弯拉强度(MPa)', null],
    // 桥涵
    ['汽车荷载', null],
    ['设计洪水频率', null],
    // 隧道
    ['隧道净高(m)', null],
    // 交安
    ['护栏防撞等级', null],
  ];

  // 为每个规则设置正则
  var patterns = {
    '适用公路等级': function() {
      var g = [];
      if (c.includes('高速公路')||c.includes('>高速<')) g.push('高速');
      if (c.includes('一级公路')||c.includes('>一级<')) g.push('一级');
      if (c.includes('二级公路')||c.includes('>二级<')) g.push('二级');
      if (c.includes('三级公路')||c.includes('>三级<')) g.push('三级');
      if (c.includes('四级公路')||c.includes('>四级<')) g.push('四级');
      return g.length > 0 ? g.join('/') : null;
    },
    '设计速度(km/h)': [/(d+)s*km/h/i, /设计速度[^<]*<[^>]*>([^<]+)</i],
    '车道宽度(m)': [/车道宽[度]*[^<]*<[^>]*>([^<]+)</i],
    '车道数': [/车道数[^<]*<[^>]*>([^<]+)</i],
    '路肩宽度(m)': [/路肩宽[度]*[^<]*<[^>]*>([^<]+)</i],
    '路基宽度(m)': [/路基宽度[^<]*<[^>]*>([^<]+)</i],
    '路面宽度(m)': [/路面宽度[^<]*<[^>]*>([^<]+)</i],
    '中间带宽度(m)': [/中间带[总]*宽[度]*[^<]*<[^>]*>([^<]+)</i],
    '平曲线最小半径一般值(m)': [/一般最小半径[^<]*<[^>]*>([^<]+)</i, /平曲线最小半径[^<]*一般值[^<]*<[^>]*>([^<]+)</i],
    '平曲线最小半径极限值(m)': [/极限最小半径[^<]*<[^>]*>([^<]+)</i],
    '停车视距(m)': [/停车视距[^<]*<[^>]*>([^<]+)</i],
    '最大纵坡(%)': [/最大纵坡[^<]*<[^>]*>([^<]+)</i, /最大纵坡[^0-9]*(\d+[%％])/],
    '最小坡长(m)': [/最小坡长[^<]*<[^>]*>([^<]+)</i],
    '凸竖曲线一般值(m)': [/凸[形]*竖曲线[^<]*一般值[^<]*<[^>]*>([^<]+)</i],
    '凹竖曲线一般值(m)': [/凹[形]*竖曲线[^<]*一般值[^<]*<[^>]*>([^<]+)</i],
    '最大超高(%)': [/最大超高[^<]*<[^>]*>([^<]+)</i],
    '最大合成坡度(%)': [/最大合成坡度[^<]*<[^>]*>([^<]+)</i],
    '建筑限界净高(m)': [/净高[^<]*<[^>]*>([^<]+)</i],
    '路基压实度(上路床)': [/压实度[^<]*<[^>]*>([^<]+)</i],
    '路面设计年限': [/路面设计[使用]*年限[^<]*<[^>]*>([^<]+)</i, /设计[使用]*年限[^<]*<[^>]*>([^<]+)</i],
    '水泥弯拉强度(MPa)': [/弯拉强度[^<]*<[^>]*>([^<]+)</i],
    '汽车荷载': [/公路[-—]?[ⅠI一二]级|公路[-—]?[ⅡI二]级/],
    '设计洪水频率': [/洪水频率[^<]*<[^>]*>([^<]+)</i, /1\/(\d+)/],
    '隧道净高(m)': [/隧道[^<]*净高[^<]*<[^>]*>([^<]+)</i],
    '护栏防撞等级': [/护栏[防撞]*等级[^<]*<[^>]*>([^<]+)</i],
  };

  rules.forEach(function(rule) {
    var key = rule[0];
    var pat = patterns[key];
    if (!pat) return;

    if (typeof pat === 'function') {
      var v = pat();
      if (v) params[key] = v;
    } else {
      var pats = Array.isArray(pat) ? pat : [pat];
      for (var i = 0; i < pats.length; i++) {
        var m = c.match(pats[i]);
        if (m) {
          var val = (m[1] || m[0]).replace(/<[^>]+>/g, '').trim();
          // 清理
          val = val.replace(/[^0-9a-zA-Z\/~%％:.\-\s一-鿿]/g, '').trim();
          if (val && val.length > 0 && val.length < 40) { params[key] = val; break; }
        }
      }
    }
  });

  // 洪水频率特殊处理
  if (!params['设计洪水频率']) {
    var fm = c.match(/1\/(\d+)/);
    if (fm) params['设计洪水频率'] = '1/' + fm[1];
  }

  return params;
}

/** 找出规范的等级交集 */
function findGradeIntersection(specs) {
  var allGrades = specs.map(function(s) {
    var p = extractKeyParams(s);
    return p['适用公路等级'] ? p['适用公路等级'].split('/') : [];
  });
  if (allGrades.length < 2) return null;
  var intersection = allGrades[0].filter(function(g) {
    return allGrades.every(function(gs) { return gs.indexOf(g) >= 0; });
  });
  return intersection.length > 0 ? intersection : null;
}

/** 生成对比表格 HTML */
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

  // 找等级交集
  var inter = findGradeIntersection(specs);

  var html = '';
  // 等级匹配提示
  var gradeInfos = specs.map(function(s, i) {
    return s.code + ': ' + (specParams[i]['适用公路等级'] || '未识别');
  }).join(' | ');
  html += '<div style="background:#fef3c7;padding:8px 16px;border-radius:8px;margin-bottom:12px;font-size:12px;color:#92400e;">';
  html += '📌 <b>等级匹配</b>：' + gradeInfos;
  if (inter) {
    html += ' &nbsp;→&nbsp; 对比等级：<b>' + inter.join('/') + '</b>';
  } else {
    html += ' &nbsp;→&nbsp; ⚠ 等级范围不同，参数值供参考';
  }
  html += '</div>';

  // 表格
  html += '<div class="compare-table-wrap"><table class="compare-table"><thead><tr><th>参数项</th>';
  specs.forEach(function(s) {
    html += '<th>' + s.code + '<br><small>' + s.title + '</small></th>';
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
