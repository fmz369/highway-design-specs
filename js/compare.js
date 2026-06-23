/* 对比引擎 v2 — 三通道提取 + 参数归一化 + 等级精准匹配 */

// === 参数名归一化词典（50+项） ===
var NORMALIZE = {
  '设计速度':'设计速度(km/h)','设计速度(km/h)':'设计速度(km/h)',
  '车道宽度':'车道宽度(m)','车道宽':'车道宽度(m)','行车道宽度':'车道宽度(m)',
  '车道数':'车道数',
  '路肩宽度':'路肩宽度(m)','路肩宽':'路肩宽度(m)','硬路肩宽':'硬路肩宽度(m)','硬路肩':'硬路肩宽度(m)','硬路肩宽度':'硬路肩宽度(m)','土路肩':'土路肩宽度(m)','土路肩宽':'土路肩宽度(m)',
  '中间带宽':'中间带宽度(m)','中间带宽度':'中间带宽度(m)','中央分隔带宽':'中间带宽度(m)',
  '路基宽度':'路基宽度(m)','路面宽度':'路面宽度(m)',
  '平曲线一般值':'平曲线最小半径一般值(m)','一般最小半径':'平曲线最小半径一般值(m)','平曲线最小半径一般值':'平曲线最小半径一般值(m)',
  '平曲线极限值':'平曲线最小半径极限值(m)','极限最小半径':'平曲线最小半径极限值(m)',
  '停车视距':'停车视距(m)','会车视距':'会车视距(m)',
  '最大纵坡':'最大纵坡(%)','最小坡长':'最小坡长(m)','最大坡长':'最大坡长(m)',
  '凸竖曲线一般值':'凸竖曲线一般值(m)','凹竖曲线一般值':'凹竖曲线一般值(m)',
  '凸竖曲线极限值':'凸竖曲线极限值(m)','凹竖曲线极限值':'凹竖曲线极限值(m)',
  '最大超高':'最大超高(%)','最大合成坡度':'最大合成坡度(%)',
  '净高':'建筑限界净高(m)','建筑限界净高':'建筑限界净高(m)',
  '压实度':'路基压实度(上路床)','上路床压实度':'路基压实度(上路床)',
  'CBR':'填料CBR(%)','填料CBR':'填料CBR(%)','承载力比':'填料CBR(%)',
  '设计年限':'路面设计年限','路面设计年限':'路面设计年限','设计使用年限':'设计使用年限',
  '面层厚度':'面层最小厚度(cm)','面层最小厚度':'面层最小厚度(cm)',
  '基层厚度':'基层厚度(mm)','弯拉强度':'水泥弯拉强度(MPa)',
  '路拱坡度':'路拱坡度(%)','路拱横坡':'路拱坡度(%)',
  '汽车荷载':'汽车荷载','荷载等级':'汽车荷载',
  '洪水频率':'设计洪水频率','设计洪水频率':'设计洪水频率',
  '桥梁设计使用年限':'桥梁设计使用年限','桥涵设计使用年限':'桥梁设计使用年限',
  '护栏等级':'护栏防撞等级','防撞等级':'护栏防撞等级',
  'AADT':'AADT','设计交通量':'AADT',
  '错车道宽度':'错车道宽度(m)','错车道有效长度':'错车道有效长度(m)',
  '加宽值':'圆曲线加宽值(m)','圆曲线加宽':'圆曲线加宽值(m)',
  '缓和曲线长':'缓和曲线最小长度(m)','缓和曲线最小长度':'缓和曲线最小长度(m)',
  '竖曲线长':'竖曲线最小长度(m)','竖曲线最小长度':'竖曲线最小长度(m)',
};

/** 从一行单元格中提取参数名和值 */
function extractPair(cells, nameIdx, valIdx) {
  if (cells.length <= Math.max(nameIdx, valIdx)) return null;
  var name = cells[nameIdx].replace(/<[^>]+>/g, '').replace(/[^\u4e00-\u9fa5a-zA-Z0-9()（）m%]/g, '').trim();
  var val = cells[valIdx].replace(/<[^>]+>/g, '').replace(/[^0-9a-zA-Z\/~%％≥≤:.\-]/g, '').trim();
  if (!name || !val || name.length > 20 || val.length > 25 || !/[\d]/.test(val)) return null;
  return { name: name, val: val };
}

/** 归一化参数名 */
function normalize(name) {
  for (var k in NORMALIZE) { if (name.indexOf(k) >= 0) return NORMALIZE[k]; }
  return name.replace(/[^\u4e00-\u9fa5a-zA-Z0-9()（）m%]/g, '').trim();
}

