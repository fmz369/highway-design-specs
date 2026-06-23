/* ============================================================
   规范对比工具逻辑
   ============================================================ */

/** 提取规范的通用参数进行对比 */
function extractKeyParams(spec, matchGrade) {
  if (!spec || !spec.content) return {};

  var params = {};
  var c = spec.content;

  // 辅助：从HTML表格中提取td文本
  function getTd(regex) {
    var m = c.match(regex);
    return m ? m[1].replace(/<[^>]+>/g, '').trim() : null;
  }

  var rules = [
    // === 基本参数 ===
    ['公路等级', /公路等级[^<]*<[^>]*>([^<]+)</i],
    ['功能定位', /功能定位[^<]*<[^>]*>([^<]+)</i],
    ['设计使用年限', /设计使用年限[^<]*<[^>]*>([^<]+)</i],
    ['设计年限', /设计[使用]*年限[^<]*<[^>]*>([^<]+)</i],
    ['路面设计年限', /路面设计[使用]*年限[^<]*<[^>]*>([^<]+)</i],

    // === 路线参数 ===
    ['设计速度(km/h)', /设计速度[^<]*<[^>]*>([^<]+)</i],
    ['设计速度', /设计速度[应为]*[^<]*?(\d+)\s*km\/h/i],
    ['车道宽度(m)', /车道宽度[^<]*<[^>]*>([^<]+)</i],
    ['车道数', /车道数[^<]*<[^>]*>([^<]+)</i],
    ['路肩宽度(m)', /路肩宽度[^<]*<[^>]*>([^<]+)</i],
    ['硬路肩宽度(m)', /硬路肩[^<]*<[^>]*>([^<]+)</i],
    ['中间带宽度(m)', /中间带[总]*宽[度]*[^<]*<[^>]*>([^<]+)</i],
    ['路基宽度(m)', /路基宽度[^<]*<[^>]*>([^<]+)</i],
    ['路面宽度(m)', /路面宽度[^<]*<[^>]*>([^<]+)</i],

    // === 平面 ===
    ['平曲线最小半径一般值(m)', /一般最小半径[^<]*<[^>]*>([^<]+)</i],
    ['平曲线最小半径极限值(m)', /极限最小半径[^<]*<[^>]*>([^<]+)</i],
    ['不设超高最小半径(m)', /不设超高最小半径[^<]*<[^>]*>([^<]+)</i],
    ['停车视距(m)', /停车视距[^<]*<[^>]*>([^<]+)</i],
    ['缓和曲线最小长度(m)', /缓和曲线最小长度[^<]*<[^>]*>([^<]+)</i],

    // === 纵断面 ===
    ['最大纵坡(%)', /最大纵坡[^<]*<[^>]*>([^<]+)</i],
    ['最小坡长(m)', /最小坡长[^<]*<[^>]*>([^<]+)</i],
    ['凸竖曲线一般值(m)', /凸[形]*竖曲线[^<]*一般值[^<]*<[^>]*>([^<]+)</i],
    ['凹竖曲线一般值(m)', /凹[形]*竖曲线[^<]*一般值[^<]*<[^>]*>([^<]+)</i],
    ['最大超高(%)', /最大超高[^<]*<[^>]*>([^<]+)</i],

    // === 横断面/限界 ===
    ['建筑限界净高(m)', /净高[^<]*<[^>]*>([^<]+)</i],

    // === 路基 ===
    ['路基压实度(上路床)', /压实度[^<]*<[^>]*>([^<]+)</i],
    ['填料最小CBR(上路床)', /CBR[^<]*<[^>]*>([^<]+)</i],
    ['路床回弹模量(MPa)', /回弹模量[^<]*<[^>]*>([^<]+)</i],
    ['填方边坡坡率(细粒土)', /填方边坡[^<]*1:([\d.]+)/i],
    ['抗滑稳定系数', /抗滑[稳定]*系数[^<]*<[^>]*>([^<]+)</i],

    // === 路面 ===
    ['面层最小厚度(cm)', /面层[^<]*最小厚度[^<]*<[^>]*>([^<]+)</i],
    ['基层厚度(mm)', /基层[^<]*厚度[^<]*<[^>]*>([^<]+)</i],
    ['水泥弯拉强度(MPa)', /弯拉强度[^<]*<[^>]*>([^<]+)</i],
    ['路拱坡度(%)', /路拱[横]*坡[度]*[^<]*<[^>]*>([^<]+)</i],

    // === 桥涵 ===
    ['汽车荷载', /公路[-—]?[ⅠI一二]级|公路[-—]?[ⅡI二]级/],
    ['桥梁设计使用年限', /桥梁[^<]*设计使用年限[^<]*<[^>]*>([^<]+)</i],
    ['设计洪水频率', /洪水频率[^<]*<[^>]*>([^<]+)</i],

    // === 隧道 ===
    ['隧道建筑限界净高(m)', /隧道[^<]*净高[^<]*<[^>]*>([^<]+)</i],
    ['隧道设计使用年限', /隧道[^<]*设计使用年限[^<]*<[^>]*>([^<]+)</i],

    // === 交安 ===
    ['护栏防撞等级', /护栏[防撞]*等级[^<]*<[^>]*>([^<]+)</i],
    ['标志汉字高度(cm)', /汉字高度[^<]*<[^>]*>([^<]+)</i],
  ];

  rules.forEach(function(rule) {
    var key = rule[0], pattern = rule[1];
    if (params[key]) return; // 已有则跳过
    if (typeof pattern === 'string') {
      // 直接字符串匹配
      var idx = c.indexOf(pattern);
      if (idx >= 0) params[key] = pattern;
    } else {
      var m = c.match(pattern);
      if (m) {
        var val = (m[1] || m[0]).replace(/<[^>]+>/g, '').replace(/[^0-9a-zA-Z\/~%％:：\.\-\s一-鿿]/g, '').trim();
        if (val && val.length < 30) params[key] = val;
      }
    }
  });

  // 洪水频率特殊处理
  if (!params['设计洪水频率']) {
    var fm = c.match(/1\/(\d+)/);
    if (fm) params['设计洪水频率'] = '1/' + fm[1];
  }

  // 设计速度特殊处理
  if (!params['设计速度(km/h)'] && !params['设计速度']) {
    var sm = c.match(/(\d+)\s*km\/h/);
    if (sm) params['设计速度(km/h)'] = sm[1];
  }

  
  // === 更多参数（全等级对照） ===
  var rules2 = [
    // 路基CBR
    ['CBR(上路床)', /CBR[^<]*<[^>]*>([^<]+)</i],
    ['CBR值', /最小[承载]*比[^<]*<[^>]*>([^<]+)</i],
    // 边坡
    ['填方边坡坡率', /1:([\d.]+)[^<]*<[^>]*>/i],
    // 纵坡相关
    ['最大坡长(m)', /最大坡长[^<]*<[^>]*>([^<]+)</i],
    ['最小坡长(m)', /最小坡长[^<]*<[^>]*>([^<]+)</i],
    // 超高
    ['超高渐变率', /超高渐变率[^<]*<[^>]*>([^<]+)</i],
    // 加宽
    ['圆曲线加宽值(m)', /加宽值[^<]*<[^>]*>([^<]+)</i],
    // 桥梁
    ['单孔跨径', /单孔跨径[^<]*<[^>]*>([^<]+)</i],
    ['桥梁总长', /多孔[总]*长[^<]*<[^>]*>([^<]+)</i],
    // 路面结构
    ['面层厚度(cm)', /面层[^<]*厚度[^<]*<[^>]*>([^<]+)</i],
    ['基层厚度范围', /基层[^<]*厚度[^<]*<[^>]*>([^<]+)</i],
    // 交通量
    ['AADT', /AADT[^<]*<[^>]*>([^<]+)</i],
    ['设计交通量', /设计交通量[^<]*<[^>]*>([^<]+)</i],
    // 错车道
    ['错车道宽度(m)', /错车道[行]*[车道]*宽度[^<]*<[^>]*>([^<]+)</i],
    ['错车道有效长度(m)', /错车道有效长度[^<]*<[^>]*>([^<]+)</i],
    // 竖曲线
    ['凸竖曲线极限值(m)', /凸[形]*竖曲线[^<]*极限值[^<]*<[^>]*>([^<]+)</i],
    ['凹竖曲线极限值(m)', /凹[形]*竖曲线[^<]*极限值[^<]*<[^>]*>([^<]+)</i],
    ['竖曲线最小长度(m)', /竖曲线[^<]*长[度]*[^<]*<[^>]*>([^<]+)</i],
    // 会车视距
    ['会车视距(m)', /会车视距[^<]*<[^>]*>([^<]+)</i],
    // 合成坡度
    ['最大合成坡度(%)', /最大合成坡度[^<]*<[^>]*>([^<]+)</i],
  ];
  rules2.forEach(function(r) {
    if (params[r[0]]) return;
    var m = c.match(r[1]);
    if (m) {
      var v = (m[1] || m[0]).replace(/<[^>]+>/g, '').replace(/[^0-9a-zA-Z\/~%％:\.\-\s一-鿿]/g, '').trim();
      if (v && v.length < 30) params[r[0]] = v;
    }
  });

  // 适用公路等级（只在表格标签中检测，避免参考文字误判）
  if (!params['适用公路等级']) {
    var grades = [];
    var tds = c.match(/<t[dh][^>]*>/gi) || []; var tdContent = tds.map(function(t){return t.replace(/<[^>]+>/g,'')}).join(' ');
    // 四级(Ⅰ/Ⅱ类)小交通量
    if (tdContent.indexOf('四级公路（Ⅰ类）')>=0||tdContent.indexOf('四级公路（I类）')>=0) grades.push('四级(Ⅰ类)');
    if (tdContent.indexOf('四级公路（Ⅱ类）')>=0||tdContent.indexOf('四级公路（II类）')>=0) grades.push('四级(Ⅱ类)');
    // 如果没有Ⅰ/Ⅱ类细分，检测普通等级
    if (grades.length === 0) {
      if (tdContent.match(/高速[公路]*[^a-zA-Z]/)) grades.push('高速');
      if (tdContent.match(/一级[公路]*[^a-zA-Z]/)) grades.push('一级');
      if (tdContent.match(/二级[公路]*[^a-zA-Z]/)) grades.push('二级');
      if (tdContent.match(/三级[公路]*[^a-zA-Z]/)) grades.push('三级');
      if (tdContent.match(/四级[公路]*[^a-zA-Z]/)&&grades.length===0) grades.push('四级');
    }
    // 严格检测：只在td中找等级
    if (grades.length > 0 && grades.length < 6) params['适用公路等级'] = grades.join('/');
  }

// 如果指定了匹配等级，优先从表格中取该等级列的值
  if (matchGrade && params['适用公路等级'] && params['适用公路等级'].split('/').length > 1) {
    // 多等级规范：尝试从表格中提取matchGrade对应列的值
    var rows = c.match(/<tr>[\s\S]*?<\/tr>/gi) || [];
    var gradeIdxMap = {}; // 表头等级→列索引
    // 先找表头行中的等级列
    var headerRow = null;
    for (var ri = 0; ri < Math.min(rows.length, 5); ri++) {
      if (rows[ri].indexOf(matchGrade) >= 0 || rows[ri].indexOf('等级') >= 0) {
        headerRow = rows[ri]; break;
      }
    }
    // 简化：不自动替换，仅标记
  }

  return params;

}

