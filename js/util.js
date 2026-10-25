/* Small helpers and lookups shared by every page. */
(function (F) {
  F.$ = (s) => document.querySelector(s);
  F.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  F.nl = (s) => F.esc(s).replace(/\n/g, '<br>');

  const pad = (n) => String(n).padStart(2, '0');
  const LOCALE = 'en-US'; // one date style for everyone, whatever their phone's region is
  const fmt = (s, o) => F.parse(s).toLocaleDateString(LOCALE, o);
  F.ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  F.parse = (s) => { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  F.addDays = (s, n) => { const d = F.parse(s); d.setDate(d.getDate() + n); return F.ymd(d); };
  F.weekday = (s) => fmt(s, { weekday: 'long' });                                    // Saturday
  F.weekdayShort = (s) => fmt(s, { weekday: 'short' });                              // Sat
  F.dayNum = (s) => F.parse(s).getDate();                                            // 19
  F.shortDate = (s) => fmt(s, { weekday: 'short', month: 'short', day: 'numeric' }); // Sat, Jun 19
  F.longDate = (s) => fmt(s, { weekday: 'long', month: 'long', day: 'numeric' });    // Saturday, June 19
  F.fullDate = (s) => fmt(s, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  F.daysBetween = (a, b) => Math.round((F.parse(b) - F.parse(a)) / 864e5);
  // "Today" on the island (Central time), not the viewer's timezone. Add ?today=2027-06-22 to the address to preview any day.
  F.today = () => {
    const o = /[?&]today=(\d{4}-\d\d-\d\d)/.exec(location.search);
    if (o) return o[1];
    try { return new Date().toLocaleDateString('en-CA', { timeZone: F.config.timezone }); } catch (e) { return F.ymd(new Date()); }
  };
  F.minutes = (t) => {
    const m = /(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i.exec(t || '');
    return m ? (+m[1] % 12 + (/pm/i.test(m[3]) ? 12 : 0)) * 60 + +(m[2] || 0) : null;
  };
  // Minutes since midnight on the island. With a ?today= preview the clock stays at the start of that day.
  F.nowMinutes = () => {
    if (/[?&]today=/.test(location.search)) return 0;
    try {
      const p = new Intl.DateTimeFormat('en-US', { timeZone: F.config.timezone, hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
      return +p.find((x) => x.type === 'hour').value * 60 + +p.find((x) => x.type === 'minute').value;
    } catch (e) { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); }
  };
  // The first event that has not started yet (an hour of grace), optionally limited by a test such as F.isMeal.
  F.nextEvent = (test) => {
    const today = F.today(), now = F.nowMinutes() - 60;
    return F.events.find((e) => (!test || test(e)) && (e.date > today || (e.date === today && (F.minutes(e.time) == null || F.minutes(e.time) >= now)))) || null;
  };
  F.siteName = F.config.title + ' ' + F.config.year;

  // The four sections of the site: [route, emoji, label, short label for the phone bar]. Emoji appear only here and in page titles.
  F.NAV = [
    ['home', '\u{1F3D6}\uFE0F', 'This Week', 'Week'], ['map', '\u{1F5FA}\uFE0F', 'Map', 'Map'], ['weather', '\u{1F324}\uFE0F', 'Weather', 'Weather'],
    ['houses', '\u{1F3E0}', 'Houses & Family', 'Houses']
  ];
  // Reachable pages that are not tabs (opened from the weekly table).
  F.EXTRA_PAGES = [['calendar', '\u{1F4C5}', 'Calendar']];
  F.nav = (route) => F.NAV.concat(F.EXTRA_PAGES).find((n) => n[0] === route);
  F.pageTitle = (route) => { const n = F.nav(route); return n ? n[1] + ' ' + F.esc(n[2]) : ''; };

  F.CATEGORIES = { plan: 'Plan', meal: 'Family Meal', excursion: 'Excursion', beach: 'Beach Activity', arrival: 'Arrival Day', departure: 'Departure Day' };
  F.PLACE_TYPES = { house: ['house', 'Family Houses'], restaurant: ['restaurant', 'Restaurants'], grocery: ['grocery', 'Groceries'], beach: ['beach', 'Beach Access'], activity: ['activity', 'Activities'], gathering: ['gathering', 'Meal Spots'] };
  F.MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'seafood boil', 'cookout', 'celebration', 'gathering'];
  F.monthShort = (s) => fmt(s, { month: 'short' });
  F.initials = (name) => { const w = String(name || '').split(/\s+/).filter((x) => /[A-Za-z]/.test(x)); return ((w[0] || '?')[0] + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase(); };

  // One small icon set (outline style) used instead of emoji. Decorative: always hidden from screen readers.
  const ICONS = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
    restaurant: '<path d="M6 3v7a2 2 0 0 0 4 0V3M8 3v18"/><path d="M17 3c-2.5 2-3 5-3 8h3v10"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 21c0-4 3-6.5 6.5-6.5s6.5 2.5 6.5 6.5"/><circle cx="17.5" cy="9" r="2.5"/><path d="M17.5 14.5c2.5 0 4.5 1.8 4.5 5"/>',
    heart: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    house: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    grocery: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.5 12H19l2-8H6"/>',
    beach: '<circle cx="12" cy="8" r="3.5"/><path d="M2 17q2.5-3 5 0t5 0 5 0 5 0M2 21q2.5-3 5 0t5 0 5 0 5 0"/>',
    activity: '<circle cx="12" cy="5" r="2"/><path d="M12 7v14M8 11h8M5 14c0 4 3 7 7 7s7-3 7-7"/>',
    gathering: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/>'
  };
  F.icon = (n) => '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[n] || '') + '</svg>';


  // Leaflet (the map library) is only downloaded when a page needs it.
  let leaflet;
  F.loadLeaflet = () => {
    if (window.L) return Promise.resolve();
    return leaflet || (leaflet = new Promise((ok, fail) => {
      const css = document.createElement('link'); css.rel = 'stylesheet';       css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; css.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='; css.crossOrigin = ''; document.head.append(css);
            const s = document.createElement('script'); s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; s.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='; s.crossOrigin = '';
      s.onload = ok; s.onerror = () => { leaflet = null; fail(new Error('offline')); }; document.head.append(s);
    }));
  };

  // Map pins need lat/lng. If a house or place has only an address, look it up once (OpenStreetMap Nominatim),
  // remember the answer on this device, and be polite: one lookup per 1.1 seconds.
  const hasLL = (p) => typeof p.lat === 'number' && typeof p.lng === 'number';
  F.hasCoords = hasLL;
  const geoCache = () => { try { return JSON.parse(localStorage.getItem('fox-geo') || '{}'); } catch (e) { return {}; } };
  F.geocode = (places, alive, found) => {
    const todo = places.filter((p) => !hasLL(p) && p.address);
    const next = () => {
      const p = todo.shift();
      if (!p || !alive()) return;
      const cache = geoCache();
      if (cache[p.address]) { found(p, cache[p.address]); return next(); }
      fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(p.address))
        .then((r) => r.json()).then((r) => {
          if (r && r[0]) {
            const ll = [+r[0].lat, +r[0].lon]; cache[p.address] = ll;
            try { localStorage.setItem('fox-geo', JSON.stringify(cache)); } catch (e) {}
            if (alive()) found(p, ll);
          }
        }).catch(() => {}).then(() => setTimeout(next, 1100));
    };
    next();
  };

  // Houses are map places too, so events can point at either.
  F.places = [].concat(F.houses.map((h) => Object.assign({}, h, { type: 'house' })), F.locations);
  const index = (list) => list.reduce((m, x) => ((m[x.id] = x), m), {});
  F.placeById = index(F.places);
  F.houseById = index(F.houses);
  F.familyById = index(F.families);
  F.place = (id) => F.placeById[id];
  F.family = (id) => F.familyById[id];
  F.house = (id) => F.houseById[id];
  F.mapsLink = (q) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
  F.isMeal = (e) => e.category === 'meal' || !!e.mealType;
  F.isDinner = (e) => F.isMeal(e) && e.mealType !== 'breakfast' && e.mealType !== 'lunch' && (F.minutes(e.time) == null || F.minutes(e.time) >= 15 * 60);

  // Build the day list and flat event list from data/schedule.json (the single source of truth for dates).
  const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const byTime = (a, b) => (F.minutes(a.time) == null ? 1e4 : F.minutes(a.time)) - (F.minutes(b.time) == null ? 1e4 : F.minutes(b.time));
  F.days = []; F.events = [];
  (F.schedule || []).forEach((d) => {
    const day = { date: d.date, title: d.title || '', dinner: d.dinner, events: [] };
    (d.events || []).forEach((src, i) => {
      const e = Object.assign({ status: 'confirmed' }, src, { date: d.date });
      e.id = e.id || d.date + '-' + (slug(e.title) || i);
      const host = e.host && F.family(e.host);
      if (!e.location && host && host.house) e.location = host.house;
      day.events.push(e); F.events.push(e);
    });
    day.events.sort(byTime);
    F.days.push(day);
  });
  F.trip = { start: F.days.length ? F.days[0].date : '', end: F.days.length ? F.days[F.days.length - 1].date : '', count: F.days.length };
  F.day = (date) => F.days.find((d) => d.date === date);
  F.dinnerOn = (date) => (F.day(date) ? F.day(date).events : []).find(F.isDinner);
})(window.FOX);
