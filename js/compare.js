/* 对比工具 — 智能等级匹配版 */
function extractKeyParams(spec, matchGrade) {
  if (!spec || !spec.content) return {};
  var params = {}, c = spec.content, m;

  // === 适用等级 ===
  var tdText = (c.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || []).join(' ').replace(/<[^>]+>/g,'');
  var grades = [];
  if (tdText.indexOf('干路')>=0 && tdText.indexOf('支路')>=0) { grades.push('干路'); grades.push('支路'); if (tdText.indexOf('巷路')>=0) grades.push('巷路'); }
  if (tdText.indexOf('四级公路（Ⅰ类）')>=0||tdText.indexOf('四级公路（I类）')>=0) grades.push('四级(Ⅰ类)');
  if (tdText.indexOf('四级公路（Ⅱ类）')>=0||tdText.indexOf('四级公路（II类）')>=0) grades.push('四级(Ⅱ类)');
  if (grades.length === 0) {
    ['高速','一级','二级','三级','四级'].forEach(function(g){
      if (tdText.match(new RegExp(g+'[公路]*[^a-zA-Z]'))) grades.push(g);
    });
  }
  if (grades.length > 0 && grades.length < 6) params['适用公路等级'] = grades.join('/');

  // === 等级匹配：从表格中提取matchGrade对应列的值 ===
  if (matchGrade && grades.length > 1 && grades.indexOf(matchGrade) >= 0) {
    var rows = c.match(/<tr>[\s\S]*?<\/tr>/gi) || [];
    // 第一步：找表头行，确定matchGrade在第几列
    var gradeCol = -1;
    for (var ri = 0; ri < Math.min(rows.length, 8); ri++) {
      var cells = rows[ri].match(/<t[dh][^>]*>([^<]*)<\/t[dh]>/gi) || [];
      for (var ci = 0; ci < cells.length; ci++) {
        if (cells[ci].replace(/<[^>]+>/g,'').trim().indexOf(matchGrade) >= 0) { gradeCol = ci; break; }
      }
      if (gradeCol >= 0) break;
    }
    // 第二步：遍历后续行，提取参数名(第0列)和对应等级的值(gradeCol列)
    if (gradeCol >= 0) {
      for (var ri = 0; ri < rows.length; ri++) {
        var cells = rows[ri].match(/<t[dh][^>]*>([^<]*)<\/t[dh]>/gi) || [];
        if (cells.length <= gradeCol) continue;
        var name = cells[0].replace(/<[^>]+>/g,'').replace(/[^\u4e00-\u9fa5a-zA-Z0-9()（）]/g,'').trim();
        var val = cells[gradeCol].replace(/<[^>]+>/g,'').replace(/[^0-9a-zA-Z\/~%％≥≤:.\-]/g,'').trim();
        if (name && val && name.length < 15 && val.length < 15 && /\d/.test(val)) {
          // 映射为标准化参数名
          var keyMap = { '车道宽度':'车道宽度(m)','路肩宽度':'路肩宽度(m)','路基宽度':'路基宽度(m)','路面宽度':'路面宽度(m)','停车视距':'停车视距(m)','最大纵坡':'最大纵坡(%)','设计速度':'设计速度(km/h)','最小半径':'平曲线最小半径一般值(m)','压实度':'路基压实度(上路床)','洪水频率':'设计洪水频率','汽车荷载':'汽车荷载','硬路肩':'硬路肩宽度(m)','土路肩':'路肩宽度(m)','车道数':'车道数','净高':'建筑限界净高(m)','纵坡':'最大纵坡(%)','视距':'停车视距(m)' };
          var mapped = name;
          Object.keys(keyMap).forEach(function(k){ if (name.indexOf(k)>=0) mapped = keyMap[k]; });
          params[mapped] = val;
        }
      }
    }
  }

  // === 通用参数提取 ===
  var rules = [
    ['设计速度(km/h)',[/\(\d+\)\s*km\/h/i,/设计速度[^<]*<[^>]*>([^<]+)</i]],
    ['车道宽度(m)',[/车道宽[^<]*<[^>]*>([^<]+)</i]],
    ['路肩宽度(m)',[/路肩宽[^<]*<[^>]*>([^<]+)</i]],
    ['路基宽度(m)',[/路基宽度[^<]*<[^>]*>([^<]+)</i]],
    ['路面宽度(m)',[/路面宽度[^<]*<[^>]*>([^<]+)</i]],
    ['停车视距(m)',[/停车视距[^<]*<[^>]*>([^<]+)</i]],
    ['最大纵坡(%)',[/最大纵坡[^<]*<[^>]*>([^<]+)</i]],
    ['平曲线最小半径一般值(m)',[/一般最小半径[^<]*<[^>]*>([^<]+)</i]],
    ['建筑限界净高(m)',[/净高[^<]*<[^>]*>([^<]+)</i]],
    ['路基压实度(上路床)',[/压实度[^<]*<[^>]*>([^<]+)</i]],
    ['路面设计年限',[/设计[使用]*年限[^<]*<[^>]*>([^<]+)</i]],
    ['汽车荷载',[/公路[-—]?[ⅠI]级|公路[-—]?[ⅡI]级/]],
    ['设计洪水频率',[/洪水频率[^<]*<[^>]*>([^<]+)</i]],
    ['设计速度',[/\(\d+\)\s*km\/h/]],
  ];
  rules.forEach(function(r){
    if (params[r[0]]) return;
    for (var i=0;i<r[1].length;i++){
      m=c.match(r[1][i]);
      if(m){var v=(m[1]||m[0]).replace(/<[^>]+>/g,'').replace(/[^0-9a-zA-Z\/~%％≥≤:.\-]/g,'').trim();if(v&&v.length<30){params[r[0]]=v;break;}}
    }
  });

  if (!params['设计洪水频率']) { m=c.match(/1\/(\d+)/); if(m) params['设计洪水频率']='1/'+m[1]; }
  return params;
}

function renderCompareTable(specs, gradesArr) {
  if (!specs||specs.length===0) return '';
  var specParams=specs.map(function(s,i){return extractKeyParams(s,gradesArr?gradesArr[i]:null);});
  var allKeys=[]; specParams.forEach(function(p){Object.keys(p).forEach(function(k){if(k!=='适用公路等级'&&allKeys.indexOf(k)<0)allKeys.push(k);});});
  if(allKeys.length===0) return '<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-title">无可对比参数</div></div>';

  // 先显示适用等级行
  allKeys.unshift('适用公路等级');

  var gradeInfos=specs.map(function(s,i){return '<b>'+s.code+'</b>: '+(specParams[i]['适用公路等级']||'未识别');}).join(' | ');
  var html='<div style="background:#fef3c7;padding:8px 14px;border-radius:6px;margin-bottom:10px;font-size:12px;color:#92400e;">📌 '+gradeInfos+'</div>';
  html+='<div class="compare-table-wrap"><table class="compare-table"><thead><tr><th>参数项</th>';
  specs.forEach(function(s){html+='<th>'+s.code.substring(0,18)+'</th>';});
  html+='</tr></thead><tbody>';
  allKeys.forEach(function(key){
    html+='<tr><td>'+key+'</td>';
    var vals=specParams.map(function(p){return p[key]||'—';});
    var diff=!vals.every(function(v){return v===vals[0];})&&vals.length>1;
    vals.forEach(function(v){html+='<td'+(diff?' class="diff"':'')+'>'+v+'</td>';});
    html+='</tr>';
  });
  html+='</tbody></table></div>';
  return html;
}