/** 生成对比表格 HTML */
function renderCompareTable(specs, gradesArr) {
  if (!specs || specs.length === 0) return '';

  // 收集所有参数键
  var allKeys = [];
  var specParams = specs.map(function(s, i) {
    var g = gradesArr ? gradesArr[i] : null;
    var p = extractKeyParams(s, g);
    Object.keys(p).forEach(function(k) {
      if (allKeys.indexOf(k) < 0) allKeys.push(k);
    });
    return p;
  });

  if (allKeys.length === 0) {
    return '<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-title">无可对比参数</div><div class="empty-hint">所选规范暂无可自动提取的对比参数，建议手动参考详情页</div></div>';
  }

  // 等级匹配提示
  var inter = null;
  var allGrades = specParams.map(function(p) { return p['适用公路等级'] ? p['适用公路等级'].split('/') : []; });
  if (allGrades.length >= 2) {
    inter = allGrades[0].filter(function(g) { return allGrades.every(function(gs) { return gs.indexOf(g) >= 0; }); });
  }
  var gradeInfos = specs.map(function(s, i) { return '<b>'+s.code+'</b>: '+(specParams[i]['适用公路等级']||'未识别'); }).join(' | ');
  var headerHtml = '<div style="background:#fef3c7;padding:8px 14px;border-radius:6px;margin-bottom:10px;font-size:12px;color:#92400e;">📌 '+gradeInfos;
  if (inter && inter.length > 0) {
    headerHtml += ' → 可对比等级：<b>'+inter.join('/')+'</b>';
  } else if (allGrades.length >= 2) {
    headerHtml += ' → ⚠ 等级范围不同，多等级规范的数值为首列值';
  }
  headerHtml += '</div>';

  // 构建表格
  var html = headerHtml + '<div class="compare-table-wrap"><table class="compare-table"><thead><tr><th>参数项</th>';
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
