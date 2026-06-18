/* ============================================================
   暗色模式切换模块
   ============================================================ */
(function() {
  var KEY = 'spec_theme';
  var saved = localStorage.getItem(KEY);
  if (saved === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  // 创建切换按钮
  var btn = document.createElement('button');
  btn.className = 'theme-toggle';
  btn.title = '切换暗色/亮色模式';
  var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  btn.textContent = isDark ? '☀' : '🌙';
  document.body.appendChild(btn);

  btn.addEventListener('click', function() {
    var current = document.documentElement.getAttribute('data-theme');
    if (current === 'dark') {
      document.documentElement.removeAttribute('data-theme');
      btn.textContent = '🌙';
      localStorage.setItem(KEY, 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      btn.textContent = '☀';
      localStorage.setItem(KEY, 'dark');
    }
  });
})();