/** 核心提取函数 */
function extractKeyParams(spec, matchGrade) {
  if (!spec || !spec.content) return {};
  var p = {}, c = spec.content, m, i, j;

  // === 1. 适用等级检测 ===
  var tdText = (c.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || []).join(' ').replace(/<[^>]+>/g, '');
  var grades = [];
  if (tdText.indexOf('干路') >= 0 && tdText.indexOf('支路') >= 0) { grades.push('干路','支路'); if (tdText.indexOf('巷路') >= 0) grades.push('巷路'); }
  if (tdText.indexOf('四级公路（Ⅰ类') >= 0 || tdText.indexOf('四级公路（I类') >= 0) grades.push('四级(Ⅰ类)');
  if (tdText.indexOf('四级公路（Ⅱ类') >= 0 || tdText.indexOf('四级公路（II类') >= 0) grades.push('四级(Ⅱ类)');
  if (grades.length === 0) ['高速','一级','二级','三级','四级'].forEach(function(g){ if (tdText.match(new RegExp(g+'[公路]*[^a-zA-Z]'))) grades.push(g); });
  if (grades.length > 0 && grades.length < 6) p['适用公路等级'] = grades.join('/');
  if (matchGrade) p['适用公路等级'] = matchGrade;

  // === 2. 通道A：列式表格（<th>高速</th><th>一级</th>...）===
  var rows = c.match(/<tr>[\s\S]*?<\/tr>/gi) || [];
  var gradeCol = -1;
  if (matchGrade) {
    // 找最好的表头行
    for (i = 0; i < rows.length; i++) {
      var hc = rows[i].match(/<t[dh][^>]*>([^<]*)<\/t[dh]>/gi) || [];
      var gc = hc.map(function(t){return t.replace(/<[^>]+>/g,'').trim();});
      var gradeCount = gc.filter(function(t){return t.indexOf('高速')>=0||t.indexOf('一级')>=0||t.indexOf('二级')>=0||t.indexOf('三级')>=0||t.indexOf('四级')>=0;}).length;
      if (gradeCount >= 2) {
        for (j = 0; j < gc.length; j++) {
          if (gc[j].indexOf(matchGrade) >= 0) { gradeCol = j; break; }
        }
        if (gradeCol >= 0) break;
      }
    }
    // 从该列提取数据
    if (gradeCol >= 0) {
      for (i = 0; i < rows.length; i++) {
        var dc = rows[i].match(/<t[dh][^>]*>([^<]*)<\/t[dh]>/gi) || [];
        if (dc.length <= gradeCol + 1) continue;
        var pair = extractPair(dc, 0, gradeCol);
        if (pair) {
          var nk = normalize(pair.name);
          if (!p[nk]) p[nk] = pair.val;
        }
      }
    }
  }

  // === 3. 通道B：行式表格（<tr><td>高速</td><td>值</td>...）===
  for (i = 0; i < rows.length; i++) {
    var dc = rows[i].match(/<t[dh][^>]*>([^<]*)<\/t[dh]>/gi) || [];
    if (dc.length < 2) continue;
    var first = dc[0].replace(/<[^>]+>/g, '').trim();
    // 检查是否以等级关键词开头
    var isGradeRow = (first.indexOf('高速')>=0||first.indexOf('一级')>=0||first.indexOf('二级')>=0||first.indexOf('三级')>=0||first.indexOf('四级')>=0);
    if (isGradeRow && matchGrade) {
      // 如果这行是目标等级，提取后续列的值
      if (first.indexOf(matchGrade) >= 0) {
        // 尝试将后续列映射到参数
        var paramKeys = ['AADT','出入控制','设计年限','设计速度(km/h)','车道宽度(m)','车道数','硬路肩宽度(m)','路基宽度(m)','路面宽度(m)'];
        for (j = 1; j < dc.length && j <= paramKeys.length; j++) {
          var v = dc[j].replace(/<[^>]+>/g, '').replace(/[^0-9a-zA-Z\/~%％≥≤:.\-]/g, '').trim();
          if (v && /\d/.test(v)) {
            var nk = paramKeys[j-1];
            if (!p[nk]) p[nk] = v;
          }
        }
      }
    }
  }

  // === 4. 通道C：li标签中的span.hl参数 ===
  var liItems = c.match(/<li>[^<]*<span class="hl">([^<]+)<\/span>[：:]\s*([^<]+)<\/li>/gi) || [];
  liItems.forEach(function(li){
    var pm = li.match(/<span class="hl">([^<]+)<\/span>[：:]\s*([^<]+)/i);
    if (pm) {
      var lk = pm[1].trim(), lv = pm[2].replace(/<[^>]+>/g, '').replace(/[^0-9a-zA-Z\/~%％≥≤:.\-\s]/g, '').trim();
      var nk = normalize(lk);
      if (lv && lv.length < 25 && !p[nk]) p[nk] = lv;
    }
  });

  // === 5. 通道D：正则兜底 ===
  var fallbackRules = [
    ['设计速度(km/h)',[/(\d+)\s*km\/h/i]],['车道宽度(m)',[/车道宽[^<]*<[^>]*>([^<]+)</i]],
    ['路肩宽度(m)',[/路肩宽[^<]*<[^>]*>([^<]+)</i]],['路基宽度(m)',[/路基宽度[^<]*<[^>]*>([^<]+)</i]],
    ['停车视距(m)',[/停车视距[^<]*<[^>]*>([^<]+)</i]],['最大纵坡(%)',[/最大纵坡[^<]*<[^>]*>([^<]+)</i]],
    ['建筑限界净高(m)',[/净高[^<]*<[^>]*>([^<]+)</i]],['路基压实度(上路床)',[/压实度[^<]*<[^>]*>([^<]+)</i]],
    ['路面设计年限',[/路面设计[使用]*年限[^<]*<[^>]*>([^<]+)</i]],['汽车荷载',[/公路[-—]?[ⅠI]级|公路[-—]?[ⅡI]级/]],
    ['设计洪水频率',[/洪水频率[^<]*<[^>]*>([^<]+)</i]],['AADT',[/AADT[^<]*<[^>]*>([^<]+)</i]],
    ['最大坡长(m)',[/最大坡长[^<]*<[^>]*>([^<]+)</i]],['最小坡长(m)',[/最小坡长[^<]*<[^>]*>([^<]+)</i]],
    ['最大超高(%)',[/最大超高[^<]*<[^>]*>([^<]+)</i]],['面层最小厚度(cm)',[/面层[^<]*厚度[^<]*<[^>]*>([^<]+)</i]],
    ['基层厚度(mm)',[/基层[^<]*厚度[^<]*<[^>]*>([^<]+)</i]],['水泥弯拉强度(MPa)',[/弯拉强度[^<]*<[^>]*>([^<]+)</i]],
  ];
  fallbackRules.forEach(function(r){
    if (p[r[0]]) return;
    for (i=0;i<r[1].length;i++){m=c.match(r[1][i]);if(m){var v=(m[1]||m[0]).replace(/<[^>]+>/g,'').replace(/[^0-9a-zA-Z\/~%％≥≤:.\-]/g,'').trim();if(v&&v.length<25){p[r[0]]=v;break;}}}
  });
  if (!p['设计洪水频率']){m=c.match(/1\/(\d+)/);if(m)p['设计洪水频率']='1/'+m[1];}
  if (!p['设计速度(km/h)']){m=c.match(/(\d+)\s*km\/h/);if(m)p['设计速度(km/h)']=m[1];}

  return p;
}

