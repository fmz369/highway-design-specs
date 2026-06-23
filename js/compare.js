/* 对比工具 — 设计师视角智能版 */
function extractKeyParams(spec, matchGrade) {
  if (!spec || !spec.content) return {};
  var p = {}, c = spec.content, m, i;

  // === 1. 检测适用等级 ===
  var tdText = (c.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || []).join(' ').replace(/<[^>]+>/g, '');
  var grades = [];
  if (tdText.indexOf('干路') >= 0 && tdText.indexOf('支路') >= 0) { grades.push('干路','支路'); if (tdText.indexOf('巷路') >= 0) grades.push('巷路'); }
  if (tdText.indexOf('四级公路（Ⅰ类') >= 0 || tdText.indexOf('四级公路（I类') >= 0) grades.push('四级(Ⅰ类)');
  if (tdText.indexOf('四级公路（Ⅱ类') >= 0 || tdText.indexOf('四级公路（II类') >= 0) grades.push('四级(Ⅱ类)');
  if (grades.length === 0) {
    ['高速', '一级', '二级', '三级', '四级'].forEach(function (g) {
      if (tdText.match(new RegExp(g + '[公路]*[^a-zA-Z]'))) grades.push(g);
    });
  }
  if (grades.length > 0 && grades.length < 6) p['适用公路等级'] = grades.join('/');

  // === 2. 等级匹配：智能提取对应等级列的数据 ===
  if (matchGrade && grades.length > 1) {
    p['适用公路等级'] = matchGrade;
    var rows = c.match(/<tr>[\s\S]*?<\/tr>/gi) || [];
    var gradeCols = {};

    // 方法A：找列式表头
    var bestHeaderIdx = -1, bestColCount = 0;
    for (i = 0; i < rows.length; i++) {
      var hc = (rows[i].match(/<t[dh][^>]*>([^<]*)<\/t[dh]>/gi) || []).map(function (t) { return t.replace(/<[^>]+>/g, '').trim(); });
      var gradeCount = hc.filter(function (t) { return t.indexOf('高速')>=0||t.indexOf('一级')>=0||t.indexOf('二级')>=0||t.indexOf('三级')>=0||t.indexOf('四级')>=0; }).length;
      if (gradeCount >= 3 && hc.length > bestColCount) { bestHeaderIdx = i; bestColCount = hc.length; }
    }
    if (bestHeaderIdx >= 0) {
      var hc = (rows[bestHeaderIdx].match(/<t[dh][^>]*>([^<]*)<\/t[dh]>/gi) || []).map(function (t) { return t.replace(/<[^>]+>/g, '').trim(); });
      hc.forEach(function (t, ci) { if (t.indexOf('高速')>=0||t.indexOf('一级')>=0||t.indexOf('二级')>=0||t.indexOf('三级')>=0||t.indexOf('四级')>=0) gradeCols[t] = ci; });
    }

    // 方法B：找行式数据 <tr><td>高速</td><td>值1</td><td>值2</td></tr>
    var rowData = {};
    for (i = 0; i < rows.length; i++) {
      var dc = (rows[i].match(/<t[dh][^>]*>([^<]*)<\/t[dh]>/gi) || []).map(function (t) { return t.replace(/<[^>]+>/g, '').trim(); });
      if (dc.length >= 2 && (dc[0].indexOf('高速')>=0||dc[0].indexOf('一级')>=0||dc[0].indexOf('二级')>=0||dc[0].indexOf('三级')>=0||dc[0].indexOf('四级')>=0)) {
        rowData[dc[0]] = dc.slice(1);
      }
    }

    // 使用方法A或B提取数据
    if (Object.keys(gradeCols).length > 0 && gradeCols[matchGrade] !== undefined) {
      var tc = gradeCols[matchGrade];
      for (i = bestHeaderIdx + 1; i < rows.length; i++) {
        var dc = (rows[i].match(/<t[dh][^>]*>([^<]*)<\/t[dh]>/gi) || []).map(function (t) { return t.replace(/<[^>]+>/g, '').trim(); });
        if (dc.length <= tc) continue;
        var name = dc[0].replace(/[^\u4e00-\u9fa5a-zA-Z0-9()（）m]/g, '').trim();
        var val = (dc[tc] || '').replace(/[^0-9a-zA-Z\/~%％≥≤:.\-]/g, '').trim();
        if (name && val && name.length < 15 && val.length < 15 && /\d/.test(val)) {
          var km = { '车道宽度': '车道宽度(m)', '路肩宽度': '路肩宽度(m)', '路基宽度': '路基宽度(m)', '路面宽度': '路面宽度(m)', '行车道宽度': '车道宽度(m)', '停车视距': '停车视距(m)', '最大纵坡': '最大纵坡(%)', '设计速度': '设计速度(km/h)', '最小半径': '平曲线最小半径一般值(m)', '压实度': '路基压实度(上路床)', '洪水频率': '设计洪水频率', '荷载': '汽车荷载', '硬路肩': '硬路肩宽度(m)', '土路肩': '路肩宽度(m)', '车道数': '车道数', '净高': '建筑限界净高(m)', 'CBR': '填料CBR(%)', '年限': '设计年限', '超高': '最大超高(%)' };
          var mk = name; Object.keys(km).forEach(function (k) { if (name.indexOf(k) >= 0) mk = km[k]; });
          p[mk] = val;
        }
      }
    }
    // 方法B补充单行数据
    if (rowData[matchGrade]) {
      var keys = ['AADT', '出入控制', '设计年限', '设计速度(km/h)', '车道宽度(m)', '车道数', '硬路肩宽度(m)', '土路肩', '路基宽度(m)', '路面宽度(m)'];
      rowData[matchGrade].forEach(function (v, vi) {
        v = v.replace(/[^0-9a-zA-Z\/~%％≥≤:.\-]/g, '').trim();
        if (v && /\d/.test(v) && vi < keys.length) p[keys[vi]] = v;
      });
    }
  }

  // === 3. 设计师最关心的参数（38项全覆盖） ===
  var rules = [
    // 核心线形
    ['设计速度(km/h)', [/(\d+)\s*km\/h/i]], ['车道宽度(m)', [/车道宽[^<]*<[^>]*>([^<]+)</i]],
    ['车道数', [/车道数[^<]*<[^>]*>([^<]+)</i]], ['路肩宽度(m)', [/路肩宽[^<]*<[^>]*>([^<]+)</i]],
    ['硬路肩宽度(m)', [/硬路肩[^<]*<[^>]*>([^<]+)</i]], ['中间带宽度(m)', [/中间带[总]*宽[^<]*<[^>]*>([^<]+)</i]],
    ['路基宽度(m)', [/路基宽度[^<]*<[^>]*>([^<]+)</i]], ['路面宽度(m)', [/路面宽度[^<]*<[^>]*>([^<]+)</i]],
    // 平面
    ['平曲线一般值(m)', [/一般最小半径[^<]*<[^>]*>([^<]+)</i]], ['平曲线极限值(m)', [/极限最小半径[^<]*<[^>]*>([^<]+)</i]],
    ['停车视距(m)', [/停车视距[^<]*<[^>]*>([^<]+)</i]], ['会车视距(m)', [/会车视距[^<]*<[^>]*>([^<]+)</i]],
    ['缓和曲线最小长度(m)', [/缓和曲线最小长度[^<]*<[^>]*>([^<]+)</i]],
    // 纵断面
    ['最大纵坡(%)', [/最大纵坡[^<]*<[^>]*>([^<]+)</i]], ['最小坡长(m)', [/最小坡长[^<]*<[^>]*>([^<]+)</i]],
    ['最大坡长(m)', [/最大坡长[^<]*<[^>]*>([^<]+)</i]], ['凸竖曲线(m)', [/凸[形]*竖曲线[^<]*一般值[^<]*<[^>]*>([^<]+)</i]],
    ['凹竖曲线(m)', [/凹[形]*竖曲线[^<]*一般值[^<]*<[^>]*>([^<]+)</i]],
    // 超高加宽
    ['最大超高(%)', [/最大超高[^<]*<[^>]*>([^<]+)</i]], ['最大合成坡度(%)', [/最大合成坡度[^<]*<[^>]*>([^<]+)</i]],
    ['圆曲线加宽值(m)', [/加宽值[^<]*<[^>]*>([^<]+)</i]],
    // 限界
    ['建筑限界净高(m)', [/净高[^<]*<[^>]*>([^<]+)</i]],
    // 路基
    ['路基压实度(上路床)', [/压实度[^<]*<[^>]*>([^<]+)</i]], ['填料CBR(%)', [/CBR[^<]*<[^>]*>([^<]+)</i]],
    // 路面
    ['路面设计年限', [/路面设计[使用]*年限[^<]*<[^>]*>([^<]+)</i]], ['面层厚度(cm)', [/面层[^<]*厚度[^<]*<[^>]*>([^<]+)</i]],
    ['基层厚度(mm)', [/基层[^<]*厚度[^<]*<[^>]*>([^<]+)</i]], ['水泥弯拉强度(MPa)', [/弯拉强度[^<]*<[^>]*>([^<]+)</i]],
    ['路拱坡度(%)', [/路拱[横]*坡[^<]*<[^>]*>([^<]+)</i]],
    // 桥涵
    ['汽车荷载', [/公路[-—]?[ⅠI]级|公路[-—]?[ⅡI]级/]], ['设计洪水频率', [/洪水频率[^<]*<[^>]*>([^<]+)</i]],
    ['桥梁设计使用年限', [/桥梁[^<]*设计使用年限[^<]*<[^>]*>([^<]+)</i]],
    // 其他
    ['护栏等级', [/护栏[防撞]*等级[^<]*<[^>]*>([^<]+)</i]], ['AADT', [/AADT[^<]*<[^>]*>([^<]+)</i]],
    ['错车道宽度(m)', [/错车道[^<]*宽度[^<]*<[^>]*>([^<]+)</i]], ['设计使用年限', [/设计使用年限[^<]*<[^>]*>([^<]+)</i]],
  ];
  rules.forEach(function (r) {
    if (p[r[0]]) return;
    for (i = 0; i < r[1].length; i++) { m = c.match(r[1][i]); if (m) { var v = (m[1] || m[0]).replace(/<[^>]+>/g, '').replace(/[^0-9a-zA-Z\/~%％≥≤:.\-]/g, '').trim(); if (v && v.length < 25) { p[r[0]] = v; break; } } }
  });
  if (!p['设计洪水频率']) { m = c.match(/1\/(\d+)/); if (m) p['设计洪水频率'] = '1/' + m[1]; }
  if (!p['设计速度(km/h)']) { m = c.match(/(\d+)\s*km\/h/); if (m) p['设计速度(km/h)'] = m[1]; }
  return p;
}

