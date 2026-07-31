(function () {
  const path = window.location.pathname;
  const isLogin = path.includes('login');

  const ICONS = {
    dashboard: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    chart: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
    training: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/></svg>',
    menu: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  };

  const pages = {
    '/': { title: '總覽', breadcrumb: '首頁' },
    '/index.html': { title: '總覽', breadcrumb: '首頁' },
    '/chart.html': { title: '排盤室', breadcrumb: '排盤室' },
    '/training.html': { title: 'AI 訓練', breadcrumb: 'AI 訓練' },
  };

  const current = pages[path] || { title: '天機', breadcrumb: '' };

  function closeSidebar() {
    document.getElementById('dash-sidebar')?.classList.remove('open');
    document.getElementById('dash-sidebar-backdrop')?.classList.remove('open');
    document.body.style.overflow = '';
  }

  function openSidebar() {
    document.getElementById('dash-sidebar')?.classList.add('open');
    document.getElementById('dash-sidebar-backdrop')?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  if (!isLogin) {
    document.write(`
<div class="dash-sidebar-backdrop" id="dash-sidebar-backdrop"></div>
<aside class="dash-sidebar" id="dash-sidebar">
  <div class="dash-brand">
    <div class="dash-brand-title">
      <span class="dash-brand-icon">機</span>
      天機
    </div>
    <div class="dash-brand-sub">命理 × 量化投資</div>
  </div>
  <nav class="dash-nav">
    <div class="dash-nav-label">導覽</div>
    <a href="/" class="dash-nav-link${path === '/' || path === '/index.html' ? ' active' : ''}">
      ${ICONS.dashboard} 總覽
    </a>
    <a href="/chart.html" class="dash-nav-link${path.includes('chart') ? ' active' : ''}">
      ${ICONS.chart} 排盤室
    </a>
    <a href="/training.html" class="dash-nav-link badge-new${path.includes('training') ? ' active' : ''}">
      ${ICONS.training} AI 訓練
    </a>
  </nav>
  <div class="dash-sidebar-footer">
    <button id="nav-auth-btn" class="dash-btn dash-btn-secondary" style="width:100%">登入</button>
  </div>
</aside>
<header class="dash-topbar">
  <div class="dash-topbar-left">
    <button class="dash-mobile-toggle" id="dash-mobile-toggle" aria-label="選單">${ICONS.menu}</button>
    <div class="dash-topbar-titles">
      <div class="dash-page-title">${current.title}</div>
      <div class="dash-breadcrumb">天機 / ${current.breadcrumb}</div>
    </div>
  </div>
  <div class="dash-topbar-right">
    <div class="dash-status-dot"></div>
    <span class="dash-status-text">運行中</span>
  </div>
</header>
`);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('dashboard-app');
    if (isLogin) document.body.classList.add('no-sidebar');

    const toggle = document.getElementById('dash-mobile-toggle');
    const backdrop = document.getElementById('dash-sidebar-backdrop');
    const sidebar = document.getElementById('dash-sidebar');

    if (toggle && sidebar) {
      toggle.addEventListener('click', () => {
        if (sidebar.classList.contains('open')) closeSidebar();
        else openSidebar();
      });
    }
    if (backdrop) backdrop.addEventListener('click', closeSidebar);

    document.querySelectorAll('.dash-nav-link').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 768) closeSidebar();
      });
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) closeSidebar();
      if (typeof window.resizeDashboardCharts === 'function') window.resizeDashboardCharts();
    });

    if (typeof fetchMe === 'function') {
      fetchMe().then(user => {
        const authBtn = document.getElementById('nav-auth-btn');
        if (!authBtn) return;
        if (user) {
          authBtn.textContent = `登出 · ${user.realName || user.username}`;
          authBtn.className = 'dash-btn dash-btn-ghost';
          authBtn.style.width = '100%';
          authBtn.onclick = logout;
        } else {
          authBtn.onclick = () => { window.location.href = '/login.html'; };
        }
      });
    }
  });
})();
