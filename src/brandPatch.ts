const LOGO = '/logo-posto.png';

function migrateStoredStationName() {
  try {
    const key = 'posto-gestao-state-v2';
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!data.stationName || data.stationName === 'Posto Gestão') {
      data.stationName = 'Posto dos Cerrados';
      data.city = data.city || 'Ribeiro Gonçalves - PI';
      localStorage.setItem(key, JSON.stringify(data));
    }
  } catch {
    // Mantém o sistema funcionando mesmo se houver dados locais inválidos.
  }
}

function iconSvg(path: string, viewBox = '0 0 24 24') {
  return `<svg viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

function dashboardTopbar() {
  const content = document.querySelector<HTMLElement>('.app-shell .content');
  if (!content || content.querySelector('.dashboard-topbar')) return;

  const topbar = document.createElement('div');
  topbar.className = 'dashboard-topbar';
  topbar.innerHTML = `
    <div class="dashboard-search">
      ${iconSvg('<circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path>')}
      <input type="search" placeholder="Buscar no sistema..." aria-label="Buscar no sistema" />
      <kbd>⌘ K</kbd>
    </div>
    <div class="dashboard-topbar-right">
      <div class="dashboard-date">
        ${iconSvg('<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4M8 3v4M3 10h18"></path>')}
        <span class="dashboard-date-text"></span>
      </div>
      <button class="dashboard-bell" type="button" aria-label="Notificações">
        ${iconSvg('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M10 21h4"></path>')}
        <span>3</span>
      </button>
      <div class="dashboard-user">
        <div class="dashboard-avatar">${iconSvg('<path d="M20 21a8 8 0 0 0-16 0"></path><circle cx="12" cy="7" r="4"></circle>')}</div>
        <div><strong>Admin</strong><small>Administrador</small></div>
        <span class="dashboard-chevron">⌄</span>
      </div>
    </div>
  `;

  content.prepend(topbar);

  const input = topbar.querySelector<HTMLInputElement>('.dashboard-search input');
  input?.addEventListener('input', () => {
    const value = input.value.trim().toLowerCase();
    document.querySelectorAll<HTMLButtonElement>('.sidebar .nav-item').forEach((item) => {
      if (item.classList.contains('logout')) return;
      item.classList.toggle('search-match', !!value && (item.textContent || '').toLowerCase().includes(value));
    });
  });

  input?.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      input.value = '';
      document.querySelectorAll('.sidebar .nav-item.search-match').forEach((item) => item.classList.remove('search-match'));
      input.blur();
    }
  });

  const updateDate = () => {
    const el = topbar.querySelector<HTMLElement>('.dashboard-date-text');
    if (!el) return;
    const now = new Date();
    const date = now.toLocaleDateString('pt-BR');
    const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    el.textContent = `${date}  •  ${time}`;
  };
  updateDate();
  window.setInterval(updateDate, 30000);
}

function addCardSparklines() {
  const cards = document.querySelectorAll<HTMLElement>('.stats-grid .stat-card');
  const paths = [
    'M2 25 L10 15 L18 28 L29 31 L40 11 L51 20 L62 5',
    'M2 27 L12 24 L22 29 L31 17 L40 26 L49 8 L60 32',
    'M3 26 L20 26 L34 26 L49 26 L62 26',
    'M2 29 C12 29 14 17 25 18 S40 34 49 24 S57 11 63 9',
  ];
  const tones = ['#13a366', '#1e66e8', '#f07b19', '#7257f4'];

  cards.forEach((card, index) => {
    if (card.querySelector('.stat-sparkline')) return;
    const spark = document.createElement('span');
    spark.className = 'stat-sparkline';
    const color = tones[index % tones.length];
    spark.innerHTML = `<svg viewBox="0 0 66 36" preserveAspectRatio="none"><path d="${paths[index % paths.length]}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    card.appendChild(spark);
  });
}

function applyBrand() {
  document.title = 'Posto dos Cerrados | Gestão';

  document.querySelectorAll('.brand-mark').forEach((el) => {
    if (el.querySelector('img')) return;
    el.innerHTML = '';
    const img = document.createElement('img');
    img.src = LOGO;
    img.alt = 'Posto dos Cerrados';
    img.className = 'brand-logo brand-logo-patch';
    el.appendChild(img);
  });

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let current: Node | null;
  while ((current = walker.nextNode())) nodes.push(current as Text);

  nodes.forEach((node) => {
    if (node.nodeValue?.includes('Posto Gestão')) {
      node.nodeValue = node.nodeValue.replaceAll('Posto Gestão', 'Posto dos Cerrados');
    }
  });

  dashboardTopbar();
  addCardSparklines();
}

migrateStoredStationName();

let applying = false;
const observer = new MutationObserver(() => {
  if (applying) return;
  applying = true;
  requestAnimationFrame(() => {
    applyBrand();
    applying = false;
  });
});

window.addEventListener('DOMContentLoaded', () => {
  applyBrand();
  observer.observe(document.body, { childList: true, subtree: true });
});

setTimeout(applyBrand, 0);
