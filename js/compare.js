/* ============================================================
   规范对比工具逻辑
   ============================================================ */

/** 提取规范的通用参数进行对比 */
function extractKeyParams(spec) {
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
