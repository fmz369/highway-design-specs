/* 智能问答 v2 — 自然语言理解 + 同义词映射 + 结构化答案 */
(function () {
  document.getElementById('breadcrumb').innerHTML = renderBreadcrumb([{ label: '🏠 首页', link: '../' }, { label: '🤖 智能问答' }]);
  document.getElementById('statsPills').innerHTML = renderStatsPills();
  var input = document.getElementById('qaInput'), btn = document.getElementById('qaBtn'), resultsDiv = document.getElementById('qaResults');

  // 同义词映射：用户口语 → 规范参数名
  var SYNONYMS = {
    '坡度':'最大纵坡','纵坡':'最大纵坡','坡':'最大纵坡','多陡':'最大纵坡',
    '半径':'平曲线最小半径','弯道':'平曲线最小半径','转弯半径':'平曲线最小半径','圆曲线':'平曲线最小半径',
    '路面多厚':'面层厚度','面层厚度':'面层厚度','沥青多厚':'面层厚度','水泥路面多厚':'面层厚度',
    '压实':'路基压实度','压实度':'路基压实度','压实标准':'路基压实度',
    '速度':'设计速度','多快':'设计速度','车速':'设计速度','设计时速':'设计速度',
    '视距':'停车视距','多远能停':'停车视距','刹车距离':'停车视距',
    '宽度':'车道宽度','车道多宽':'车道宽度','路面多宽':'路面宽度','路基多宽':'路基宽度',
    '洪水':'设计洪水频率','多少年一遇':'设计洪水频率',
    '荷载':'汽车荷载','多少吨':'汽车荷载','重车':'汽车荷载',
    '标高':'建筑限界净高','净空':'建筑限界净高','限高':'建筑限界净高','净高':'建筑限界净高',
    '几年':'路面设计年限','使用多少年':'设计使用年限','能用多久':'设计使用年限',
    '错车':'错车道宽度','会车':'会车视距',
    '超高':'最大超高','加宽':'圆曲线加宽值',
    '护栏':'护栏防撞等级','防撞':'护栏防撞等级',
    '四级公路':'四级','小交通':'四级','农村公路':'四级','乡村道路':'干路',
    '压实标准':'路基压实度','要压到多少':'路基压实度',
  };

  // 问题模式识别
  var PATTERNS = [
    { re: /(多大|多少|几多|取值|标准|要求|规定|应该是|是多少)/, type: 'value_query', weight: 2 },
    { re: /(最低|最小|minimum)/i, type: 'min_value', weight: 1.5 },
    { re: /(最高|最大|maximum)/i, type: 'max_value', weight: 1.5 },
    { re: /(如何|怎么|怎样|how)/i, type: 'how_to', weight: 1 },
  ];

  document.getElementById('qaHints').addEventListener('click', function (e) { if (e.target.classList.contains('qa-hint')) { input.value = e.target.textContent; doSearch(); } });
  btn.addEventListener('click', doSearch);
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') doSearch(); });
  document.addEventListener('keydown', function (e) { if (e.key === '/' && document.activeElement !== input && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); input.focus(); } });

  // Q&A历史记录
  var QA_HISTORY_KEY = 'qa_history';
  function getQaHistory() { try { return JSON.parse(localStorage.getItem(QA_HISTORY_KEY) || '[]'); } catch(e) { return []; } }
  function addQaHistory(q, best) { var h = getQaHistory(); h = h.filter(function(x) { return x.q !== q; }); h.unshift({ q: q, code: best.spec.code, title: best.spec.title, time: Date.now() }); if (h.length > 15) h = h.slice(0, 15); try { localStorage.setItem(QA_HISTORY_KEY, JSON.stringify(h)); } catch(e) {} }
  function renderHistory() { var h = getQaHistory(); if (h.length === 0) return; var html = '<div style="margin-bottom:16px;"><div class="section-title" style="margin-bottom:10px;">📜 历史问答</div><div style="display:flex;flex-wrap:wrap;gap:6px;">'; h.forEach(function(x) { html += '<a href="../specs/?code=' + encodeURIComponent(x.code) + '" style="font-size:11px;padding:4px 12px;background:var(--accent-light);border-radius:14px;color:var(--accent);text-decoration:none;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + escapeHtml(x.q) + '">' + escapeHtml(x.q.substring(0, 25)) + '</a>'; }); html += '</div></div>'; return html; }

  function doSearch() {
    var q = input.value.trim(); if (!q) return;
    var keywords = extractKeywords(q);
    var results = searchAllSpecs(keywords, q);
    if (results.length > 0) addQaHistory(q, results[0]);
    renderResults(q, results);
  }

  function extractKeywords(q) {
    var found = [];
    // 同义词映射
    Object.keys(SYNONYMS).forEach(function (kw) {
      if (q.indexOf(kw) >= 0) { var mapped = SYNONYMS[kw]; if (found.indexOf(mapped) < 0) found.push(mapped); }
    });
    // 等级关键词
    if (q.indexOf('高速') >= 0) found.push('高速');
    if (q.indexOf('一级公路') >= 0 || q.indexOf('一级') >= 0) found.push('一级');
    if (q.indexOf('二级公路') >= 0 || q.indexOf('二级') >= 0) found.push('二级');
    if (q.indexOf('三级公路') >= 0 || q.indexOf('三级') >= 0) found.push('三级');
    if (q.indexOf('四级') >= 0 || q.indexOf('农村公路') >= 0 || q.indexOf('小交通') >= 0) found.push('四级');
    if (q.indexOf('乡村') >= 0) found.push('干路');
    // 补充全词匹配
    var dict = ['设计速度','车道宽度','路肩宽度','路基宽度','路面宽度','平曲线','圆曲线','停车视距','最大纵坡','压实度','CBR','设计年限','洪水频率','汽车荷载','建筑限界','面层厚度','基层厚度','超高','加宽','缓和曲线','竖曲线','错车道','护栏','标志','标线','桥梁','隧道','排水','挡土墙','边坡'];
    dict.forEach(function (w) { if (q.indexOf(w) >= 0 && found.indexOf(w) < 0) found.push(w); });
    if (found.length === 0) { for (var i = 0; i < q.length - 1; i++) { var w2 = q.substring(i, i + 2); if (!/[，。？?！!\s]/.test(w2) && found.indexOf(w2) < 0) found.push(w2); } }
    return found.slice(0, 10);
  }

  function searchAllSpecs(keywords, question) {
    var results = [];
    // 检测问题类型
    var isValueQuery = PATTERNS.some(function (p) { return p.re.test(question); });

    SPECS.forEach(function (spec) {
      var c = spec.content || '', score = 0, matches = [];
      keywords.forEach(function (kw) {
        var idx = c.indexOf(kw); if (idx >= 0) { score += kw.length * 3; matches.push(kw); }
        if (spec.code.indexOf(kw) >= 0) score += 5;
        if (spec.title.indexOf(kw) >= 0) score += 4;
      });

      // 搜索引擎优化：如果是数值类问题，优先表格内容
      if (isValueQuery && c.indexOf('<td') >= 0) score += 10;

      // 排除废止规范（除非关键词明确包含它）
      if (spec.status === 'replaced' && !question.includes(spec.code)) score -= 50;

      if (score > 0) {
        var excerpts = extractExcerpts(c, keywords, isValueQuery);
        results.push({ spec: spec, score: score, matches: matches, excerpts: excerpts });
      }
    });
    results.sort(function (a, b) { return b.score - a.score; });
    return results.slice(0, 6);
  }

  function extractExcerpts(content, keywords, isValueQuery) {
    var excerpts = [];
    // 优先提取包含表格的行（含具体数值）
    if (isValueQuery) {
      var tableRows = content.match(/<tr>[\s\S]*?<\/tr>/gi) || [];
      tableRows.forEach(function (row) {
        var score = 0; keywords.forEach(function (kw) { if (row.indexOf(kw) >= 0) score += 3; });
        if (score > 0) { var clean = row.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); if (clean.length > 15) excerpts.push({ text: clean.substring(0, 250), score: score + 5 }); }
      });
    }
    // li列表
    var lis = content.match(/<li>[\s\S]*?<\/li>/gi) || [];
    lis.forEach(function (li) {
      var score = 0; keywords.forEach(function (kw) { if (li.indexOf(kw) >= 0) score += 3; });
      if (score > 0) { var clean = li.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); if (clean.length > 15) excerpts.push({ text: clean.substring(0, 250), score: score + 2 }); }
    });
    // 其他段落
    var parts = content.split(/<h4>|<\/h4>/);
    parts.forEach(function (part) {
      var score = 0; keywords.forEach(function (kw) { if (part.indexOf(kw) >= 0) score += 1; });
      if (score > 0 && part.length > 20) { var clean = part.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); if (clean.length > 15) excerpts.push({ text: clean.substring(0, 250), score: score }); }
    });
    excerpts.sort(function (a, b) { return b.score - a.score; });
    return excerpts.slice(0, 4);
  }

  function renderResults(question, results) {
    var html = '';
    if (results.length === 0) {
      html = '<div class="qa-empty"><div class="qa-icon">🔍</div><div class="empty-title">未找到相关规范</div><div class="empty-hint">试试换个问法，如"四级公路压实度多少"或"平曲线最小半径"</div></div>';
    } else {
      var best = results[0];
      html += '<div class="qa-result"><div class="qa-question">🤖 关于"' + escapeHtml(question) + '"</div><div class="qa-answer">';
      if (best.excerpts.length > 0) {
        var mainExcerpt = best.excerpts[0].text;
        // 提取关键数值对
        var valuePairs = mainExcerpt.match(/([一-龥]+(?:宽度|速度|半径|坡度|视距|年限|厚度|强度|等级|频率|荷载|超高|加宽|压实度|CBR|净高)[^\d]*)([\d.]+[~\-/]?[\d.]*\s*[mMkPp年%％]*)/g);
        if (!valuePairs || valuePairs.length === 0) {
          valuePairs = mainExcerpt.match(/[一-龥]{2,8}[：:]*\s*([\d.]+[~\-/]?[\d.]*\s*[mMkPp年%％≥≤]*)/g);
        }
        var highlighted = escapeHtml(mainExcerpt);
        best.matches.forEach(function (kw) { highlighted = highlighted.replace(new RegExp(kw.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&'), 'g'), '<span class="hl">' + kw + '</span>'); });
        html += '<p style="font-size:14px;margin-bottom:8px;">' + highlighted.substring(0, 300) + '</p>';
        // 精确参数卡片
        if (valuePairs && valuePairs.length > 0) {
          html += '<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px 14px;margin-top:8px;"><div style="font-size:11px;color:#166534;margin-bottom:4px;">📌 精确参数</div>';
          var shown = 0;
          valuePairs.forEach(function (vp) {
            if (shown >= 4) return;
            var clean = vp.replace(/<[^>]+>/g, '').trim();
            if (clean.length > 5 && clean.length < 60) { html += '<span style="display:inline-block;background:#fff;border:1px solid #bbf7d0;border-radius:6px;padding:4px 10px;margin:3px;font-size:13px;font-weight:600;color:#166534;">' + escapeHtml(clean) + '</span>'; shown++; }
          });
          html += '</div>';
        }
        // 补充段落
        for (var ei = 1; ei < Math.min(best.excerpts.length, 3); ei++) {
          if (best.excerpts[ei].text.match(/\d/)) {
            html += '<p style="font-size:12px;color:var(--text2);margin-top:6px;">' + escapeHtml(best.excerpts[ei].text.substring(0, 180)) + '</p>';
          }
        }
      }
      html += '</div><div class="qa-source">📚 <a href="../specs/?code=' + encodeURIComponent(best.spec.code) + '" style="font-weight:600;">' + best.spec.code + ' ' + best.spec.title + '</a> — 点击查看完整规范</div></div>';
      if (results.length > 1) {
        html += '<div style="font-size:13px;font-weight:600;color:var(--text);margin:16px 0 8px;">📋 其他相关规范</div>';
        for (var i = 1; i < results.length; i++) {
          var r = results[i];
          html += '<div class="qa-result" style="padding:12px 18px;"><div style="font-size:13px;font-weight:600;margin-bottom:4px;"><a href="../specs/?code=' + encodeURIComponent(r.spec.code) + '">' + r.spec.code + '</a> ' + r.spec.title + '</div>';
          if (r.excerpts.length > 0) html += '<div style="font-size:12px;color:var(--text3);">' + escapeHtml(r.excerpts[0].text.substring(0, 120)) + '…</div>';
          html += '</div>';
        }
      }
    }
    resultsDiv.innerHTML = html; resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function escapeHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // 初始化显示历史
  var initHistory = renderHistory();
  if (initHistory) { document.getElementById('qaResults').innerHTML = initHistory; }

  var bt = document.createElement('button'); bt.className = 'back-top'; bt.id = 'backTop'; bt.textContent = '↑'; document.body.appendChild(bt);
  window.addEventListener('scroll', function () { bt.classList.toggle('visible', window.scrollY > 700); });
  bt.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  var ft = document.createElement('footer'); ft.className = 'footer'; ft.innerHTML = renderFooter().replace(/<footer class="footer">|<\/footer>/g, ''); document.querySelector('.main').after(ft);
})();
