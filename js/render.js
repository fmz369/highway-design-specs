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
