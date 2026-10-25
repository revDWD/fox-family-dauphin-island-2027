/* Pages: calendar, map and meals. Home is in home.js, houses in houses.js, weather in weather.js.
   Each page is one function that fills the <main> element. Shared bits live on F.ui. */
(function (F) {
  const { esc, $ } = F;
  const P = (F.pages = F.pages || {});
  F.maps = [];
  const cfg = F.config;
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  const chip = (attr, val, on, label) => '<button type="button" class="chip" aria-pressed="' + on + '" ' + attr + '="' + esc(val) + '">' + label + '</button>';
  const SINGLE = { house: 'Family house', restaurant: 'Restaurant', grocery: 'Grocery store', beach: 'Beach access', activity: 'Activity', gathering: 'Meal spot' };

  const tileLayer = () => L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '\u00a9 OpenStreetMap contributors' });
  const pin = (type, big) => L.divIcon({ className: '', html: '<div class="pin ' + (big ? 'house' : '') + ' t-' + type + '">' + F.icon(F.PLACE_TYPES[type][0]) + '</div>', iconSize: big ? [46, 46] : [34, 34], iconAnchor: big ? [23, 23] : [17, 17] });
  F.ui = { plural: plural, chip: chip, tileLayer: tileLayer, pin: pin };

  const popup = (l) => {
    const evs = F.events.filter((e) => e.location === l.id);
    return '<div class="pop"><p class="pop-type">' + esc(SINGLE[l.type]) + '</p><h3>' + esc(l.name) + '</h3>' + (l.address ? '<p>' + esc(l.address) + '</p>' : '') + (l.description ? '<p>' + esc(l.description) + '</p>' : '') +
      (evs.length ? '<p class="pop-h">Related events</p><ul>' + evs.map((e) => '<li><b>' + esc(F.shortDate(e.date)) + '</b>' + (e.time ? ', ' + esc(e.time) : '') + ' \u2013 ' + esc(e.title) + (e.status === 'tentative' ? ' (tentative)' : '') + '</li>').join('') + '</ul>' : '') +
      '<div class="row"><a class="btn small primary" href="' + F.mapsLink(l.address || l.name) + '" target="_blank" rel="noopener">Get directions</a>' + (l.url ? '<a class="btn small" href="' + esc(l.url) + '" target="_blank" rel="noopener">Website</a>' : '') + '</div></div>';
  };

  let calFilter = 'all';
  P.calendar = (app, focus) => {
    // #/calendar/filter:meal opens with a filter applied, so a filtered view can be shared as a link.
    if (/^filter:/.test(focus || '')) { calFilter = focus.slice(7); focus = null; }
    const f = {
      all: () => true, confirmed: (e) => e.status === 'confirmed', tentative: (e) => e.status === 'tentative',
      meal: F.isMeal, excursion: (e) => e.category === 'excursion', beach: (e) => e.category === 'beach',
      arrival: (e) => e.category === 'arrival', departure: (e) => e.category === 'departure'
    };
    const labels = { all: 'All', confirmed: 'Confirmed', tentative: 'Tentative', meal: 'Family Meals', excursion: 'Excursions', beach: 'Beach', arrival: 'Arrival Day', departure: 'Departure Day' };
    if (!f[calFilter]) calFilter = 'all';
    const today = F.today();
    const days = F.days.filter((d) => calFilter === 'all' || d.events.some(f[calFilter]));
    app.innerHTML = '<h1>' + F.pageTitle('calendar') + '</h1><p class="sub">Every plan, day by day. Tentative plans have a dashed edge and a Tentative label.</p>' +
      '<div class="chips" role="group" aria-label="Jump to a day">' + F.days.map((d) => '<button type="button" class="chip day-chip' + (d.date === today ? ' now' : '') + '" data-go="' + d.date + '" aria-label="Go to ' + esc(F.longDate(d.date)) + '">' + esc(F.weekdayShort(d.date)) + ' ' + F.dayNum(d.date) + '</button>').join('') + '</div>' +
      '<div class="chips" role="group" aria-label="Filter events">' + Object.keys(labels).map((k) => chip('data-f', k, calFilter === k, labels[k])).join('') + '</div>' +
      (days.map((d) => {
        const evs = d.events.filter(f[calFilter]);
        return '<h2 class="day' + (d.date === today ? ' today' : '') + '" id="d-' + d.date + '">' + esc(F.longDate(d.date)) + (d.title ? '<span class="wk-title">' + esc(d.title) + '</span>' : '') + (d.date === today ? '<span class="tag today">Today</span>' : '') + '</h2>' +
          (evs.length ? evs.map((e) => F.eventCard(e)).join('') : '<p class="empty">Nothing planned yet.</p>');
      }).join('') || '<p class="empty">No events in this view yet.</p>');
    app.querySelectorAll('[data-f]').forEach((b) => { b.onclick = () => { location.hash = b.dataset.f === 'all' ? '#/calendar' : '#/calendar/filter:' + b.dataset.f; }; });
    const goto = (d) => { const el = d && document.getElementById('d-' + d); if (el) el.scrollIntoView({ block: 'start' }); return !!el; };
    app.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => { if (!goto(b.dataset.go)) { calFilter = 'all'; P.calendar(app, b.dataset.go); } }; });
    if (focus) goto(focus);
  };

  let mapFilter = 'all';
  P.map = (app, focus) => {
    // #/map/type:beach opens with a filter applied, so a filtered view can be shared as a link.
    if (/^type:/.test(focus || '')) { mapFilter = focus.slice(5); focus = null; }
    if (mapFilter !== 'all' && !F.PLACE_TYPES[mapFilter]) mapFilter = 'all';
    const shown = F.places.filter((l) => mapFilter === 'all' || l.type === mapFilter);
    const types = Object.keys(F.PLACE_TYPES).filter((k) => shown.some((l) => l.type === k));
    const item = (l) => { const n = F.events.filter((e) => e.location === l.id).length; return '<li class="' + (l.type === 'house' ? 'is-house' : '') + '"><a href="#/map/' + esc(l.id) + '"><span class="pi t-' + l.type + '">' + F.icon(F.PLACE_TYPES[l.type][0]) + '</span><span><b>' + esc(l.name) + '</b><br><small>' + esc(l.address || 'Address coming soon') + (n ? ' \u00b7 ' + plural(n, 'event') : '') + '</small></span></a></li>'; };
    app.innerHTML = '<h1>' + F.pageTitle('map') + '</h1><p class="sub">Tap a pin for the address, details and events. Coral pins are our houses.</p>' +
      '<div class="chips" role="group" aria-label="Filter places">' + chip('data-f', 'all', mapFilter === 'all', 'All') +
      Object.keys(F.PLACE_TYPES).map((k) => chip('data-f', k, mapFilter === k, F.icon(F.PLACE_TYPES[k][0]) + F.PLACE_TYPES[k][1])).join('') + '</div>' +
      '<div id="map" role="application" aria-label="Interactive map of Dauphin Island"></div>' +
      '<h2>All places</h2>' + types.map((k) => '<h3 class="grp">' + esc(F.PLACE_TYPES[k][1]) + '</h3><ul class="placelist">' + shown.filter((l) => l.type === k).map(item).join('') + '</ul>').join('');
    app.querySelectorAll('[data-f]').forEach((b) => { b.onclick = () => { location.hash = b.dataset.f === 'all' ? '#/map' : '#/map/type:' + b.dataset.f; }; });
    F.loadLeaflet().then(() => {
      if (!$('#map')) return;
      const map = L.map('map', { scrollWheelZoom: false }).setView([cfg.map.lat, cfg.map.lng], cfg.map.zoom);
      F.maps.push(map); tileLayer().addTo(map);
      const pts = []; let focusMarker;
      const add = (l, ll) => {
        const isH = l.type === 'house';
        const m = L.marker(ll, { zIndexOffset: isH ? 1000 : 0, title: l.name, icon: pin(l.type, isH) }).addTo(map);
        m.bindPopup(popup(l), { minWidth: 220 });
        if (isH) m.bindTooltip(l.name, { permanent: true, direction: 'bottom', offset: [0, 22], className: 'pin-label' });
        pts.push(ll);
        if (focus && l.id === focus) focusMarker = m;
      };
      const fit = () => { if (focusMarker) { map.setView(focusMarker.getLatLng(), 15); focusMarker.openPopup(); } else if (pts.length) map.fitBounds(pts, { padding: [30, 30] }); };
      shown.filter(F.hasCoords).forEach((l) => add(l, [l.lat, l.lng]));
      fit();
      if (focusMarker) $('#map').scrollIntoView({ block: 'start' });
      // Places that only have an address (no lat/lng yet) are looked up and added as they are found.
      F.geocode(shown, () => F.maps.indexOf(map) >= 0, (l, ll) => { add(l, ll); fit(); });
    }, () => { const el = $('#map'); if (el) el.outerHTML = '<p class="note">The map needs an internet connection. The list below still works, and each house has a Directions button.</p>'; });
  };

})(window.FOX);
