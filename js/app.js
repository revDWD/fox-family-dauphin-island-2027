/* Shell: navigation, theme and text size, and the hash router. */
(function (F) {
  const { $, esc } = F;
  const ALIASES = { family: 'houses', gallery: 'home', photos: 'home', memories: 'home', updates: 'home', more: 'home', meals: 'home' };
  const TITLES = { check: 'Data Check' };

  const parts = () => (location.hash || '#/').replace(/^#\/?/, '').split('/');
  const routeOf = () => { const n = parts()[0] || 'home'; return ALIASES[n] || n; };

  function renderNav() {
    const cur = routeOf();
    $('#tabs').innerHTML = F.NAV.map((n) => '<a href="' + (n[0] === 'home' ? '#/' : '#/' + n[0]) + '" aria-label="' + esc(n[2]) + '"' + (cur === n[0] ? ' aria-current="page"' : '') + '><span class="ni" aria-hidden="true">' + n[1] + '</span><span class="ns" aria-hidden="true">' + esc(n[3]) + '</span><span class="nf" aria-hidden="true">' + esc(n[2]) + '</span></a>').join('');
  }

  let first = true;
  function route() {
    F.maps.splice(0).forEach((m) => m.remove());
    const p = parts(), name = F.pages[ALIASES[p[0]] || p[0]] ? (ALIASES[p[0]] || p[0]) : 'home';
    const arg = p[1];
    document.body.dataset.route = name;
    F.pages[name]($('#app'), arg);
    const label = F.nav(name) ? F.nav(name)[2] : TITLES[name];
    document.title = (name === 'home' ? '' : label + ' \u00b7 ') + F.siteName;
    renderNav();
    if (!arg) window.scrollTo(0, 0);
    if (!first) $('#app').focus({ preventScroll: true });
    first = false;
  }

  // Bigger text for anyone who wants it; remembered on this device.
  const big = () => document.documentElement.classList.contains('big');
  const setBig = (on) => {
    document.documentElement.classList.toggle('big', on);
    const b = $('#textsize'); b.setAttribute('aria-pressed', on); b.textContent = on ? 'A\u2212' : 'A+'; b.setAttribute('aria-label', on ? 'Make text smaller' : 'Make text bigger');
    try { localStorage.setItem('fox-big', on ? '1' : ''); } catch (e) {}
  };
  try { if (localStorage.getItem('fox-big')) setBig(true); } catch (e) {}
  $('#textsize').onclick = () => setBig(!big());

  // Theme: Auto follows the phone, Light and Dark are chosen by hand; remembered on this device.
  const THEMES = ['auto', 'light', 'dark'], THEME_LABEL = { auto: 'Auto', light: 'Light', dark: 'Dark' };
  const themeMeta = document.querySelector('meta[name=theme-color]');
  const prefersDark = () => window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
  const setTheme = (t) => {
    const dark = t === 'dark' || (t === 'auto' && prefersDark());
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    const b = $('#themebtn'); b.textContent = THEME_LABEL[t];
    b.setAttribute('aria-label', 'Color theme: ' + (t === 'auto' ? 'automatic' : t) + '. Tap to change.');
    if (themeMeta) themeMeta.content = dark ? '#06202d' : '#0b5d8a';
    try { localStorage.setItem('fox-theme', t === 'auto' ? '' : t); } catch (e) {}
  };
  let theme = 'auto';
  try { const s = localStorage.getItem('fox-theme'); if (s === 'light' || s === 'dark') theme = s; } catch (e) {}
  setTheme(theme);
  $('#themebtn').onclick = () => { theme = THEMES[(THEMES.indexOf(theme) + 1) % 3]; setTheme(theme); };
  if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => theme === 'auto' && setTheme('auto'));

  $('#brand-name').textContent = F.siteName;
  $('#foot-name').textContent = F.siteName;
  if (F.config.lastUpdated) $('#stamp').textContent = ' \u00b7 Last updated ' + F.shortDate(F.config.lastUpdated);

  window.addEventListener('hashchange', route);
  route();

  // Lets the site open without signal after the first visit (works on https / GitHub Pages only).
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) navigator.serviceWorker.register('sw.js').catch(() => {});
})(window.FOX);
