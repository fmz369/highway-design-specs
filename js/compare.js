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
    // 找最好的表头行（选最多等级列的那个）
    var bestGradeCol = -1, bestGradeCount = 0;
    for (i = 0; i < rows.length; i++) {
      var hc = rows[i].match(/<t[dh][^>]*>([^<]*)<\/t[dh]>/gi) || [];
      var gc = hc.map(function(t){return t.replace(/<[^>]+>/g,'').trim();});
      var gradeCount = gc.filter(function(t){return t.indexOf('高速')>=0||t.indexOf('一级')>=0||t.indexOf('二级')>=0||t.indexOf('三级')>=0||t.indexOf('四级')>=0;}).length;
      if (gradeCount >= 2 && gradeCount > bestGradeCount) {
        for (j = 0; j < gc.length; j++) {
          if (gc[j].indexOf(matchGrade) >= 0) { bestGradeCol = j; bestGradeCount = gradeCount; break; }
        }
      }
    }
    gradeCol = bestGradeCol;
    // 从该列提取数据
    if (gradeCol >= 0) {
      for (i = 0; i < rows.length; i++) {
        var dc = rows[i].match(/<t[dh][^>]*>([^<]*)<\/t[dh]>/gi) || [];
        if (dc.length <= gradeCol) continue;
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

// 分类固定参数模板
var CAT_PARAMS = {
  geometry: ['适用公路等级','设计速度(km/h)','车道宽度(m)','车道数','路肩宽度(m)','路基宽度(m)','平曲线最小半径一般值(m)','平曲线最小半径极限值(m)','停车视距(m)','最大纵坡(%)','最大超高(%)','最大合成坡度(%)','缓和曲线最小长度(m)','建筑限界净高(m)'],
  pavement: ['适用公路等级','设计速度(km/h)','路基压实度(上路床)','填料CBR(%)','路面设计年限','面层最小厚度(cm)','基层厚度(mm)','水泥弯拉强度(MPa)','路拱坡度(%)','最大纵坡(%)','汽车荷载'],
  bridge: ['适用公路等级','汽车荷载','设计洪水频率','桥梁设计使用年限','设计速度(km/h)','建筑限界净高(m)','车道宽度(m)','裂缝宽度限值','挠度限值','支座类型','抗震设防等级'],
  drainage: ['适用公路等级','设计洪水频率','径流系数','边沟尺寸','最小纵坡','截水沟距离','设计降雨重现期'],
  safety: ['适用公路等级','设计速度(km/h)','护栏防撞等级','标志汉字高度(cm)','标线宽度(cm)','轮廓标间距(m)','防眩设施高度(m)','避险车道要求'],
  rural: ['适用公路等级','设计速度(km/h)','车道宽度(m)','路基宽度(m)','AADT','错车道宽度(m)','路面设计年限','面层最小厚度(cm)','最大纵坡(%)'],
  materials: ['材料牌号/等级','屈服强度(MPa)','抗拉强度(MPa)','适用直径(mm)','涂层厚度','伸长率(%)','应用场景'],
  seismic: ['抗震设防烈度','地震动峰值加速度(g)','特征周期Tg(s)','场地类别','弹性/延性验算','E1/E2地震水准'],
  general: ['适用公路等级','设计速度(km/h)','车道宽度(m)','车道数','路基宽度(m)','路面设计年限','汽车荷载','设计洪水频率','建筑限界净高(m)'],
  drawings: ['图集编号','收录内容','配合规范','图样类型','适用范围'],
};

// 根据spec内容直接提取分类相关参数值
function extractCatParams(spec, catParams, grade) {
  var p = {}, c = spec.content||'';
  if (!c) return p;
  // 从content中提取li标签中的参数
  var lis = c.match(/<li>[\s\S]*?<\/li>/gi) || [];
  // 也从表格中提取
  var tbls = c.match(/<td[^>]*>[\s\S]*?<\/td>/gi) || [];
  var allText = lis.concat(tbls).map(function(x){return x.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()}).join(' ');

  catParams.forEach(function(key){
    // 根据不同key搜索不同模式
    var patterns = {
      '适用公路等级':/(高速[公路]?|一级[公路]?|二级[公路]?|三级[公路]?|四级[公路]?)/g,
      '设计速度(km/h)':/(\d{2,3})\s*km\/h/,
      '车道宽度(m)':/(\d+\.?\d*)\s*m[（(]?车道/,
      '路基宽度(m)':/路基宽度[^0-9]*(\d+\.?\d*)/,
      '路基压实度(上路床)':/压实度[≥]*\s*(\d+)/,
      '填料CBR(%)':/CBR[≥]*\s*(\d+)/,
      '路面设计年限':/(\d+)\s*年[^限]*[设计使用]/,
      '最大纵坡(%)':/最大纵坡[^0-9]*(\d+)/,
      '汽车荷载':/(公路[-—]?[ⅠIⅡ]级)/,
      '设计洪水频率':/(1\/\d+)/,
      '建筑限界净高(m)':/净高[^0-9]*(\d+\.?\d*)/,
      '护栏防撞等级':/([ABCSSabcss]+级)/,
      'AADT':/(\d+)\s*[辆小]/,
      '设计使用年限':/(\d+)\s*年[^，。]*设计使用/,
    };
    var re=patterns[key];
    if(re){
      var m=allText.match(re);
      if(m){p[key]=Array.isArray(m)?[...new Set(m)].join('/'):m[1]||m[0]}
    }
  });
  // 也调用原有的extractKeyParams补一些通用参数
  var legacy = extractKeyParams(spec, grade);
  catParams.forEach(function(k){if(!p[k]&&legacy[k])p[k]=legacy[k]});
  return p;
}

function renderCompareTable(specs, gradesArr) {
  if (!specs || specs.length === 0) return '';
  // 确定主导分类（多部规范中占比最多的分类）
  var catCount={};specs.forEach(function(s){catCount[s.cat]=(catCount[s.cat]||0)+1});
  var domCat=Object.keys(catCount).sort(function(a,b){return catCount[b]-catCount[a]})[0]||'general';
  var catLabel=CAT_NAMES[domCat]||'通用';
  var catParams=CAT_PARAMS[domCat]||CAT_PARAMS['general'];

  // 提取参数
  var specParams=specs.map(function(s,i){return extractCatParams(s,catParams,gradesArr?gradesArr[i]:null)});

  // 过滤出至少有一个值的参数
  var displayKeys=catParams.filter(function(k){return specParams.some(function(p){return p[k]})});
  if(displayKeys.length===0)displayKeys=catParams.slice(0,8);

  // 渲染
  var catIconMap={general:'📐',geometry:'📏',pavement:'🛣',bridge:'🌉',drainage:'💧',safety:'🛡',rural:'🏘',materials:'🔩',seismic:'🏔',drawings:'📚'};
  var info=specs.map(function(s){return '<b>'+s.code+'</b> '+s.title}).join(' | ');
  var html='<div style="background:#eef2ff;padding:10px 16px;border-radius:8px;margin-bottom:12px;font-size:12px;color:var(--accent);">'+(catIconMap[domCat]||'📋')+' <b>'+catLabel+'</b> 对比 | 参数项固定 | '+info+'</div>';

  html+='<div class="compare-table-wrap"><table class="compare-table"><thead><tr><th>参数项</th>';
  specs.forEach(function(s){html+='<th>'+s.code.substring(0,20)+'</th>'});
  html+='</tr></thead><tbody>';
  displayKeys.forEach(function(key){
    html+='<tr><td style="font-weight:600">'+key+'</td>';
    var vals=specParams.map(function(p){return p[key]||'—'});
    var diff=vals.length>1&&!vals.every(function(v){return v===vals[0]});
    vals.forEach(function(v){html+='<td'+(diff?' class="diff"':'')+'>'+v+'</td>'});
    html+='</tr>';
  });
  html+='</tbody></table></div>';
  return html;
}
