/* ============================================================
   页面渲染引擎 — 驱动分类列表页和规范详情页
   ============================================================ */
(function() {
  var path = window.location.pathname;
  var isCategory = path.indexOf('/category/') >= 0;
  var isSpec = path.indexOf('/specs/') >= 0;

  // ===== 分类列表页渲染 =====
  if (isCategory) {
    var cat = getParam('cat') || 'all';
    var query = getParam('q') || '';

    // 加载搜索结果
    if (query) {
      document.getElementById('searchInput').value = query;
      document.getElementById('clearSearch').classList.add('visible');
    }

    // 页面标题
    document.getElementById('pageTitle').textContent = CAT_NAMES[cat] + ' — 公路道路设计规范';
    document.getElementById('pageSubtitle').textContent = getCategoryCounts()[cat] + ' 部规范';

    // 面包屑
    document.getElementById('breadcrumb').innerHTML = renderBreadcrumb([
      { label: '🏠 首页', link: '../' },
      { label: CAT_NAMES[cat] }
    ]);

    // 分类标签栏
    var cats = ['all', 'general', 'geometry', 'pavement', 'bridge', 'drainage', 'safety', 'rural', 'materials', 'seismic'];
    var counts = getCategoryCounts();
    var tabsHTML = '';
    cats.forEach(function(c) {
      var active = c === cat ? ' active' : '';
      tabsHTML += '<button class="tab' + active + '" data-cat="' + c + '">'
        + (c === 'all' ? '📋 全部' : CAT_ICONS[c] + ' ' + CAT_NAMES[c])
        + '<span class="tab-count">' + counts[c] + '</span></button>';
    });
    document.getElementById('tabsContainer').innerHTML = tabsHTML;

    // 统计
    document.getElementById('statsPills').innerHTML = renderStatsPills();

    // 渲染卡片
    function doRender() {
      var specs = searchInCat(cat, document.getElementById('searchInput').value);
      var html = '';
      specs.forEach(function(s) { html += renderCard(s, true); });
      document.getElementById('gridContainer').innerHTML = html;
      document.getElementById('emptyState').style.display = specs.length === 0 ? 'block' : 'none';
    }
    doRender();

    // 标签切换
    document.getElementById('tabsContainer').addEventListener('click', function(e) {
      var tab = e.target.closest('.tab');
      if (!tab) return;
      var newCat = tab.dataset.cat;
      var q = document.getElementById('searchInput').value.trim();
      var url = '?cat=' + newCat;
      if (q) url += '&q=' + encodeURIComponent(q);
      window.location.href = url;
    });

    // 搜索
    var si = document.getElementById('searchInput');
    var clearBtn = document.getElementById('clearSearch');
    var searchBar = si.parentNode;
    // 创建联想下拉
    var sugDiv = document.createElement('div');
    sugDiv.className = 'search-suggestions';
    searchBar.appendChild(sugDiv);

    si.addEventListener('input', function() {
      clearBtn.classList.toggle('visible', si.value.length > 0);
      var q = si.value.trim();
      if (q) {
        var results = searchSpecs(q).slice(0, 6);
        if (results.length > 0) {
          var sugHTML = '';
          results.forEach(function(s) {
            sugHTML += '<div class="sug-item" data-code="' + s.code + '">'
              + '<span class="sug-code">' + s.code + '</span>'
              + '<span class="sug-title">' + s.title + '</span>'
              + '<span class="sug-cat">' + (CAT_NAMES[s.cat]||'') + '</span></div>';
          });
          sugDiv.innerHTML = sugHTML;
          sugDiv.classList.add('active');
        } else { sugDiv.classList.remove('active'); }
      } else { sugDiv.classList.remove('active'); }
      doRender();
    });
    sugDiv.addEventListener('mousedown', function(e) {
      var item = e.target.closest('.sug-item');
      if (item) {
        window.location.href = '../specs/?code=' + encodeURIComponent(item.dataset.code);
      }
    });
    document.addEventListener('click', function(e) {
      if (!searchBar.contains(e.target)) sugDiv.classList.remove('active');
    });
    clearBtn.addEventListener('click', function() {
      si.value = ''; clearBtn.classList.remove('visible'); sugDiv.classList.remove('active'); doRender(); si.focus();
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === '/' && document.activeElement !== si && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault(); si.focus(); si.select();
      }
    });
  }

  // ===== 规范详情页渲染 =====
  if (isSpec) {
    try {
    var code = getParam('code');
    if (!code) { showError('URL缺少code参数'); return; }

    var spec = getSpecByCode(code);
    if (!spec) { showError('未找到规范：' + code + '<br><small>SPECS共' + SPECS.length + '部，请检查编号是否正确</small>'); return; }

    // 记录浏览历史
    addHistory(spec.code);

    // 页面标题
    document.title = spec.code + ' ' + spec.title + ' — 公路道路设计规范';
    document.getElementById('headerTitle').textContent = spec.code;
    document.getElementById('headerSubtitle').textContent = spec.title;

    // 面包屑
    document.getElementById('breadcrumb').innerHTML = renderBreadcrumb([
      { label: '🏠 首页', link: '../' },
      { label: CAT_NAMES[spec.cat], link: '../category/?cat=' + spec.cat },
      { label: spec.code }
    ]);

    // 统计
    document.getElementById('statsPills').innerHTML = renderStatsPills();

    // 构建内容HTML用于TOC提取
    var contentHTML = spec.content || '<p>暂无详细内容</p>';

    // 提取h4标题生成TOC
    var tocItems = [];
    var tmpDiv = document.createElement('div');
    tmpDiv.innerHTML = contentHTML;
    var h4s = tmpDiv.querySelectorAll('h4');
    h4s.forEach(function(h4, i) {
      var id = 'sec-' + i;
      h4.setAttribute('id', id);
      // 去掉所有emoji，只保留文字
      var cleanTitle = h4.textContent.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27FF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FEFF}\u{200D}\u{20D0}-\u{20FF}]/gu, '').replace(/^\s+/,'').trim();
      h4.textContent = cleanTitle;
      tocItems.push({ id: id, text: cleanTitle, level: /第[一二三四五六七八九十\d]+章/.test(cleanTitle) ? 1 : 2 });
    });
    contentHTML = tmpDiv.innerHTML;

    // 渲染详情布局
    var isFav = isFavorite(spec.code);
    var sc = spec.status === 'current' ? 'status-current' : 'status-replaced';
    var st = spec.status === 'current' ? '现行' : '已替代';
    var tags = spec.tags.map(function(t) {
      return '<span class="card-tag tag-' + spec.cat + '">' + t + '</span>';
    }).join('');

    var html = renderToolbar(spec);
    html += '<div class="spec-meta">';
    html += '<div class="spec-code">' + spec.code + '</div>';
    html += '<h2>' + spec.title + '</h2>';
    html += '<div class="spec-info">';
    html += '<span class="status-badge ' + sc + '">' + st + '</span>';
    html += tags;
    
    html += '</div></div>';

    // TOC切换按钮
    if (tocItems.length > 3) {
      html += '<button class="spec-toc-toggle" id="tocToggle">📑 目录</button>';
    }

    html += '<div class="spec-detail-wrapper">';
    if (tocItems.length > 3) {
      html += '<nav class="spec-toc" id="specToc">';
      html += '<div class="spec-toc-header">📑 目录<button id="tocCollapse" title="折叠">−</button></div>';
      html += '<div class="spec-toc-list">';
      tocItems.forEach(function(item) {
        var cls = item.level === 2 ? ' class="l2"' : '';
        html += '<a href="#' + item.id + '" data-toc="' + item.id + '"' + cls + '>' + item.text + '</a>';
      });
      html += '</div></nav>';
    }
    html += '<div class="spec-detail-main">';
    html += '<div class="spec-content">' + contentHTML + '</div>';
    html += '</div></div>';

    document.getElementById('specDetail').innerHTML = html;

    // TOC交互
    if (tocItems.length > 3) {
      var tocToggle = document.getElementById('tocToggle');
      var specToc = document.getElementById('specToc');
      var tocCollapse = document.getElementById('tocCollapse');

      // 移动端切换
      if (tocToggle && specToc) {
        tocToggle.addEventListener('click', function() {
          specToc.classList.toggle('visible');
        });
      }

      // 桌面端折叠
      if (tocCollapse && specToc) {
        tocCollapse.addEventListener('click', function(e) {
          e.stopPropagation();
          specToc.classList.toggle('collapsed');
          tocCollapse.textContent = specToc.classList.contains('collapsed') ? '+' : '−';
        });
      }

      // TOC点击平滑滚动（立即高亮点击项）
      var tocLinks = specToc.querySelectorAll('a');
      var ignoreScroll = false;
      specToc.addEventListener('click', function(e) {
        var a = e.target.closest('a');
        if (!a) return;
        e.preventDefault();
        var targetId = a.getAttribute('data-toc');
        var el = document.getElementById(targetId);
        if (!el) return;
        // 立即高亮
        tocLinks.forEach(function(l) { l.classList.remove('active'); });
        a.classList.add('active');
        // 暂停自动高亮，等滚动结束
        ignoreScroll = true;
        var offset = 160;
        var top = el.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: top, behavior: 'smooth' });
        history.replaceState(null, '', '#' + targetId);
        // 滚动结束后恢复自动跟踪
        setTimeout(function() { ignoreScroll = false; }, 800);
      });

      // 滚动高亮（节流优化）
      var ticking = false;
      window.addEventListener('scroll', function() {
        if (ignoreScroll || !ticking) {
          if (!ticking) {
            requestAnimationFrame(function() {
              if (ignoreScroll) { ticking = false; return; }
              var scrollPos = window.scrollY + 180;
              var currentId = null;
              for (var i = 0; i < tocItems.length; i++) {
                var el = document.getElementById(tocItems[i].id);
                if (!el) continue;
                var top = el.getBoundingClientRect().top + window.scrollY;
                if (scrollPos >= top) currentId = tocItems[i].id;
                else break; // h4是按顺序排列的，后面的都更靠下
              }
              if (currentId) {
                tocLinks.forEach(function(l) { l.classList.remove('active'); });
                var al = specToc.querySelector('[data-toc="' + currentId + '"]');
                if (al) {
                  al.classList.add('active');
                  var tt = al.offsetTop - specToc.clientHeight / 2;
                  if (tt > 0) specToc.scrollTop = tt;
                }
              }
              ticking = false;
            });
            ticking = true;
          }
        } else {
          // 暂停期间跳过
          ticking = false;
        }
      });
    }

    // ===== 规范交叉引用：自动将规范编号转为可点击链接 =====
    var contentEl = document.querySelector('.spec-content');
    if (contentEl) {
      // 匹配规范编号的正则：JTG系列、GB系列、CJJ系列、JGJ系列
      var specRefRe = /\b(JTG\/T?\s?[A-Z]?\d{2,4}[.\d]*-?\d{4})\b|\b(GB\/?T?\s?\d{4,6}(?:\.\d+)?-?\d{4})\b|\b(CJJ\s?\d{1,3}-?\d{4})\b|\b(JGJ\s?\d{1,3}-?\d{4})\b/g;
      var walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT, null, false);
      var textNodes = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode);
      textNodes.forEach(function(tn) {
        var text = tn.textContent;
        if (!specRefRe.test(text)) return;
        specRefRe.lastIndex = 0;
        var frag = document.createDocumentFragment();
        var last = 0, m;
        while ((m = specRefRe.exec(text)) !== null) {
          if (m.index > last) frag.appendChild(document.createTextNode(text.substring(last, m.index)));
          var code = m[0].replace(/\s+/g, ' ').trim();
          var a = document.createElement('a');
          a.href = '../specs/?code=' + encodeURIComponent(code);
          a.textContent = code;
          a.style.cssText = 'color:var(--accent);font-weight:600;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px';
          a.title = '查看 ' + code;
          frag.appendChild(a);
          last = specRefRe.lastIndex;
        }
        if (last < text.length) frag.appendChild(document.createTextNode(text.substring(last)));
        tn.parentNode.replaceChild(frag, tn);
      });
    }

    // ===== 条文一键复制 =====
    if (contentEl) {
      var lis = contentEl.querySelectorAll('li');
      lis.forEach(function(li) {
        var btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.textContent = '📋';
        btn.title = '复制';
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var clone = li.cloneNode(true);
          var cb = clone.querySelector('.copy-btn'); if (cb) cb.remove();
          var text = spec.code + '：' + clone.textContent.replace(/\s+/g, ' ').trim();
          if (text.length > 300) text = text.substring(0, 297) + '...';
          copyToClipboard(text);
          showToast('✅ 已复制');
        });
        li.appendChild(btn);
      });
      // 表格也加复制
      var tables = contentEl.querySelectorAll('table');
      tables.forEach(function(tbl) {
        var btn = document.createElement('button');
        btn.className = 'tbl-copy-btn';
        btn.textContent = '📋';
        btn.title = '复制表格';
        var wrap = document.createElement('div');
        wrap.className = 'tbl-wrap';
        wrap.style.cssText = 'position:relative;';
        tbl.parentNode.insertBefore(wrap, tbl);
        wrap.appendChild(tbl);
        wrap.appendChild(btn);
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var rows = tbl.querySelectorAll('tr');
          var text = spec.code + '\n';
          rows.forEach(function(r) {
            var cells = r.querySelectorAll('th,td');
            var rowText = [];
            cells.forEach(function(c) { rowText.push(c.textContent.trim()); });
            text += rowText.join('\t') + '\n';
          });
          copyToClipboard(text);
          showToast('✅ 已复制表格');
        });
      });
    }
    function copyToClipboard(text) {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.cssText = 'position:fixed;left:-9999px';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch(e) {}
      document.body.removeChild(ta);
    }
    function showToast(msg) {
      var t = document.getElementById('copyToast');
      if (t) { t.textContent = msg; clearTimeout(t._tid); }
      else {
        t = document.createElement('div'); t.id = 'copyToast'; t.className = 'copy-toast'; t.textContent = msg;
        document.body.appendChild(t);
      }
      t._tid = setTimeout(function() { t.remove(); }, 1800);
    }

    // ===== 条文标注 =====
    var HL_KEY = 'hl_' + spec.code;
    function getHighlights() { try { return JSON.parse(localStorage.getItem(HL_KEY)||'[]'); } catch(e) { return []; } }
    function saveHighlights(list) { try { localStorage.setItem(HL_KEY, JSON.stringify(list)); } catch(e) {} }
    var hlItems = getHighlights();
    // 恢复已保存的高亮
    if (contentEl) {
      var allLis2 = contentEl.querySelectorAll('li');
      allLis2.forEach(function(li, i) {
        if (hlItems.indexOf(i) >= 0) li.classList.add('highlighted');
      });
    }
    var hlMode = false;
    var btnHL = document.getElementById('btnHighlight');
    if (btnHL && contentEl) {
      btnHL.addEventListener('click', function() {
        hlMode = !hlMode;
        contentEl.classList.toggle('hl-mode', hlMode);
        btnHL.style.background = hlMode ? '#fef3c7' : '';
        btnHL.style.color = hlMode ? '#92400e' : '';
        if (hlMode) {
          // 关闭选择模式
          if (selectMode) { selectMode = false; contentEl.classList.remove('select-mode'); btnSel.textContent = '☑ 选择导出'; btnExp.style.display = 'none'; }
        }
      });
      contentEl.addEventListener('click', function(e) {
        if (!hlMode) return;
        var li = e.target.closest('li');
        if (!li) return;
        var idx = Array.prototype.indexOf.call(contentEl.querySelectorAll('li'), li);
        if (idx < 0) return;
        li.classList.toggle('highlighted');
        if (li.classList.contains('highlighted')) {
          if (hlItems.indexOf(idx) < 0) hlItems.push(idx);
        } else {
          hlItems = hlItems.filter(function(i) { return i !== idx; });
        }
        saveHighlights(hlItems);
      });
    }

    // ===== 条文选择导出 =====
    var selectMode = false;
    var btnSel = document.getElementById('btnSelectExport');
    var btnExp = document.getElementById('btnDoExport');
    var expCount = document.getElementById('exportCount');

    // 给所有li添加复选框
    if (contentEl) {
      var allLis = contentEl.querySelectorAll('li');
      allLis.forEach(function(li) {
        var cb = document.createElement('input');
        cb.type = 'checkbox'; cb.className = 'sel-cb';
        cb.addEventListener('change', updateExportCount);
        li.insertBefore(cb, li.firstChild);
      });
    }

    function updateExportCount() {
      var checked = contentEl.querySelectorAll('.sel-cb:checked');
      var n = checked.length;
      expCount.textContent = n;
      btnExp.style.display = n > 0 ? '' : 'none';
    }

    if (btnSel) {
      btnSel.addEventListener('click', function() {
        selectMode = !selectMode;
        contentEl.classList.toggle('select-mode', selectMode);
        btnSel.textContent = selectMode ? '☑ 取消选择' : '☑ 选择导出';
        if (!selectMode) { btnExp.style.display = 'none'; }
        // 关闭标注模式
        if (selectMode && hlMode) { hlMode = false; contentEl.classList.remove('hl-mode'); btnHL.style.background = ''; btnHL.style.color = ''; }
      });
    }

    if (btnExp) {
      btnExp.addEventListener('click', function() {
        var checked = contentEl.querySelectorAll('.sel-cb:checked');
        if (checked.length === 0) return;
        var clauses = [];
        checked.forEach(function(cb) {
          var li = cb.parentElement;
          var clone = li.cloneNode(true);
          clone.querySelectorAll('.sel-cb,.copy-btn').forEach(function(el){el.remove();});
          clauses.push(clone.textContent.replace(/\s+/g,' ').trim());
        });

        var bodyHTML = '<p style="font-size:12px;color:var(--text3);margin-bottom:12px;">共 <b>'+clauses.length+'</b> 条条文 ｜ '+spec.code+' '+spec.title+'</p>';
        clauses.forEach(function(c,i){
          bodyHTML += '<div class="ep-clause"><span style="color:var(--accent);font-weight:600;font-size:11px;">第'+(i+1)+'条</span><br>'+c+'</div>';
        });

        showExportDialog({
          icon: '📦', title: '导出条文预览',
          body: bodyHTML,
          onDownload: function(){
            var html = buildClausePrintPage(spec, clauses);
            var blob = new Blob([html],{type:'text/html;charset=utf-8'});
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = spec.code+'_条文导出_'+new Date().toISOString().substring(0,10)+'.html';
            a.click();
          },
          onPrint: function(){
            var w = window.open('','_blank');
            w.document.write(buildClausePrintPage(spec, clauses));
            w.document.write('<script>setTimeout(function(){window.print()},400)<\/script>');
            w.document.close();
          }
        });
      });
    }
    function buildClausePrintPage(spec, clauses) {
      var h = '<!DOCTYPE html><html lang=zh-CN><head><meta charset=UTF-8><title>'+spec.code+' 条文导出</title>';
      h += '<style>body{font-family:SimSun,serif;max-width:700px;margin:30px auto;padding:20px;line-height:2;font-size:14px}h1{font-size:18px;border-bottom:2px solid #333;padding-bottom:8px;margin-bottom:16px}.clause{margin:8px 0;padding:6px 12px;border-left:3px solid #3b6df0;background:#f8f9fc}.clause-num{color:#3b6df0;font-weight:700;font-size:12px}@media print{body{margin:0;padding:15px}}</style></head><body>';
      h += '<h1>'+spec.code+' '+spec.title+'</h1><p style="color:#666;font-size:12px">共导出 '+clauses.length+' 条 | '+new Date().toLocaleDateString()+'</p>';
      clauses.forEach(function(c,i){ h += '<div class="clause"><span class="clause-num">第'+(i+1)+'条</span><br>'+c+'</div>'; });
      h += '</body></html>';
      return h;
    }

    // ===== 页内搜索 =====
    var isInput = document.getElementById('inlineSearchInput');
    var isCount = document.getElementById('isCount');
    var isPrev = document.getElementById('isPrev');
    var isNext = document.getElementById('isNext');
    var searchMarks = [];
    var searchIdx = -1;

    function clearSearch() {
      searchMarks.forEach(function(m) { m.remove(); });
      searchMarks = []; searchIdx = -1;
      isCount.textContent = '';
      isPrev.disabled = true; isNext.disabled = true;
    }

    function doInlineSearch(q) {
      clearSearch();
      if (!q || !contentEl) return;
      // 遍历文本节点创建高亮
      var walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT, null, false);
      var textNodes = [];
      while (walker.nextNode()) { textNodes.push(walker.currentNode); }
      var total = 0;
      textNodes.forEach(function(tn) {
        var text = tn.textContent;
        var idx = text.toLowerCase().indexOf(q.toLowerCase());
        if (idx < 0) return;
        var frag = document.createDocumentFragment();
        var last = 0;
        while (idx >= 0) {
          if (idx > last) frag.appendChild(document.createTextNode(text.substring(last, idx)));
          var mark = document.createElement('mark');
          mark.textContent = text.substring(idx, idx + q.length);
          frag.appendChild(mark);
          searchMarks.push(mark);
          total++;
          last = idx + q.length;
          idx = text.substring(last).toLowerCase().indexOf(q.toLowerCase());
          if (idx >= 0) idx += last;
        }
        if (last < text.length) frag.appendChild(document.createTextNode(text.substring(last)));
        tn.parentNode.replaceChild(frag, tn);
      });
      if (total > 0) {
        isCount.textContent = '1/' + total;
        searchIdx = 0;
        searchMarks[0].classList.add('active');
        searchMarks[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        isPrev.disabled = false; isNext.disabled = false;
      } else {
        isCount.textContent = '0';
      }
    }

    function moveSearch(dir) {
      if (searchMarks.length === 0) return;
      searchMarks[searchIdx].classList.remove('active');
      searchIdx = (searchIdx + dir + searchMarks.length) % searchMarks.length;
      searchMarks[searchIdx].classList.add('active');
      searchMarks[searchIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });
      isCount.textContent = (searchIdx + 1) + '/' + searchMarks.length;
    }

    if (isInput) {
      isInput.addEventListener('input', function() { doInlineSearch(this.value.trim()); });
      isInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); moveSearch(e.shiftKey ? -1 : 1); }
      });
      isPrev.addEventListener('click', function() { moveSearch(-1); });
      isNext.addEventListener('click', function() { moveSearch(1); });
    }

    // Ctrl+F 聚焦页内搜索
    document.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        if (isInput && document.querySelector('.spec-detail')) {
          e.preventDefault(); isInput.focus(); isInput.select();
        }
      }
    });

    // ===== 快捷键面板 =====
    document.addEventListener('keydown', function(e) {
      if (e.key === '?' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        showKbPanel();
      }
      if (e.key === 'Escape') {
        var overlay = document.getElementById('kbOverlay');
        if (overlay) overlay.remove();
      }
    });
    function showKbPanel() {
      var old = document.getElementById('kbOverlay'); if (old) { old.remove(); return; }
      var overlay = document.createElement('div'); overlay.id = 'kbOverlay'; overlay.className = 'kb-overlay';
      overlay.innerHTML = '<div class="kb-panel"><h3>⌨️ 快捷键</h3>'
        + '<div class="kb-row"><span class="kb-key">/</span><span class="kb-desc">聚焦全站搜索</span></div>'
        + '<div class="kb-row"><span class="kb-key">Ctrl+F</span><span class="kb-desc">页内搜索（规范详情页）</span></div>'
        + '<div class="kb-row"><span class="kb-key">?</span><span class="kb-desc">显示/隐藏快捷键帮助</span></div>'
        + '<div class="kb-row"><span class="kb-key">Esc</span><span class="kb-desc">关闭弹窗</span></div>'
        + '<div class="kb-row"><span class="kb-key">←</span><span class="kb-desc">返回上一页</span></div>'
        + '<div class="kb-row" style="padding-top:8px;color:var(--text3);font-size:11px;">点击背景或按 Esc 关闭</div></div>';
      overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
      document.body.appendChild(overlay);
    }

    // 收藏按钮交互
    var btnFav = document.getElementById('btnFavorite');
    if (btnFav) {
      btnFav.addEventListener('click', function() {
        var newState = toggleFavorite(spec.code);
        if (newState) {
          btnFav.classList.add('active');
          btnFav.innerHTML = '⭐ 已收藏';
        } else {
          btnFav.classList.remove('active');
          btnFav.innerHTML = '☆ 收藏';
        }
        document.getElementById('statsPills').innerHTML = renderStatsPills();
      });
    }

    addBackTopAndFooter();

    } catch(e) {
      showError('页面渲染出错：' + e.message + '<br><small>' + (e.stack||'').split('\n').slice(0,3).join('<br>') + '</small>');
    }
  }

  // ===== 错误展示 =====
  function showError(msg) {
    document.getElementById('specDetail').innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">出错了</div><div class="empty-hint">' + msg + '</div><a href="../" class="btn-primary">返回首页</a></div>';
  }

  // ===== 通用：回到顶部 + 页脚 =====
  function addBackTopAndFooter() {
    var bt = document.createElement('button');
    bt.className = 'back-top'; bt.id = 'backTop'; bt.textContent = '↑'; bt.title = '回到顶部';
    document.body.appendChild(bt);
    window.addEventListener('scroll', function() {
      bt.classList.toggle('visible', window.scrollY > 700);
    });
    bt.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    var ft = document.createElement('footer');
    ft.className = 'footer';
    ft.innerHTML = renderFooter().replace(/<footer class="footer">|<\/footer>/g, '');
    document.querySelector('.main').after(ft);
  }

  if (!isSpec) {
    addBackTopAndFooter();
  }
})();
