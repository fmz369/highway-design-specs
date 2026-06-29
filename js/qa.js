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
  function addQaHistory(q) { var h = getQaHistory(); h = h.filter(function(x) { return x.q !== q; }); h.unshift({ q: q, time: Date.now() }); if (h.length > 15) h = h.slice(0, 15); try { localStorage.setItem(QA_HISTORY_KEY, JSON.stringify(h)); } catch(e) {} }
  function renderHistory() { var h = getQaHistory(); if (h.length === 0) return ''; var html = '<div style="margin-bottom:16px;"><div class="section-title" style="margin-bottom:10px;">📜 历史问答</div><div style="display:flex;flex-wrap:wrap;gap:6px;">'; h.forEach(function(x) { html += '<button onclick="document.getElementById(\'qaInput\').value=\'' + x.q.replace(/'/g,"\\'") + '\';doSearch();" style="font-size:11px;padding:4px 12px;background:var(--accent-light);border-radius:14px;color:var(--accent);border:none;cursor:pointer;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left;" title="点击重新搜索：' + escapeHtml(x.q) + '">' + escapeHtml(x.q.substring(0, 25)) + '</button>'; }); html += '</div></div>'; return html; }

  function doSearch() {
    var q = input.value.trim(); if (!q) return;
    // 检测问题类型
    var isCompare = /(区别|对比|不同|差异|vs\.?|哪个更|哪一个|还是)/i.test(q);
    var isWhy = /(为什么|为何|原因|怎么|如何|why)/i.test(q);
    var isWhich = /(哪个|哪一种|多少|多大|几)/.test(q);

    if (isCompare) {
      // 对比模式：拆分关键词分别搜索
      var parts = q.split(/[和与跟、]|vs|VS|对比|比较/);
      var allResults = [];
      parts.forEach(function(part) {
        var kw = extractKeywords(part);
        if (kw.length > 0) {
          var r = searchAllSpecs(kw, part);
          allResults = allResults.concat(r);
        }
      });
      // 去重按分数排序
      var seen = {};
      allResults = allResults.filter(function(r) { var k = r.spec.code; if (seen[k]) return false; seen[k] = true; return r.score > 0; });
      allResults.sort(function(a,b){return b.score-a.score;});
      renderResults(q, allResults.slice(0, 4), isCompare);
    } else {
      var keywords = extractKeywords(q);
      var results = searchAllSpecs(keywords, q);
      // 如果是"为什么"类问题，优先展示说明性内容
      if (isWhy) {
        results.forEach(function(r) {
          // 提升含note-box内容的权重
          if (r.spec.content.indexOf('note-box') >= 0) r.score += 8;
          if (r.spec.content.indexOf('条文说明') >= 0) r.score += 5;
        });
        results.sort(function(a,b){return b.score-a.score;});
      }
      // 如果是具体数值问题，优先表格
      if (isWhich) {
        results.forEach(function(r) {
          var tdCount = (r.spec.content.match(/<td/g) || []).length;
          if (tdCount > 10) r.score += Math.min(tdCount / 2, 15);
        });
        results.sort(function(a,b){return b.score-a.score;});
      }
      if (results.length > 0) addQaHistory(q);
      renderResults(q, results);
    }
  }
  window.doSearch = doSearch; // 暴露全局，供历史/追问按钮onclick调用

  function extractKeywords(q) {
    var found = [];
    // 同义词映射（长词优先）
    var synKeys = Object.keys(SYNONYMS).sort(function(a,b){return b.length-a.length;});
    synKeys.forEach(function (kw) {
      if (q.indexOf(kw) >= 0) { var mapped = SYNONYMS[kw]; if (found.indexOf(mapped) < 0) found.push(mapped); }
    });
    // 等级关键词
    if (q.indexOf('高速') >= 0) found.push('高速');
    if (q.indexOf('一级公路') >= 0) found.push('一级公路');
    else if (q.indexOf('一级') >= 0 && q.indexOf('一级公路')<0) found.push('一级');
    if (q.indexOf('二级公路') >= 0) found.push('二级公路');
    else if (q.indexOf('二级') >= 0 && q.indexOf('二级公路')<0) found.push('二级');
    if (q.indexOf('四级公路') >= 0 || q.indexOf('小交通') >= 0) found.push('四级公路');
    else if (q.indexOf('四级') >= 0) found.push('四级');
    if (q.indexOf('三级公路') >= 0) found.push('三级公路');
    else if (q.indexOf('三级') >= 0 && q.indexOf('三级公路')<0) found.push('三级');
    if (q.indexOf('乡村') >= 0) found.push('干路');
    // 补充全词匹配（去重+长词优先）
    var dict = ['路基压实度','压实度','设计速度','车道宽度','路肩宽度','路基宽度','路面宽度','平曲线最小半径','圆曲线最小半径','停车视距','最大纵坡','CBR','设计年限','洪水频率','汽车荷载','建筑限界净高','面层厚度','基层厚度','最大超高','圆曲线加宽','缓和曲线','竖曲线','错车道','护栏防撞等级','标志汉字高度','标线宽度'];
    var uniq = {}; dict.forEach(function(w){if(!uniq[w])uniq[w]=true;});
    Object.keys(uniq).sort(function(a,b){return b.length-a.length;}).forEach(function(w){
      if(q.indexOf(w) >= 0 && found.indexOf(w) < 0) found.push(w);
    });
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
        var idx = c.indexOf(kw); if (idx >= 0) { score += kw.length * 4; matches.push(kw); /* 表格中的精确匹配额外加分 */ if (c.substring(Math.max(0,idx-50),idx+50).indexOf('<td')>=0) score += 8; }
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
    // 硬过滤：问题中的核心术语不匹配则大幅降分
    var mustHaves = [];
    keywords.forEach(function(kw) { if (kw.length >= 3) mustHaves.push(kw); });
    results.forEach(function(r) {
      var missCount = 0;
      mustHaves.forEach(function(mh) { if (r.spec.content.indexOf(mh) < 0) missCount++; });
      if (missCount > 0 && missCount === mustHaves.length) r.score -= 100; // 全部核心词都不匹配→排除
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

  function renderResults(question, results, isCompare) {
  // 对比模式特殊渲染
  if (isCompare && results.length >= 1) {
    var compHTML = '<div class="qa-result"><div class="qa-question">🤖 对比："' + escapeHtml(question) + '"</div><div class="qa-answer">';
    compHTML += '<div style="font-size:13px;color:var(--text);margin-bottom:10px;">📊 以下规范涉及相关内容，请参考对比：</div>';
    compHTML += '<table style="width:100%;font-size:12px;border-collapse:collapse;"><tr style="background:#f8f9fc;"><th style="padding:6px 10px;text-align:left;border:1px solid var(--border);">规范</th><th style="padding:6px 10px;text-align:left;border:1px solid var(--border);">关键内容</th></tr>';
    results.forEach(function(r) {
      var txt = r.excerpts.length > 0 ? r.excerpts[0].text.substring(0, 100) : '详见规范原文';
      compHTML += '<tr><td style="padding:6px 10px;border:1px solid var(--border);"><a href="../specs/?code=' + encodeURIComponent(r.spec.code) + '" style="font-weight:600;">' + r.spec.code + '</a></td><td style="padding:6px 10px;border:1px solid var(--border);">' + escapeHtml(txt) + '…</td></tr>';
    });
    compHTML += '</table></div><div class="qa-source">📚 点击规范编号查看完整内容</div></div>';
    resultsDiv.innerHTML = compHTML;
    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  // 条款对照数据：从所有相关规范中提取匹配的li条文
  var clauseRefs = [];
  results.forEach(function(r) {
    var c = r.spec.content;
    // 提取含关键词的li条文
    var lis = c.match(/<li>(?!.*href)([\s\S]*?)<\/li>/gi) || [];
    lis.forEach(function(li) {
      var clean = li.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (clean.length > 15 && clean.length < 200) {
        var score = 0;
        r.matches.forEach(function(kw) { if (clean.indexOf(kw) >= 0) score += 2; });
        if (score >= 4) {
          clauseRefs.push({ spec: r.spec, text: clean, score: score });
        }
      }
    });
    // 也提取span.hl标注的关键参数
    var hls = c.match(/<span class="hl">([^<]+)<\/span>[：:]?\s*([^<]{5,80})/gi) || [];
    hls.forEach(function(hl) {
      var clean = hl.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (clean.length > 10) {
        var score = 0;
        r.matches.forEach(function(kw) { if (clean.indexOf(kw) >= 0) score += 2; });
        if (score >= 2) clauseRefs.push({ spec: r.spec, text: clean, score: score });
      }
    });
  });
  // 去重+排序
  var seen = {};
  clauseRefs = clauseRefs.filter(function(x) {
    var k = x.spec.code + x.text.substring(0, 30);
    if (seen[k]) return false; seen[k] = true; return true;
  }).sort(function(a,b) { return b.score - a.score; }).slice(0, 12);

    // 匹配质量辅助函数
    function matchLevel(score) { if (score >= 60) return 'high'; if (score >= 30) return 'medium'; return 'low'; }
    function matchLabel(level) { return level === 'high' ? '高匹配' : (level === 'medium' ? '中匹配' : '低匹配'); }

    // 追问建议生成
    function genFollowup(keywords, bestSpec) {
      var suggestions = [];
      var kwSet = {};
      keywords.forEach(function(k) { kwSet[k] = true; });
      if (bestSpec) {
        if (!kwSet['设计速度'] && bestSpec.content.indexOf('设计速度') >= 0) suggestions.push('设计速度分级');
        if (!kwSet['压实度'] && bestSpec.content.indexOf('压实度') >= 0) suggestions.push('压实度标准');
      }
      if (keywords.length >= 1) {
        var k = keywords[0];
        if (k.indexOf('半径') >= 0) { suggestions.push(k.replace('半径','超高')); suggestions.push(k.replace('最小','一般')); }
        else if (k.indexOf('坡度') >= 0 || k.indexOf('纵坡') >= 0) { suggestions.push('坡长限制'); suggestions.push('合成坡度'); }
        else if (k.indexOf('压实') >= 0) { suggestions.push('CBR要求'); suggestions.push('填料要求'); }
        else if (k.indexOf('宽度') >= 0) { suggestions.push('路肩宽度'); suggestions.push('建筑限界'); }
        else if (k.indexOf('视距') >= 0) { suggestions.push('会车视距'); suggestions.push('超车视距'); }
      }
      return suggestions.slice(0, 4);
    }

    var html = '';
    if (results.length === 0) {
      html = '<div class="qa-empty"><div class="qa-icon">🔍</div><div class="empty-title">未找到相关规范</div><div class="empty-hint">试试换个问法，如"四级公路压实度多少"或"平曲线最小半径"</div></div>';
    } else {
      var best = results[0];
      var level = matchLevel(best.score);
      html += '<div class="qa-result"><div class="qa-question">🤖 ' + escapeHtml(question) + '<span class="qa-match-badge ' + level + '" title="匹配度">' + matchLabel(level) + '</span></div><div class="qa-answer">';
      if (best.excerpts.length > 0) {
        var mainExcerpt = best.excerpts[0].text;
        // 提取关键数值对（按参数类型匹配正确单位）
        var unitMap = { '压实度':'[≥≤]*\\s*\\d+\\s*%', '宽度':'[\\d.]+[~\\-]?[\\d.]*\\s*m', '速度':'[\\d.]+[~\\/]?[\\d.]*\\s*km', '半径':'[\\d.]+\\s*m', '坡度':'[\\d.]+\\s*%', '视距':'[\\d.]+\\s*m', '厚度':'[\\d.]+[~\\-]?[\\d.]*\\s*cm', '强度':'[\\d.]+\\s*MPa', '频率':'1\\/\\d+', 'CBR':'[≥]*\\s*\\d+\\s*%', '净高':'[\\d.]+\\s*m', '年限':'[\\d.]+[~\\-]?[\\d.]*\\s*年' };
        var allPairs = [];
        Object.keys(unitMap).forEach(function (key) {
          if (mainExcerpt.indexOf(key) >= 0) {
            var re = new RegExp('(' + key + '[^<]{0,15}?)(' + unitMap[key] + ')', 'g');
            var m; while ((m = re.exec(mainExcerpt)) !== null) { allPairs.push(m[0]); }
          }
        });
        // 如果没找到，回退到宽松匹配
        if (allPairs.length === 0) {
          var vp = mainExcerpt.match(/[一-龥]{2,8}[：:]*\s*([\d.≥≤]+[~\-/]?[\d.]*\s*[mMkPp年%％]*)/g);
          if (vp) allPairs = vp;
        }
        // 去重+过滤无效值
        var seen = {}; var valuePairs = [];
        allPairs.forEach(function (p) {
          var clean = p.replace(/<[^>]+>/g, '').replace(/^\s+/, '').trim();
          if (clean.length > 5 && clean.length < 60 && !seen[clean] && !clean.match(/^\d+$/)) { seen[clean] = true; valuePairs.push(clean); }
        });
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
    // 插入条款对照区
  if (clauseRefs.length > 0) {
    html += '<div style="margin-top:20px;"><div class="section-title" style="margin-bottom:12px;">📋 相关条文对照（' + clauseRefs.length + '条）</div>';
    var lastSpec = '';
    clauseRefs.forEach(function(cr) {
      if (cr.spec.code !== lastSpec) {
        if (lastSpec) html += '</div>';
        html += '<div style="margin-bottom:10px;"><div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:6px;"><a href="../specs/?code=' + encodeURIComponent(cr.spec.code) + '">' + cr.spec.code + '</a> ' + cr.spec.title + '</div>';
        lastSpec = cr.spec.code;
      }
      html += '<div style="font-size:12px;color:var(--text2);padding:4px 0 4px 16px;border-left:2px solid var(--border);margin-bottom:3px;line-height:1.6;">' + escapeHtml(cr.text) + '</div>';
    });
    html += '</div></div>';
  }

  // 追问建议（仅在有搜索结果时生成）
  if (results.length > 0 && keywords.length > 0) {
    var followups = genFollowup(keywords, results[0].spec);
    if (followups.length > 0) {
      html += '<div class="qa-followup"><div class="qa-followup-label">💡 你可能还想问</div><div style="display:flex;flex-wrap:wrap;gap:6px;">';
      followups.forEach(function(f) {
        html += '<button class="qa-hint" onclick="document.getElementById(\'qaInput\').value=\'' + f.replace(/'/g,"\\'") + '\';doSearch();" style="font-size:11px;padding:4px 12px;">' + f + '</button>';
      });
      html += '</div></div>';
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
