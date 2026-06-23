/* ============================================================
   智能问答模块 — 基于 89 部规范知识库
   ============================================================ */
(function () {
  // 面包屑
  document.getElementById('breadcrumb').innerHTML = renderBreadcrumb([
    { label: '🏠 首页', link: '../' },
    { label: '🤖 智能问答' }
  ]);
  document.getElementById('statsPills').innerHTML = renderStatsPills();

  var input = document.getElementById('qaInput');
  var btn = document.getElementById('qaBtn');
  var resultsDiv = document.getElementById('qaResults');

  // 点击提示按钮
  document.getElementById('qaHints').addEventListener('click', function (e) {
    if (e.target.classList.contains('qa-hint')) {
      input.value = e.target.textContent;
      doSearch();
    }
  });

  // 搜索按钮
  btn.addEventListener('click', doSearch);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') doSearch();
  });

  // 快捷键
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && document.activeElement !== input && document.activeElement.tagName !== 'INPUT') {
      e.preventDefault(); input.focus();
    }
  });

  function doSearch() {
    var q = input.value.trim();
    if (!q) return;

    // 提取关键词
    var keywords = extractKeywords(q);
    // 搜索相关规范
    var results = searchAllSpecs(keywords, q);
    // 渲染结果
    renderResults(q, results);
  }

  /** 从问题中提取关键词 */
  function extractKeywords(q) {
    // 常见公路术语词典
    var dict = [
      '设计速度', '车道宽度', '路肩宽度', '路基宽度', '路面宽度',
      '平曲线', '最小半径', '圆曲线', '缓和曲线', '停车视距', '会车视距',
      '最大纵坡', '最小坡长', '最大坡长', '竖曲线', '超高', '加宽',
      '建筑限界', '净高', '净空', '横断面', '中间带', '中央分隔带',
      '压实度', 'CBR', '回弹模量', '边坡', '挡土墙', '防护',
      '路面结构', '面层', '基层', '底基层', '沥青', '水泥混凝土',
      '设计年限', '设计使用年限', '洪水频率', '汽车荷载', '荷载等级',
      '桥梁分类', '特大桥', '大桥', '中桥', '小桥', '涵洞',
      '隧道', '通风', '照明', '消防', '监控',
      '护栏', '标志', '标线', '防眩', '视线诱导',
      '安全评价', '限速', '养护', '改扩建', '施工',
      '四级公路', '三级公路', '二级公路', '一级公路', '高速公路',
      '农村公路', '小交通量', '乡村道路', '城市道路', '快速路',
      '钢筋', '混凝土', '预应力', '钢结构', '组合梁',
      '抗震', '地震', '烈度', '地基', '基础', '桩基础',
      '排水', '边沟', '截水沟', '水文', '冲刷',
      '错车道', '减速丘', 'AADT', '标准轴载',
    ];
    var found = [];
    dict.forEach(function (w) {
      if (q.indexOf(w) >= 0 && found.indexOf(w) < 0) found.push(w);
    });
    // 去重、按长度降序（长词优先）
    found.sort(function (a, b) { return b.length - a.length; });
    if (found.length === 0) {
      // 分词：按2~4字切分
      for (var i = 0; i < q.length - 1; i++) {
        var w2 = q.substring(i, i + 2);
        if (!/[，。？?！!\s]/.test(w2)) found.push(w2);
      }
    }
    return found.slice(0, 8);
  }

  /** 搜索所有规范 */
  function searchAllSpecs(keywords, question) {
    var results = [];
    SPECS.forEach(function (spec) {
      var content = spec.content || '';
      var score = 0;
      var matches = [];

      keywords.forEach(function (kw) {
        var idx = content.indexOf(kw);
        if (idx >= 0) {
          score += kw.length * 3;
          matches.push(kw);
        }
        // 也检查code和title
        if (spec.code.indexOf(kw) >= 0) score += 5;
        if (spec.title.indexOf(kw) >= 0) score += 4;
      });

      if (score > 0) {
        // 提取相关段落
        var excerpts = extractExcerpts(content, keywords);
        results.push({
          spec: spec,
          score: score,
          matches: matches,
          excerpts: excerpts
        });
      }
    });

    // 按相关性排序
    results.sort(function (a, b) { return b.score - a.score; });
    return results.slice(0, 6);
  }

  /** 从内容中提取相关段落 */
  function extractExcerpts(content, keywords) {
    var excerpts = [];
    var parts = content.split(/<h4>|<\/h4>|<table>|<\/table>|<ul>|<\/ul>/);

    parts.forEach(function (part) {
      var score = 0;
      keywords.forEach(function (kw) {
        if (part.indexOf(kw) >= 0) score += 3;
      });
      if (score > 0 && part.length > 20) {
        // 清理HTML标签
        var clean = part.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (clean.length > 15) {
          excerpts.push({ text: clean.substring(0, 300), score: score });
        }
      }
    });

    excerpts.sort(function (a, b) { return b.score - a.score; });
    return excerpts.slice(0, 3);
  }

  /** 渲染结果 */
  function renderResults(question, results) {
    var html = '';

    if (results.length === 0) {
      html = '<div class="qa-empty"><div class="qa-icon">🔍</div><div class="empty-title">未找到相关规范</div><div class="empty-hint">试试换个问法，或使用更具体的关键词</div></div>';
    } else {
      // 最佳答案卡片
      var best = results[0];
      html += '<div class="qa-result">';
      html += '<div class="qa-question">🤖 ' + escapeHtml(question) + '</div>';
      html += '<div class="qa-answer">';

      // 显示最佳匹配段落
      if (best.excerpts.length > 0) {
        var mainExcerpt = best.excerpts[0];
        // 高亮关键词
        var highlighted = escapeHtml(mainExcerpt.text);
        best.matches.forEach(function (kw) {
          highlighted = highlighted.replace(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '<span class="hl">' + kw + '</span>');
        });
        html += '<p>' + highlighted + '</p>';
      }

      // 如果有表格内容，显示为表格
      if (best.excerpts.length > 1 && best.excerpts[1].text.match(/\d/)) {
        html += '<p style="margin-top:8px;">' + escapeHtml(best.excerpts[1].text.substring(0, 200)) + '</p>';
      }

      html += '</div>';
      html += '<div class="qa-source">📚 来源：<a href="../specs/?code=' + encodeURIComponent(best.spec.code) + '">' + best.spec.code + ' ' + best.spec.title + '</a></div>';
      html += '</div>';

      // 其他相关规范
      if (results.length > 1) {
        html += '<div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:10px;">📋 其他相关规范（' + (results.length - 1) + '部）</div>';
        for (var i = 1; i < results.length; i++) {
          var r = results[i];
          html += '<div class="qa-result" style="padding:14px 20px;">';
          html += '<div style="font-size:13px;font-weight:600;margin-bottom:4px;"><a href="../specs/?code=' + encodeURIComponent(r.spec.code) + '">' + r.spec.code + '</a> ' + r.spec.title + '</div>';
          if (r.excerpts.length > 0) {
            html += '<div style="font-size:12px;color:var(--text3);line-height:1.6;">' + escapeHtml(r.excerpts[0].text.substring(0, 150)) + '…</div>';
          }
          html += '</div>';
        }
      }
    }

    resultsDiv.innerHTML = html;
    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // 页脚+回到顶部
  var bt = document.createElement('button');
  bt.className = 'back-top'; bt.id = 'backTop'; bt.textContent = '↑';
  document.body.appendChild(bt);
  window.addEventListener('scroll', function () { bt.classList.toggle('visible', window.scrollY > 700); });
  bt.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  var ft = document.createElement('footer');
  ft.className = 'footer';
  ft.innerHTML = renderFooter().replace(/<footer class="footer">|<\/footer>/g, '');
  document.querySelector('.main').after(ft);
})();
