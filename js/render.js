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
    var cats = ['all', 'general', 'geometry', 'pavement', 'bridge', 'drainage', 'safety'];
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
    si.addEventListener('input', function() {
      clearBtn.classList.toggle('visible', si.value.length > 0);
      doRender();
    });
    clearBtn.addEventListener('click', function() {
      si.value = ''; clearBtn.classList.remove('visible'); doRender(); si.focus();
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === '/' && document.activeElement !== si && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault(); si.focus(); si.select();
      }
    });
  }

  // ===== 规范详情页渲染 =====
  if (isSpec) {
    var code = getParam('code');
    if (!code) return;

    var spec = getSpecByCode(code);
    if (!spec) return;

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

    // 渲染详情
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
    if (spec.hasPdf) html += '<span style="font-size:11px;color:#16a34a;">📥 离线PDF可用</span>';
    html += '</div></div>';
    html += '<div class="spec-content">' + (spec.content || '<p>暂无详细内容</p>') + '</div>';

    document.getElementById('specDetail').innerHTML = html;

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
        // 更新统计
        document.getElementById('statsPills').innerHTML = renderStatsPills();
      });
    }

    // 回到顶部
    var backTop = document.createElement('button');
    backTop.className = 'back-top';
    backTop.id = 'backTop';
    backTop.textContent = '↑';
    backTop.title = '回到顶部';
    document.body.appendChild(backTop);
    window.addEventListener('scroll', function() {
      backTop.classList.toggle('visible', window.scrollY > 700);
    });
    backTop.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // 页脚
    var footer = document.createElement('footer');
    footer.className = 'footer';
    footer.innerHTML = renderFooter().replace(/<footer class="footer">|<\/footer>/g, '');
    document.querySelector('.main').after(footer);
  }

  // ===== 通用：回到顶部 =====
  if (!isSpec) {
    var bt = document.createElement('button');
    bt.className = 'back-top'; bt.id = 'backTop'; bt.textContent = '↑'; bt.title = '回到顶部';
    document.body.appendChild(bt);
    window.addEventListener('scroll', function() {
      bt.classList.toggle('visible', window.scrollY > 700);
    });
    bt.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // 页脚
    var ft = document.createElement('footer');
    ft.className = 'footer';
    ft.innerHTML = renderFooter().replace(/<footer class="footer">|<\/footer>/g, '');
    document.querySelector('.main').after(ft);
  }
})();
