(async function loadHeader() {
  try {
    const resp = await fetch('../Kaboom/header.html', { cache: 'no-cache' });
    if (!resp.ok) throw new Error('Header fetch failed: ' + resp.status);
    const html = await resp.text();
    const container = document.getElementById('site-header');
    if (!container) return;
    container.innerHTML = html;
    const path = window.location.pathname.split('/').pop() || 'index.html';
    const name = path.split('.').shift().toLowerCase();
    const navLinks = container.querySelectorAll('.nav a[data-nav]');
    navLinks.forEach(a => {
      a.classList.toggle('active', a.dataset.nav === name);
    });
    window.SiteHeader = {
      setActive: (navName) => {
        navLinks.forEach(a => a.classList.toggle('active', a.dataset.nav === navName));
      }
    };
  } catch (err) {
    console.error('Failed to load header', err);
  }
})();