function renderCompareTable(specs, gradesArr) {
  if (!specs || specs.length === 0) return '';
  var specParams = specs.map(function(s,i){return extractKeyParams(s,gradesArr?gradesArr[i]:null);});
  var allKeys = []; specParams.forEach(function(p){Object.keys(p).forEach(function(k){if(k!=='适用公路等级'&&allKeys.indexOf(k)<0)allKeys.push(k);});});
  if (allKeys.length === 0) return '<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-title">无可对比参数</div></div>';
  allKeys.unshift('适用公路等级');
  var info = specs.map(function(s,i){return '<b>'+s.code+'</b>: '+(specParams[i]['适用公路等级']||'未识别');}).join(' | ');
  var html = '<div style="background:#fef3c7;padding:8px 14px;border-radius:6px;margin-bottom:10px;font-size:12px;color:#92400e;">📌 '+info+'</div>';
  html += '<div class="compare-table-wrap"><table class="compare-table"><thead><tr><th>参数项</th>';
  specs.forEach(function(s){html+='<th>'+s.code.substring(0,18)+'</th>';});
  html += '</tr></thead><tbody>';
  allKeys.forEach(function(key){
    html += '<tr><td>'+key+'</td>';
    var vals=specParams.map(function(p){return p[key]||'—';});
    var diff=!vals.every(function(v){return v===vals[0];})&&vals.length>1;
    vals.forEach(function(v){html+='<td'+(diff?' class="diff"':'')+'>'+v+'</td>';});
    html+='</tr>';
  });
  html+='</tbody></table></div>';
  return html;
}