function renderCompareTable(specs, gradesArr) {
  if (!specs || specs.length === 0) return '';
  var specParams = specs.map(function (s, i) { return extractKeyParams(s, gradesArr ? gradesArr[i] : null); });
  var allKeys = []; specParams.forEach(function (p) { Object.keys(p).forEach(function (k) { if (k !== '适用公路等级' && allKeys.indexOf(k) < 0) allKeys.push(k); }); });
  if (allKeys.length === 0) return '<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-title">无可对比参数</div></div>';
  allKeys.unshift('适用公路等级');
  var info = specs.map(function (s, i) { return '<b>' + s.code + '</b>: ' + (specParams[i]['适用公路等级'] || '未识别'); }).join(' | ');
  var html = '<div style="background:#fef3c7;padding:8px 14px;border-radius:6px;margin-bottom:10px;font-size:12px;color:#92400e;">📌 ' + info + '</div>';
  html += '<div class="compare-table-wrap"><table class="compare-table"><thead><tr><th>参数项</th>';
  specs.forEach(function (s) { html += '<th>' + s.code.substring(0, 18) + '</th>'; });
  html += '</tr></thead><tbody>';
  allKeys.forEach(function (key) {
    html += '<tr><td>' + key + '</td>';
    var vals = specParams.map(function (p) { return p[key] || '—'; });
    var diff = !vals.every(function (v) { return v === vals[0]; }) && vals.length > 1;
    vals.forEach(function (v) { html += '<td' + (diff ? ' class="diff"' : '') + '>' + v + '</td>'; });
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  return html;
}
