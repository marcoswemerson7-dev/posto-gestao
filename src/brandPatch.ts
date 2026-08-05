const LOGO = '/logo-posto.webp';

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
}

migrateStoredStationName();

const observer = new MutationObserver(() => applyBrand());
window.addEventListener('DOMContentLoaded', () => {
  applyBrand();
  observer.observe(document.body, { childList: true, subtree: true });
});

setTimeout(applyBrand, 0);
