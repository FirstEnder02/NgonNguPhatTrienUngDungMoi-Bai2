(async function () {
  const FOOTER_SRC = '/Kaboom/Footer.html';

  function makeDefaultFooter() {
    const f = document.createElement('footer');
    f.id = 'ragdoll-footer';
    f.className = 'footer-inner-wrapper';
    f.innerHTML = `
      <div class="footer-inner">
        <button id="whats-this-btn" type="button">a</button>
        <button id="reset-ragdoll-btn" type="button" style="display:none">Reset</button>
      </div>
    `;
    return f;
  }

  async function loadFooter() {
    try {
      const res = await fetch(FOOTER_SRC, { cache: 'no-cache' });
      if (!res.ok) {
        console.warn('Footer not found:', res.status, FOOTER_SRC);
        return;
      }
      const text = await res.text();
      console.log('Footer fetched, preview:', text.slice(0, 400));

      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');

      let footerEl = doc.querySelector('#ragdoll-footer') || doc.querySelector('footer');

      let willUseDefault = false;
      if (!footerEl) {
        console.warn('No <footer> found in fetched fragment; creating default footer.');
        footerEl = makeDefaultFooter();
        willUseDefault = true;
      } else {
        if (!footerEl.id) {
          console.warn('Fetched <footer> missing id="ragdoll-footer". Adding id for loader compatibility.');
          footerEl.id = 'ragdoll-footer';
        }
      }

      if (document.getElementById('ragdoll-footer')) {
        console.log('Footer already present in document; skipping injection.');
      } else {
        const nodeToAppend = willUseDefault ? footerEl : document.importNode(footerEl, true);
        document.body.appendChild(nodeToAppend);
        console.log('Footer injected from', FOOTER_SRC);
      }
      const inlineScripts = Array.from(doc.querySelectorAll('script')).filter(s => !s.src && s.textContent.trim());
      inlineScripts.forEach(s => {
        try {
          (0, eval)(s.textContent);
        } catch (e) {
          console.error('Footer inline script error', e);
        }
      });
    } catch (err) {
      console.error('Failed to load footer', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadFooter);
  } else {
    loadFooter();
  }
})();
